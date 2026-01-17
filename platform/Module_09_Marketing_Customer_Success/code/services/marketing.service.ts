import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { notificationService } from '../../../Module_11_Common/code/notifications/notification.service';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
} from '../../../Module_11_Common/code/errors/app-error';
import {
  ICampaign,
  ICustomerSegment,
  ILeadScore,
  ICommunication,
  CampaignStatus,
  CommunicationType,
} from '../types/marketing.types';

const logger = new Logger('MarketingService');

/**
 * Marketing & Customer Engagement Service
 * Manages campaigns, customer segmentation, lead scoring, and communications
 */
export class MarketingService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create marketing campaign
   */
  async createCampaign(
    tenantId: string,
    campaignData: {
      name: string;
      description?: string;
      campaign_type: string;
      target_segment_id?: string;
      start_date: Date;
      end_date?: Date;
      budget?: number;
      message_template: string;
    },
    createdBy: string
  ): Promise<ICampaign> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create campaign
      const campaignQuery = `
        INSERT INTO campaigns (
          tenant_id, name, description, campaign_type, target_segment_id,
          start_date, end_date, budget, message_template, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
        RETURNING *
      `;

      const result = await client.query(campaignQuery, [
        tenantId,
        campaignData.name,
        campaignData.description,
        campaignData.campaign_type,
        campaignData.target_segment_id,
        campaignData.start_date,
        campaignData.end_date,
        campaignData.budget,
        campaignData.message_template,
        createdBy,
      ]);

      const campaign = result.rows[0];

      await client.query('COMMIT');

      logger.info('Campaign created', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        tenantId,
      });

      return campaign;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create campaign', { error, tenantId });
      throw new DatabaseError('Failed to create campaign');
    } finally {
      client.release();
    }
  }

  /**
   * Launch campaign
   */
  async launchCampaign(
    tenantId: string,
    campaignId: string,
    launchedBy: string
  ): Promise<ICampaign> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get campaign
      const campaignResult = await client.query(
        'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
        [campaignId, tenantId]
      );

      if (campaignResult.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }

      const campaign = campaignResult.rows[0];

      if (campaign.status !== 'draft') {
        throw new ValidationError('Only draft campaigns can be launched');
      }

      // Get target audience
      let targetCustomers = [];
      if (campaign.target_segment_id) {
        const segmentResult = await client.query(
          'SELECT customer_ids FROM customer_segments WHERE id = $1 AND tenant_id = $2',
          [campaign.target_segment_id, tenantId]
        );

        if (segmentResult.rows.length > 0) {
          targetCustomers = segmentResult.rows[0].customer_ids;
        }
      } else {
        // Get all active customers
        const customersResult = await client.query(
          'SELECT id FROM customers WHERE tenant_id = $1 AND status = $2',
          [tenantId, 'active']
        );
        targetCustomers = customersResult.rows.map(c => c.id);
      }

      // Send campaign messages
      for (const customerId of targetCustomers) {
        await this.sendCampaignMessage(
          client,
          tenantId,
          campaignId,
          customerId,
          campaign.message_template
        );
      }

      // Update campaign status
      await client.query(
        `UPDATE campaigns 
         SET status = 'active', launched_at = CURRENT_TIMESTAMP, launched_by = $1
         WHERE id = $2`,
        [launchedBy, campaignId]
      );

      await client.query('COMMIT');

      logger.info('Campaign launched', {
        campaignId,
        targetCount: targetCustomers.length,
        tenantId,
      });

      campaign.status = 'active';
      return campaign;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to launch campaign', { error, campaignId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create customer segment
   */
  async createCustomerSegment(
    tenantId: string,
    segmentData: {
      name: string;
      description?: string;
      criteria: any;
    },
    createdBy: string
  ): Promise<ICustomerSegment> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Apply criteria to find matching customers
      const customerIds = await this.applySegmentCriteria(
        client,
        tenantId,
        segmentData.criteria
      );

      // Create segment
      const segmentQuery = `
        INSERT INTO customer_segments (
          tenant_id, name, description, criteria, customer_ids, 
          customer_count, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(segmentQuery, [
        tenantId,
        segmentData.name,
        segmentData.description,
        JSON.stringify(segmentData.criteria),
        customerIds,
        customerIds.length,
        createdBy,
      ]);

      const segment = result.rows[0];

      await client.query('COMMIT');

      logger.info('Customer segment created', {
        segmentId: segment.id,
        customerCount: customerIds.length,
        tenantId,
      });

      return segment;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create customer segment', { error, tenantId });
      throw new DatabaseError('Failed to create customer segment');
    } finally {
      client.release();
    }
  }

  /**
   * Calculate lead score
   */
  async calculateLeadScore(
    tenantId: string,
    customerId: string
  ): Promise<ILeadScore> {
    try {
      // Get customer data
      const customerResult = await this.pool.query(
        'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
        [customerId, tenantId]
      );

      if (customerResult.rows.length === 0) {
        throw new NotFoundError('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get customer activity
      const invoiceResult = await this.pool.query(
        `SELECT COUNT(*) as invoice_count, SUM(total_amount) as total_revenue
         FROM invoices WHERE customer_id = $1 AND tenant_id = $2`,
        [customerId, tenantId]
      );

      const paymentResult = await this.pool.query(
        `SELECT AVG(EXTRACT(DAY FROM (paid_at - created_at))) as avg_payment_days
         FROM payments WHERE customer_id = $1 AND tenant_id = $2 AND status = 'completed'`,
        [customerId, tenantId]
      );

      // Calculate score (0-100)
      let score = 0;
      const factors: any = {};

      // Revenue factor (max 40 points)
      const totalRevenue = parseFloat(invoiceResult.rows[0]?.total_revenue || 0);
      factors.revenue = Math.min(40, (totalRevenue / 100000) * 40);
      score += factors.revenue;

      // Frequency factor (max 30 points)
      const invoiceCount = parseInt(invoiceResult.rows[0]?.invoice_count || 0);
      factors.frequency = Math.min(30, invoiceCount * 3);
      score += factors.frequency;

      // Payment behavior factor (max 30 points)
      const avgPaymentDays = parseFloat(paymentResult.rows[0]?.avg_payment_days || 30);
      factors.payment_behavior = Math.max(0, 30 - avgPaymentDays);
      score += factors.payment_behavior;

      // Determine tier
      let tier: string;
      if (score >= 80) tier = 'hot';
      else if (score >= 60) tier = 'warm';
      else if (score >= 40) tier = 'cold';
      else tier = 'inactive';

      // Save lead score
      const scoreQuery = `
        INSERT INTO lead_scores (
          tenant_id, customer_id, score, tier, scoring_factors
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, customer_id) 
        DO UPDATE SET score = $3, tier = $4, scoring_factors = $5, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await this.pool.query(scoreQuery, [
        tenantId,
        customerId,
        Math.round(score),
        tier,
        JSON.stringify(factors),
      ]);

      logger.info('Lead score calculated', {
        customerId,
        score: Math.round(score),
        tier,
        tenantId,
      });

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to calculate lead score', { error, customerId, tenantId });
      throw new DatabaseError('Failed to calculate lead score');
    }
  }

  /**
   * Send communication
   */
  async sendCommunication(
    tenantId: string,
    communicationData: {
      customer_id: string;
      communication_type: CommunicationType;
      subject?: string;
      message: string;
      channel: string;
    },
    sentBy: string
  ): Promise<ICommunication> {
    try {
      // Create communication record
      const commQuery = `
        INSERT INTO communications (
          tenant_id, customer_id, communication_type, subject, message,
          channel, status, sent_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
        RETURNING *
      `;

      const result = await this.pool.query(commQuery, [
        tenantId,
        communicationData.customer_id,
        communicationData.communication_type,
        communicationData.subject,
        communicationData.message,
        communicationData.channel,
        sentBy,
      ]);

      const communication = result.rows[0];

      // Send via appropriate channel
      if (communicationData.channel === 'email') {
        await notificationService.sendEmail({
          to: '', // Get from customer record
          subject: communicationData.subject || 'Message from platform',
          text: communicationData.message,
        });
      }

      logger.info('Communication sent', {
        communicationId: communication.id,
        customerId: communicationData.customer_id,
        channel: communicationData.channel,
        tenantId,
      });

      return communication;
    } catch (error) {
      logger.error('Failed to send communication', { error, tenantId });
      throw new DatabaseError('Failed to send communication');
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    tenantId: string,
    campaignId: string
  ): Promise<any> {
    try {
      // Get campaign
      const campaignResult = await this.pool.query(
        'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
        [campaignId, tenantId]
      );

      if (campaignResult.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }

      // Get communications sent
      const commResult = await this.pool.query(
        `SELECT COUNT(*) as sent_count,
                COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_count,
                COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_count
         FROM communications 
         WHERE campaign_id = $1 AND tenant_id = $2`,
        [campaignId, tenantId]
      );

      const stats = commResult.rows[0];

      return {
        campaign_id: campaignId,
        sent_count: parseInt(stats.sent_count),
        opened_count: parseInt(stats.opened_count),
        clicked_count: parseInt(stats.clicked_count),
        open_rate: stats.sent_count > 0 ? (stats.opened_count / stats.sent_count) * 100 : 0,
        click_rate: stats.sent_count > 0 ? (stats.clicked_count / stats.sent_count) * 100 : 0,
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get campaign analytics', { error, campaignId, tenantId });
      throw new DatabaseError('Failed to retrieve campaign analytics');
    }
  }

  /**
   * Send campaign message to customer
   */
  private async sendCampaignMessage(
    client: any,
    tenantId: string,
    campaignId: string,
    customerId: string,
    messageTemplate: string
  ): Promise<void> {
    // Get customer details
    const customerResult = await client.query(
      'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (customerResult.rows.length === 0) {
      return;
    }

    const customer = customerResult.rows[0];

    // Personalize message
    const personalizedMessage = messageTemplate
      .replace('{{company_name}}', customer.company_name)
      .replace('{{contact_name}}', customer.contact_name);

    // Create communication record
    await client.query(
      `INSERT INTO communications (
        tenant_id, campaign_id, customer_id, communication_type,
        message, channel, status
      ) VALUES ($1, $2, $3, 'campaign', $4, 'email', 'sent')`,
      [tenantId, campaignId, customerId, personalizedMessage]
    );
  }

  /**
   * Apply segment criteria to find matching customers
   */
  private async applySegmentCriteria(
    client: any,
    tenantId: string,
    criteria: any
  ): Promise<string[]> {
    // Build query based on criteria
    let query = 'SELECT id FROM customers WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (criteria.min_revenue) {
      query += ` AND total_revenue >= $${paramIndex}`;
      params.push(criteria.min_revenue);
      paramIndex++;
    }

    if (criteria.industry) {
      query += ` AND industry = $${paramIndex}`;
      params.push(criteria.industry);
      paramIndex++;
    }

    if (criteria.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(criteria.status);
      paramIndex++;
    }

    const result = await client.query(query, params);
    return result.rows.map((r: any) => r.id);
  }
}

export const marketingService = new MarketingService();
