import { Pool } from 'pg';
import { databaseService } from '../../../common/database/database.service';
import { Logger } from '../../../common/logging/logger';
import { metricsService } from '../../../common/monitoring/metrics.service';
import { notificationService } from '../../../common/notifications/notification.service';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
} from '../../../common/errors/app-error';
import {
  IPayment,
  ICreatePaymentRequest,
  IPaymentGateway,
  IPaymentFilters,
  PaymentStatus,
} from '../types/payment.types';

const logger = new Logger('PaymentService');

/**
 * Payment Service
 * Handles payment processing, gateway integration, and reconciliation
 */
export class PaymentService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a new payment
   */
  async createPayment(
    tenantId: string,
    data: ICreatePaymentRequest,
    createdBy: string
  ): Promise<IPayment> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate invoice exists and get details
      const invoiceResult = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [data.invoice_id, tenantId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new NotFoundError('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Validate payment amount
      if (data.amount > invoice.amount_due) {
        throw new ValidationError('Payment amount exceeds amount due');
      }

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber(client, tenantId);

      // Calculate fees
      const fees = await this.calculatePaymentFees(
        data.amount,
        data.payment_method,
        data.gateway_id
      );

      // Insert payment record
      const paymentQuery = `
        INSERT INTO payments (
          tenant_id, customer_id, invoice_id, gateway_id,
          payment_number, payment_method, payment_type,
          amount, currency, fee_amount, net_amount,
          status, payment_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const paymentResult = await client.query(paymentQuery, [
        tenantId,
        invoice.customer_id,
        data.invoice_id,
        data.gateway_id,
        paymentNumber,
        data.payment_method,
        data.payment_type || 'full',
        data.amount,
        data.currency || invoice.currency,
        fees.fee_amount,
        fees.net_amount,
        'pending',
        data.payment_date || new Date(),
        createdBy,
      ]);

      const payment = paymentResult.rows[0];

      // Process payment through gateway
      const gatewayResult = await this.processPaymentGateway(payment, data);

      // Update payment with gateway response
      await client.query(
        `UPDATE payments 
         SET gateway_transaction_id = $1, gateway_response = $2, status = $3
         WHERE id = $4`,
        [
          gatewayResult.transaction_id,
          JSON.stringify(gatewayResult.response),
          gatewayResult.status,
          payment.id,
        ]
      );

      payment.gateway_transaction_id = gatewayResult.transaction_id;
      payment.status = gatewayResult.status;

      // If payment successful, update invoice
      if (gatewayResult.status === 'completed') {
        await this.updateInvoicePayment(client, invoice.id, data.amount);
      }

      // Record history
      await this.recordPaymentHistory(
        client,
        payment.id,
        'created',
        `Payment created via ${data.payment_method}`,
        createdBy
      );

      await client.query('COMMIT');

      // Record metrics
      metricsService.recordPaymentProcessed(tenantId, data.payment_method, gatewayResult.status);
      metricsService.recordPaymentAmount(tenantId, payment.currency, payment.amount);

      // Send notification
      if (gatewayResult.status === 'completed') {
        await notificationService.sendPaymentConfirmation(
          invoice.customer_email,
          paymentNumber,
          data.amount.toString()
        );
      }

      logger.info('Payment created', {
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        status: gatewayResult.status,
        tenantId,
      });

      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create payment', { error, tenantId });
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to create payment');
    } finally {
      client.release();
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(tenantId: string, paymentId: string): Promise<IPayment> {
    try {
      const query = `
        SELECT p.*, i.invoice_number, c.company_name as customer_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        JOIN customers c ON p.customer_id = c.id
        WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [paymentId, tenantId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Payment not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get payment', { error, paymentId, tenantId });
      throw new DatabaseError('Failed to retrieve payment');
    }
  }

  /**
   * List payments with filters
   */
  async listPayments(
    tenantId: string,
    filters: IPaymentFilters
  ): Promise<{ payments: IPayment[]; total: number }> {
    try {
      let query = `
        SELECT p.*, i.invoice_number, c.company_name as customer_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        JOIN customers c ON p.customer_id = c.id
        WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status) {
        query += ` AND p.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.invoice_id) {
        query += ` AND p.invoice_id = $${paramIndex}`;
        params.push(filters.invoice_id);
        paramIndex++;
      }

      if (filters.payment_method) {
        query += ` AND p.payment_method = $${paramIndex}`;
        params.push(filters.payment_method);
        paramIndex++;
      }

      // Count total
      const countQuery = query.replace(
        'SELECT p.*, i.invoice_number, c.company_name as customer_name',
        'SELECT COUNT(*)'
      );
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(filters.limit || 20, filters.offset || 0);

      const result = await this.pool.query(query, params);

      return {
        payments: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Failed to list payments', { error, tenantId });
      throw new DatabaseError('Failed to list payments');
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    tenantId: string,
    paymentId: string,
    amount: number,
    reason: string,
    userId: string
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const payment = await this.getPaymentById(tenantId, paymentId);

      if (payment.status !== 'completed') {
        throw new ValidationError('Can only refund completed payments');
      }

      if (amount > payment.amount) {
        throw new ValidationError('Refund amount exceeds payment amount');
      }

      // Process refund through gateway
      const refundResult = await this.processRefundGateway(payment, amount);

      // Create refund record
      await client.query(
        `INSERT INTO payment_refunds (
          payment_id, amount, reason, gateway_refund_id, status, processed_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [paymentId, amount, reason, refundResult.refund_id, refundResult.status, userId]
      );

      // Update payment status if fully refunded
      if (amount === payment.amount) {
        await client.query('UPDATE payments SET status = $1 WHERE id = $2', ['refunded', paymentId]);
      }

      // Update invoice
      const invoice = await client.query('SELECT * FROM invoices WHERE id = $1', [
        payment.invoice_id,
      ]);
      await client.query(
        `UPDATE invoices 
         SET amount_paid = amount_paid - $1, amount_due = amount_due + $1
         WHERE id = $2`,
        [amount, payment.invoice_id]
      );

      await client.query('COMMIT');

      logger.info('Refund processed', { paymentId, amount, tenantId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to process refund', { error, paymentId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process payment through gateway
   */
  private async processPaymentGateway(
    payment: IPayment,
    data: ICreatePaymentRequest
  ): Promise<{ transaction_id: string; response: any; status: PaymentStatus }> {
    try {
      // Get gateway configuration
      const gateway = await this.getGatewayConfig(payment.gateway_id);

      // Simulate gateway processing (replace with actual gateway integration)
      // For Stripe, Razorpay, etc., use their respective SDKs

      if (gateway.provider === 'stripe') {
        return await this.processStripePayment(payment, data, gateway);
      } else if (gateway.provider === 'razorpay') {
        return await this.processRazorpayPayment(payment, data, gateway);
      }

      // Default simulation for development
      const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        transaction_id,
        response: { status: 'success', message: 'Payment processed successfully' },
        status: 'completed',
      };
    } catch (error) {
      logger.error('Gateway processing failed', { error, paymentId: payment.id });
      return {
        transaction_id: '',
        response: { error: error.message },
        status: 'failed',
      };
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    payment: IPayment,
    data: ICreatePaymentRequest,
    gateway: IPaymentGateway
  ): Promise<{ transaction_id: string; response: any; status: PaymentStatus }> {
    // TODO: Implement Stripe SDK integration
    // const stripe = require('stripe')(gateway.api_key);
    // const paymentIntent = await stripe.paymentIntents.create({...});

    throw new ExternalServiceError('Stripe integration not yet implemented');
  }

  /**
   * Process Razorpay payment
   */
  private async processRazorpayPayment(
    payment: IPayment,
    data: ICreatePaymentRequest,
    gateway: IPaymentGateway
  ): Promise<{ transaction_id: string; response: any; status: PaymentStatus }> {
    // TODO: Implement Razorpay SDK integration
    // const Razorpay = require('razorpay');
    // const instance = new Razorpay({...});

    throw new ExternalServiceError('Razorpay integration not yet implemented');
  }

  /**
   * Process refund through gateway
   */
  private async processRefundGateway(
    payment: IPayment,
    amount: number
  ): Promise<{ refund_id: string; status: string }> {
    // Simulate refund processing
    const refund_id = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      refund_id,
      status: 'completed',
    };
  }

  /**
   * Calculate payment fees
   */
  private async calculatePaymentFees(
    amount: number,
    paymentMethod: string,
    gatewayId: string
  ): Promise<{ fee_amount: number; net_amount: number }> {
    // Get gateway fee structure
    const gateway = await this.getGatewayConfig(gatewayId);

    let fee_amount = 0;

    if (gateway.fee_type === 'percentage') {
      fee_amount = (amount * gateway.fee_value) / 100;
    } else if (gateway.fee_type === 'fixed') {
      fee_amount = gateway.fee_value;
    }

    const net_amount = amount - fee_amount;

    return { fee_amount, net_amount };
  }

  /**
   * Update invoice payment
   */
  private async updateInvoicePayment(client: any, invoiceId: string, amount: number): Promise<void> {
    await client.query(
      `UPDATE invoices 
       SET amount_paid = amount_paid + $1, 
           amount_due = amount_due - $1,
           status = CASE 
             WHEN amount_due - $1 <= 0 THEN 'paid'
             WHEN amount_paid + $1 > 0 THEN 'partially_paid'
             ELSE status
           END
       WHERE id = $2`,
      [amount, invoiceId]
    );
  }

  /**
   * Get gateway configuration
   */
  private async getGatewayConfig(gatewayId: string): Promise<IPaymentGateway> {
    const result = await this.pool.query(
      'SELECT * FROM payment_gateways WHERE id = $1 AND is_active = true',
      [gatewayId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment gateway not found or inactive');
    }

    return result.rows[0];
  }

  /**
   * Generate unique payment number
   */
  private async generatePaymentNumber(client: any, tenantId: string): Promise<string> {
    const result = await client.query(
      'SELECT COUNT(*) FROM payments WHERE tenant_id = $1',
      [tenantId]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `PAY-${year}${month}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Record payment history
   */
  private async recordPaymentHistory(
    client: any,
    paymentId: string,
    action: string,
    description: string,
    userId: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO payment_history (payment_id, action, description, performed_by)
       VALUES ($1, $2, $3, $4)`,
      [paymentId, action, description, userId]
    );
  }
}

export const paymentService = new PaymentService();
