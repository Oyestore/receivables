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
  IInvoice,
  IInvoiceLineItem,
  ICreateInvoiceRequest,
  IUpdateInvoiceRequest,
  IInvoiceFilters,
} from '../types/invoice.types';

const logger = new Logger('InvoiceService');

/**
 * Invoice Service
 * Handles all invoice-related business logic
 */
export class InvoiceService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    tenantId: string,
    data: ICreateInvoiceRequest,
    createdBy: string
  ): Promise<IInvoice> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(client, tenantId);

      // Calculate totals
      const totals = this.calculateTotals(data.line_items);

      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (
          tenant_id, customer_id, template_id, invoice_number,
          invoice_type, status, issue_date, due_date, payment_terms,
          subtotal, tax_amount, discount_amount, total_amount,
          amount_paid, amount_due, currency, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const invoiceResult = await client.query(invoiceQuery, [
        tenantId,
        data.customer_id,
        data.template_id || null,
        invoiceNumber,
        data.invoice_type || 'standard',
        'draft',
        data.issue_date,
        data.due_date,
        data.payment_terms || 30,
        totals.subtotal,
        totals.tax_amount,
        totals.discount_amount,
        totals.total_amount,
        0,
        totals.total_amount,
        data.currency || 'INR',
        data.notes || null,
        createdBy,
      ]);

      const invoice = invoiceResult.rows[0];

      // Insert line items
      for (let i = 0; i < data.line_items.length; i++) {
        const item = data.line_items[i];
        const itemTotals = this.calculateLineItemTotals(item);

        await client.query(
          `
          INSERT INTO invoice_line_items (
            invoice_id, line_number, item_type, item_code, description,
            quantity, unit, unit_price, tax_rate, tax_amount,
            discount_type, discount_value, discount_amount,
            subtotal, total_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
          [
            invoice.id,
            i + 1,
            item.item_type || 'product',
            item.item_code || null,
            item.description,
            item.quantity,
            item.unit || 'unit',
            item.unit_price,
            item.tax_rate || 0,
            itemTotals.tax_amount,
            item.discount_type || null,
            item.discount_value || 0,
            itemTotals.discount_amount,
            itemTotals.subtotal,
            itemTotals.total_amount,
          ]
        );
      }

      // Record history
      await this.recordHistory(client, invoice.id, 'created', 'Invoice created', createdBy);

      await client.query('COMMIT');

      // Record metrics
      metricsService.recordInvoiceCreated(tenantId, invoice.invoice_type);

      logger.info('Invoice created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        tenantId,
      });

      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create invoice', { error, tenantId });
      throw new DatabaseError('Failed to create invoice');
    } finally {
      client.release();
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(tenantId: string, invoiceId: string): Promise<IInvoice> {
    try {
      const query = `
        SELECT i.*, c.company_name as customer_name, c.email as customer_email
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [invoiceId, tenantId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Invoice not found');
      }

      const invoice = result.rows[0];

      // Get line items
      const lineItemsQuery = `
        SELECT * FROM invoice_line_items
        WHERE invoice_id = $1
        ORDER BY line_number
      `;

      const lineItemsResult = await this.pool.query(lineItemsQuery, [invoiceId]);
      invoice.line_items = lineItemsResult.rows;

      return invoice;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get invoice', { error, invoiceId, tenantId });
      throw new DatabaseError('Failed to retrieve invoice');
    }
  }

  /**
   * List invoices with filters
   */
  async listInvoices(
    tenantId: string,
    filters: IInvoiceFilters
  ): Promise<{ invoices: IInvoice[]; total: number }> {
    try {
      let query = `
        SELECT i.*, c.company_name as customer_name, c.email as customer_email
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.tenant_id = $1 AND i.deleted_at IS NULL
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status) {
        query += ` AND i.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.customer_id) {
        query += ` AND i.customer_id = $${paramIndex}`;
        params.push(filters.customer_id);
        paramIndex++;
      }

      if (filters.from_date) {
        query += ` AND i.issue_date >= $${paramIndex}`;
        params.push(filters.from_date);
        paramIndex++;
      }

      if (filters.to_date) {
        query += ` AND i.issue_date <= $${paramIndex}`;
        params.push(filters.to_date);
        paramIndex++;
      }

      // Count total
      const countQuery = query.replace(
        'SELECT i.*, c.company_name as customer_name, c.email as customer_email',
        'SELECT COUNT(*)'
      );
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(filters.limit || 20, filters.offset || 0);

      const result = await this.pool.query(query, params);

      return {
        invoices: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Failed to list invoices', { error, tenantId });
      throw new DatabaseError('Failed to list invoices');
    }
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(tenantId: string, invoiceId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const invoice = await this.getInvoiceById(tenantId, invoiceId);

      if (invoice.status !== 'draft' && invoice.status !== 'sent') {
        throw new ValidationError('Only draft or sent invoices can be sent');
      }

      // Update status
      await client.query(
        `UPDATE invoices SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [invoiceId]
      );

      // Send email notification
      await notificationService.sendInvoiceNotification(
        invoice.customer_email,
        invoice.invoice_number,
        invoice.total_amount.toString()
      );

      // Record history
      await this.recordHistory(client, invoiceId, 'sent', 'Invoice sent to customer', userId);

      await client.query('COMMIT');

      logger.info('Invoice sent', { invoiceId, tenantId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to send invoice', { error, invoiceId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate invoice totals
   */
  private calculateTotals(lineItems: IInvoiceLineItem[]): {
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  } {
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    for (const item of lineItems) {
      const itemTotals = this.calculateLineItemTotals(item);
      subtotal += itemTotals.subtotal;
      tax_amount += itemTotals.tax_amount;
      discount_amount += itemTotals.discount_amount;
    }

    const total_amount = subtotal + tax_amount - discount_amount;

    return { subtotal, tax_amount, discount_amount, total_amount };
  }

  /**
   * Calculate line item totals
   */
  private calculateLineItemTotals(item: IInvoiceLineItem): {
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  } {
    const subtotal = item.quantity * item.unit_price;

    let discount_amount = 0;
    if (item.discount_type === 'percentage') {
      discount_amount = (subtotal * (item.discount_value || 0)) / 100;
    } else if (item.discount_type === 'fixed') {
      discount_amount = item.discount_value || 0;
    }

    const taxable_amount = subtotal - discount_amount;
    const tax_amount = (taxable_amount * (item.tax_rate || 0)) / 100;
    const total_amount = taxable_amount + tax_amount;

    return { subtotal, tax_amount, discount_amount, total_amount };
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(client: any, tenantId: string): Promise<string> {
    const result = await client.query(
      `SELECT COUNT(*) FROM invoices WHERE tenant_id = $1`,
      [tenantId]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `INV-${year}${month}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Record invoice history
   */
  private async recordHistory(
    client: any,
    invoiceId: string,
    action: string,
    description: string,
    userId: string
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO invoice_history (invoice_id, action, description, performed_by)
      VALUES ($1, $2, $3, $4)
    `,
      [invoiceId, action, description, userId]
    );
  }
}

export const invoiceService = new InvoiceService();
