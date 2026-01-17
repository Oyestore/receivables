import { Pool } from 'pg';
import { databaseService } from '../../../common/database/database.service';
import { Logger } from '../../../common/logging/logger';
import { metricsService } from '../../../common/monitoring/metrics.service';
import { notificationService } from '../../../common/notifications/notification.service';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
} from '../../../common/errors/app-error';
import {
  ICreditProfile,
  ICreditScore,
  ICreditScoreRequest,
  IRiskAlert,
  CreditRiskLevel,
} from '../types/credit.types';

const logger = new Logger('CreditService');

/**
 * Credit Scoring Service
 * Handles credit assessment, risk analysis, and ML-based scoring
 */
export class CreditService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Calculate credit score for a customer
   */
  async calculateCreditScore(
    tenantId: string,
    customerId: string,
    userId: string
  ): Promise<ICreditScore> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get customer details
      const customerResult = await client.query(
        'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
        [customerId, tenantId]
      );

      if (customerResult.rows.length === 0) {
        throw new NotFoundError('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get credit profile or create if doesn't exist
      let profile = await this.getCreditProfile(client, customerId);
      if (!profile) {
        profile = await this.createCreditProfile(client, tenantId, customerId);
      }

      // Gather data for scoring
      const scoringData = await this.gatherScoringData(client, tenantId, customerId);

      // Calculate score using ML model
      const scoreResult = await this.runCreditScoringModel(scoringData);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(scoreResult.score);

      // Save credit score
      const scoreQuery = `
        INSERT INTO credit_scores (
          tenant_id, customer_id, profile_id, model_version,
          score, risk_level, confidence_score,
          factors, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const scoreInsertResult = await client.query(scoreQuery, [
        tenantId,
        customerId,
        profile.id,
        scoreResult.model_version,
        scoreResult.score,
        riskLevel,
        scoreResult.confidence,
        JSON.stringify(scoreResult.factors),
        userId,
      ]);

      const creditScore = scoreInsertResult.rows[0];

      // Update credit profile
      await client.query(
        `UPDATE credit_profiles 
         SET current_score = $1, risk_level = $2, last_assessed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [scoreResult.score, riskLevel, profile.id]
      );

      // Check for risk alerts
      await this.checkAndCreateRiskAlerts(client, tenantId, customerId, scoreResult, riskLevel);

      await client.query('COMMIT');

      // Record metrics
      metricsService.recordCreditScoreCalculation(tenantId);

      logger.info('Credit score calculated', {
        customerId,
        score: scoreResult.score,
        riskLevel,
        tenantId,
      });

      return creditScore;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to calculate credit score', { error, customerId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get credit profile for customer
   */
  async getCreditProfileByCustomer(tenantId: string, customerId: string): Promise<ICreditProfile> {
    try {
      const query = `
        SELECT cp.*, c.company_name, c.email
        FROM credit_profiles cp
        JOIN customers c ON cp.customer_id = c.id
        WHERE cp.customer_id = $1 AND cp.tenant_id = $2
      `;

      const result = await this.pool.query(query, [customerId, tenantId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Credit profile not found');
      }

      const profile = result.rows[0];

      // Get recent scores
      const scoresResult = await this.pool.query(
        `SELECT * FROM credit_scores 
         WHERE customer_id = $1 AND tenant_id = $2 
         ORDER BY created_at DESC LIMIT 10`,
        [customerId, tenantId]
      );

      profile.score_history = scoresResult.rows;

      return profile;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get credit profile', { error, customerId, tenantId });
      throw new DatabaseError('Failed to retrieve credit profile');
    }
  }

  /**
   * Get active risk alerts
   */
  async getActiveRiskAlerts(tenantId: string): Promise<IRiskAlert[]> {
    try {
      const query = `
        SELECT ra.*, c.company_name as customer_name, c.email as customer_email
        FROM risk_alerts ra
        JOIN customers c ON ra.customer_id = c.id
        WHERE ra.tenant_id = $1 AND ra.status = 'active'
        ORDER BY ra.severity DESC, ra.created_at DESC
      `;

      const result = await this.pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get risk alerts', { error, tenantId });
      throw new DatabaseError('Failed to retrieve risk alerts');
    }
  }

  /**
   * Acknowledge risk alert
   */
  async acknowledgeRiskAlert(
    tenantId: string,
    alertId: string,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE risk_alerts 
         SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP, notes = $2
         WHERE id = $3 AND tenant_id = $4`,
        [userId, notes, alertId, tenantId]
      );

      logger.info('Risk alert acknowledged', { alertId, userId, tenantId });
    } catch (error) {
      logger.error('Failed to acknowledge risk alert', { error, alertId, tenantId });
      throw new DatabaseError('Failed to acknowledge risk alert');
    }
  }

  /**
   * Get credit profile (internal)
   */
  private async getCreditProfile(client: any, customerId: string): Promise<ICreditProfile | null> {
    const result = await client.query(
      'SELECT * FROM credit_profiles WHERE customer_id = $1',
      [customerId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create credit profile
   */
  private async createCreditProfile(
    client: any,
    tenantId: string,
    customerId: string
  ): Promise<ICreditProfile> {
    const result = await client.query(
      `INSERT INTO credit_profiles (tenant_id, customer_id, current_score, risk_level)
       VALUES ($1, $2, 0, 'unknown')
       RETURNING *`,
      [tenantId, customerId]
    );

    return result.rows[0];
  }

  /**
   * Gather data for credit scoring
   */
  private async gatherScoringData(
    client: any,
    tenantId: string,
    customerId: string
  ): Promise<any> {
    // Payment history
    const paymentHistory = await client.query(
      `SELECT 
         COUNT(*) as total_payments,
         COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_payment_time_days
       FROM payments
       WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    // Invoice history
    const invoiceHistory = await client.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
         COUNT(*) FILTER (WHERE status = 'overdue') as overdue_invoices,
         AVG(total_amount) as avg_invoice_amount,
         SUM(total_amount) as total_billed,
         AVG(EXTRACT(EPOCH FROM (due_date - issue_date))/86400) as avg_payment_terms
       FROM invoices
       WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    // Customer details
    const customer = await client.query(
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    return {
      payment_history: paymentHistory.rows[0],
      invoice_history: invoiceHistory.rows[0],
      customer: customer.rows[0],
      timestamp: new Date(),
    };
  }

  /**
   * Run credit scoring ML model
   * 
   * This is a placeholder for DeepSeek R1 or other ML model integration
   * In production, this would call the actual ML model API
   */
  private async runCreditScoringModel(data: any): Promise<{
    score: number;
    confidence: number;
    factors: any;
    model_version: string;
  }> {
    // Calculate basic score based on payment and invoice history
    const paymentSuccessRate =
      data.payment_history.total_payments > 0
        ? data.payment_history.successful_payments / data.payment_history.total_payments
        : 0;

    const invoicePaymentRate =
      data.invoice_history.total_invoices > 0
        ? data.invoice_history.paid_invoices / data.invoice_history.total_invoices
        : 0;

    const overdueRate =
      data.invoice_history.total_invoices > 0
        ? data.invoice_history.overdue_invoices / data.invoice_history.total_invoices
        : 0;

    // Simple scoring algorithm (replace with ML model)
    let score = 500; // Base score

    // Payment success factor (0-200 points)
    score += paymentSuccessRate * 200;

    // Invoice payment factor (0-200 points)
    score += invoicePaymentRate * 200;

    // Overdue penalty (0-100 points deduction)
    score -= overdueRate * 100;

    // Credit limit utilization
    if (data.customer.credit_limit > 0) {
      const utilization = data.invoice_history.total_billed / data.customer.credit_limit;
      if (utilization < 0.3) score += 50;
      else if (utilization > 0.9) score -= 50;
    }

    // Normalize score to 300-850 range
    score = Math.max(300, Math.min(850, score));

    const factors = {
      payment_success_rate: paymentSuccessRate,
      invoice_payment_rate: invoicePaymentRate,
      overdue_rate: overdueRate,
      total_invoices: data.invoice_history.total_invoices,
      total_payments: data.payment_history.total_payments,
      avg_payment_time: data.payment_history.avg_payment_time_days,
    };

    return {
      score: Math.round(score),
      confidence: 0.85, // Placeholder confidence
      factors,
      model_version: 'v1.0-basic',
    };

    // TODO: Integrate with DeepSeek R1 or other ML model
    // const response = await fetch('http://deepseek-api/score', {
    //   method: 'POST',
    //   body: JSON.stringify(data),
    // });
    // return await response.json();
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): CreditRiskLevel {
    if (score >= 750) return 'low';
    if (score >= 650) return 'medium';
    if (score >= 550) return 'high';
    return 'critical';
  }

  /**
   * Check and create risk alerts
   */
  private async checkAndCreateRiskAlerts(
    client: any,
    tenantId: string,
    customerId: string,
    scoreResult: any,
    riskLevel: CreditRiskLevel
  ): Promise<void> {
    const alerts: Array<{ type: string; severity: string; message: string }> = [];

    // High risk score
    if (riskLevel === 'critical' || riskLevel === 'high') {
      alerts.push({
        type: 'high_risk_score',
        severity: riskLevel === 'critical' ? 'critical' : 'high',
        message: `Customer credit score is ${scoreResult.score}, indicating ${riskLevel} risk`,
      });
    }

    // High overdue rate
    if (scoreResult.factors.overdue_rate > 0.3) {
      alerts.push({
        type: 'high_overdue_rate',
        severity: 'high',
        message: `Customer has ${(scoreResult.factors.overdue_rate * 100).toFixed(1)}% overdue invoices`,
      });
    }

    // Low payment success rate
    if (scoreResult.factors.payment_success_rate < 0.7) {
      alerts.push({
        type: 'low_payment_success',
        severity: 'medium',
        message: `Customer payment success rate is ${(scoreResult.factors.payment_success_rate * 100).toFixed(1)}%`,
      });
    }

    // Create alert records
    for (const alert of alerts) {
      await client.query(
        `INSERT INTO risk_alerts (tenant_id, customer_id, alert_type, severity, message, status)
         VALUES ($1, $2, $3, $4, $5, 'active')`,
        [tenantId, customerId, alert.type, alert.severity, alert.message]
      );

      // Send notification for critical alerts
      if (alert.severity === 'critical') {
        await notificationService.sendRiskAlert(tenantId, customerId, alert.message);
      }
    }
  }
}

export const creditService = new CreditService();
