import { Pool, PoolClient } from 'pg';
import { User } from '../types/auth.types';
import { AuditService, AuditEventType } from './audit';
import { InputValidator, VALIDATION_SCHEMAS } from './validation';

// Invoice interface
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  currency: string;
  dueDate: Date;
  issueDate: Date;
  status: InvoiceStatus;
  description?: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  metadata?: Record<string, any>;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  cancelledAt?: Date;
}

// Invoice line item
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
}

// Invoice status
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// Invoice query filters
export interface InvoiceQuery {
  customerId?: string;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Invoice statistics
export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  averageAmount: number;
  statusCounts: Record<InvoiceStatus, number>;
  monthlyStats: {
    month: string;
    count: number;
    amount: number;
  }[];
}

// Invoice service class
export class InvoiceService {
  private pool: Pool;
  private auditService: AuditService;
  private validator: InputValidator;

  constructor(pool: Pool, auditService: AuditService) {
    this.pool = pool;
    this.auditService = auditService;
    this.validator = new InputValidator(VALIDATION_SCHEMAS.INVOICE_CREATE);
    this.initializeDatabase();
  }

  // Initialize invoice database schema
  private async initializeDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create invoices table
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id UUID,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255),
          customer_phone VARCHAR(50),
          amount DECIMAL(12,2) NOT NULL,
          tax_amount DECIMAL(12,2) DEFAULT 0,
          total_amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          due_date TIMESTAMP WITH TIME ZONE NOT NULL,
          issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
          description TEXT,
          notes TEXT,
          terms TEXT,
          metadata JSONB,
          tenant_id UUID NOT NULL,
          created_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          paid_at TIMESTAMP WITH TIME ZONE,
          cancelled_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Create invoice line items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoice_line_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          quantity DECIMAL(10,2) NOT NULL,
          unit_price DECIMAL(12,2) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          tax_rate DECIMAL(5,2) DEFAULT 0,
          tax_amount DECIMAL(12,2) DEFAULT 0,
          total_amount DECIMAL(12,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);');

      console.log('✅ Invoice database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize invoice database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create a new invoice
  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>, user: User): Promise<Invoice> {
    // Validate input
    const validation = this.validator.validate(invoiceData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate unique invoice number if not provided
      let invoiceNumber = invoiceData.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await this.generateInvoiceNumber(client, invoiceData.tenantId);
      }

      // Check if invoice number already exists
      const existingInvoice = await client.query(
        'SELECT id FROM invoices WHERE invoice_number = $1 AND tenant_id = $2',
        [invoiceNumber, invoiceData.tenantId]
      );
      if (existingInvoice.rows.length > 0) {
        throw new Error('Invoice number already exists');
      }

      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (
          invoice_number, customer_id, customer_name, customer_email, customer_phone,
          amount, tax_amount, total_amount, currency, due_date, issue_date, status,
          description, notes, terms, metadata, tenant_id, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const values = [
        invoiceNumber,
        invoiceData.customerId || null,
        invoiceData.customerName,
        invoiceData.customerEmail || null,
        invoiceData.customerPhone || null,
        invoiceData.amount,
        invoiceData.taxAmount || 0,
        invoiceData.totalAmount,
        invoiceData.currency || 'USD',
        invoiceData.dueDate,
        invoiceData.issueDate || new Date(),
        invoiceData.status || InvoiceStatus.DRAFT,
        invoiceData.description || null,
        invoiceData.notes || null,
        invoiceData.terms || null,
        invoiceData.metadata ? JSON.stringify(invoiceData.metadata) : null,
        invoiceData.tenantId,
        user.id,
      ];

      const result = await client.query(invoiceQuery, values);
      const invoice = this.mapRowToInvoice(result.rows[0]);

      // Insert line items
      if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
        await this.insertLineItems(client, invoice.id, invoiceData.lineItems);
      }

      await client.query('COMMIT');

      // Log audit event
      await this.auditService.log({
        eventType: AuditEventType.INVOICE_CREATED,
        userId: user.id,
        tenantId: user.tenantId,
        resource: 'invoice',
        resourceId: invoice.id,
        action: 'create',
        details: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          customerName: invoice.customerName,
        },
        newValue: invoice,
        severity: 'MEDIUM',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });

      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId: string, user: User): Promise<Invoice | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        [invoiceId, user.tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const invoice = this.mapRowToInvoice(result.rows[0]);

      // Get line items
      invoice.lineItems = await this.getLineItems(client, invoiceId);

      return invoice;
    } finally {
      client.release();
    }
  }

  // Get invoice by number
  async getInvoiceByNumber(invoiceNumber: string, user: User): Promise<Invoice | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM invoices WHERE invoice_number = $1 AND tenant_id = $2',
        [invoiceNumber, user.tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const invoice = this.mapRowToInvoice(result.rows[0]);

      // Get line items
      invoice.lineItems = await this.getLineItems(client, invoice.id);

      return invoice;
    } finally {
      client.release();
    }
  }

  // Update invoice
  async updateInvoice(invoiceId: string, updates: Partial<Invoice>, user: User): Promise<Invoice> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get existing invoice
      const existingResult = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        [invoiceId, user.tenantId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const existingInvoice = this.mapRowToInvoice(existingResult.rows[0]);

      // Check if invoice can be updated (not paid or cancelled)
      if (existingInvoice.status === InvoiceStatus.PAID || existingInvoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Cannot update paid or cancelled invoice');
      }

      // Build update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.customerName !== undefined) {
        fields.push(`customer_name = $${paramIndex++}`);
        values.push(updates.customerName);
      }
      if (updates.customerEmail !== undefined) {
        fields.push(`customer_email = $${paramIndex++}`);
        values.push(updates.customerEmail);
      }
      if (updates.customerPhone !== undefined) {
        fields.push(`customer_phone = $${paramIndex++}`);
        values.push(updates.customerPhone);
      }
      if (updates.amount !== undefined) {
        fields.push(`amount = $${paramIndex++}`);
        values.push(updates.amount);
      }
      if (updates.taxAmount !== undefined) {
        fields.push(`tax_amount = $${paramIndex++}`);
        values.push(updates.taxAmount);
      }
      if (updates.totalAmount !== undefined) {
        fields.push(`total_amount = $${paramIndex++}`);
        values.push(updates.totalAmount);
      }
      if (updates.currency !== undefined) {
        fields.push(`currency = $${paramIndex++}`);
        values.push(updates.currency);
      }
      if (updates.dueDate !== undefined) {
        fields.push(`due_date = $${paramIndex++}`);
        values.push(updates.dueDate);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
        
        // Set status-specific timestamps
        if (updates.status === InvoiceStatus.PAID) {
          fields.push(`paid_at = $${paramIndex++}`);
          values.push(new Date());
        }
        if (updates.status === InvoiceStatus.CANCELLED) {
          fields.push(`cancelled_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }
      if (updates.terms !== undefined) {
        fields.push(`terms = $${paramIndex++}`);
        values.push(updates.terms);
      }
      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      fields.push(`updated_at = NOW()`);
      values.push(invoiceId, user.tenantId);

      const updateQuery = `
        UPDATE invoices 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const updatedInvoice = this.mapRowToInvoice(result.rows[0]);

      // Update line items if provided
      if (updates.lineItems) {
        // Delete existing line items
        await client.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [invoiceId]);
        
        // Insert new line items
        await this.insertLineItems(client, invoiceId, updates.lineItems);
      }

      await client.query('COMMIT');

      // Get complete invoice with line items
      const completeInvoice = await this.getInvoiceById(invoiceId, user);

      // Log audit event
      await this.auditService.log({
        eventType: AuditEventType.INVOICE_UPDATED,
        userId: user.id,
        tenantId: user.tenantId,
        resource: 'invoice',
        resourceId: invoiceId,
        action: 'update',
        details: {
          invoiceNumber: updatedInvoice.invoiceNumber,
          changes: Object.keys(updates),
        },
        oldValue: existingInvoice,
        newValue: completeInvoice,
        severity: 'MEDIUM',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });

      return completeInvoice!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete invoice (soft delete - mark as cancelled)
  async deleteInvoice(invoiceId: string, user: User): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get existing invoice
      const existingResult = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        [invoiceId, user.tenantId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const existingInvoice = this.mapRowToInvoice(existingResult.rows[0]);

      // Check if invoice can be deleted (not paid)
      if (existingInvoice.status === InvoiceStatus.PAID) {
        throw new Error('Cannot delete paid invoice');
      }

      // Mark as cancelled
      await client.query(
        'UPDATE invoices SET status = $1, cancelled_at = NOW(), updated_at = NOW() WHERE id = $2',
        [InvoiceStatus.CANCELLED, invoiceId]
      );

      await client.query('COMMIT');

      // Log audit event
      await this.auditService.log({
        eventType: AuditEventType.INVOICE_DELETED,
        userId: user.id,
        tenantId: user.tenantId,
        resource: 'invoice',
        resourceId: invoiceId,
        action: 'delete',
        details: {
          invoiceNumber: existingInvoice.invoiceNumber,
          amount: existingInvoice.totalAmount,
        },
        oldValue: existingInvoice,
        severity: 'HIGH',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // List invoices with filters
  async listInvoices(query: InvoiceQuery, user: User): Promise<{ invoices: Invoice[]; total: number }> {
    const client = await this.pool.connect();
    try {
      // Build WHERE clause
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [user.tenantId];
      let paramIndex = 2;

      if (query.customerId) {
        conditions.push(`customer_id = $${paramIndex++}`);
        values.push(query.customerId);
      }

      if (query.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(query.status);
      }

      if (query.startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(query.endDate);
      }

      if (query.minAmount) {
        conditions.push(`total_amount >= $${paramIndex++}`);
        values.push(query.minAmount);
      }

      if (query.maxAmount) {
        conditions.push(`total_amount <= $${paramIndex++}`);
        values.push(query.maxAmount);
      }

      if (query.search) {
        conditions.push(`(invoice_number ILIKE $${paramIndex++} OR customer_name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`);
        values.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
        paramIndex += 2;
      }

      const whereClause = conditions.join(' AND ');

      // Count query
      const countQuery = `SELECT COUNT(*) FROM invoices WHERE ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Build LIMIT and OFFSET
      const limit = Math.min(query.limit || 50, 1000);
      const offset = query.offset || 0;
      values.push(limit, offset);

      // Main query
      const invoicesQuery = `
        SELECT * FROM invoices 
        WHERE ${whereClause} 
        ${orderClause} 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await client.query(invoicesQuery, values);
      const invoices = result.rows.map(row => this.mapRowToInvoice(row));

      // Get line items for each invoice
      for (const invoice of invoices) {
        invoice.lineItems = await this.getLineItems(client, invoice.id);
      }

      return { invoices, total };
    } finally {
      client.release();
    }
  }

  // Get invoice statistics
  async getInvoiceStats(user: User, days: number = 30): Promise<InvoiceStats> {
    const client = await this.pool.connect();
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_amount END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status != 'PAID' THEN total_amount END), 0) as unpaid_amount,
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN total_amount END), 0) as overdue_amount,
          COALESCE(AVG(total_amount), 0) as average_amount
        FROM invoices 
        WHERE tenant_id = $1 AND created_at >= $2
      `;

      const statsResult = await client.query(statsQuery, [user.tenantId, startDate]);
      const stats = statsResult.rows[0];

      // Get status counts
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM invoices 
        WHERE tenant_id = $1 AND created_at >= $2
        GROUP BY status
      `;

      const statusResult = await client.query(statusQuery, [user.tenantId, startDate]);
      const statusCounts: Record<InvoiceStatus, number> = {} as any;
      statusResult.rows.forEach(row => {
        statusCounts[row.status as InvoiceStatus] = parseInt(row.count);
      });

      // Get monthly statistics
      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as amount
        FROM invoices 
        WHERE tenant_id = $1 AND created_at >= $2
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `;

      const monthlyResult = await client.query(monthlyQuery, [user.tenantId, startDate]);
      const monthlyStats = monthlyResult.rows.map(row => ({
        month: row.month.toISOString().slice(0, 7),
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
      }));

      return {
        totalInvoices: parseInt(stats.total_invoices),
        totalAmount: parseFloat(stats.total_amount),
        paidAmount: parseFloat(stats.paid_amount),
        unpaidAmount: parseFloat(stats.unpaid_amount),
        overdueAmount: parseFloat(stats.overdue_amount),
        averageAmount: parseFloat(stats.average_amount),
        statusCounts,
        monthlyStats,
      };
    } finally {
      client.release();
    }
  }

  // Generate unique invoice number
  private async generateInvoiceNumber(client: PoolClient, tenantId: string): Promise<string> {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the highest invoice number for this month
    const query = `
      SELECT invoice_number 
      FROM invoices 
      WHERE tenant_id = $1 AND invoice_number LIKE $2
      ORDER BY invoice_number DESC 
      LIMIT 1
    `;
    
    const result = await client.query(query, [tenantId, `${prefix}${year}${month}%`]);
    
    let sequence = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].invoice_number;
      const lastSequence = parseInt(lastNumber.slice(-6));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${year}${month}${String(sequence).padStart(6, '0')}`;
  }

  // Insert line items
  private async insertLineItems(client: PoolClient, invoiceId: string, lineItems: InvoiceLineItem[]): Promise<void> {
    for (const item of lineItems) {
      const query = `
        INSERT INTO invoice_line_items (
          invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const values = [
        invoiceId,
        item.description,
        item.quantity,
        item.unitPrice,
        item.amount,
        item.taxRate || 0,
        item.taxAmount || 0,
        item.totalAmount,
      ];

      await client.query(query, values);
    }
  }

  // Get line items for invoice
  private async getLineItems(client: PoolClient, invoiceId: string): Promise<InvoiceLineItem[]> {
    const result = await client.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY created_at',
      [invoiceId]
    );

    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      amount: parseFloat(row.amount),
      taxRate: row.tax_rate ? parseFloat(row.tax_rate) : undefined,
      taxAmount: row.tax_amount ? parseFloat(row.tax_amount) : undefined,
      totalAmount: parseFloat(row.total_amount),
    }));
  }

  // Map database row to invoice
  private mapRowToInvoice(row: any): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      amount: parseFloat(row.amount),
      taxAmount: row.tax_amount ? parseFloat(row.tax_amount) : undefined,
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      dueDate: row.due_date,
      issueDate: row.issue_date,
      status: row.status,
      description: row.description,
      notes: row.notes,
      terms: row.terms,
      metadata: row.metadata,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
      cancelledAt: row.cancelled_at,
      lineItems: [], // Will be populated separately
    };
  }

  // Update overdue invoices
  async updateOverdueInvoices(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE invoices 
        SET status = 'OVERDUE', updated_at = NOW()
        WHERE status IN ('SENT', 'VIEWED', 'PARTIALLY_PAID') 
        AND due_date < NOW()
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Send invoice (update status to SENT)
  async sendInvoice(invoiceId: string, user: User): Promise<Invoice> {
    return this.updateInvoice(invoiceId, { status: InvoiceStatus.SENT }, user);
  }

  // Mark invoice as viewed
  async markInvoiceAsViewed(invoiceId: string, user: User): Promise<Invoice> {
    return this.updateInvoice(invoiceId, { status: InvoiceStatus.VIEWED }, user);
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(invoiceId: string, user: User): Promise<Invoice> {
    return this.updateInvoice(invoiceId, { status: InvoiceStatus.PAID }, user);
  }
}

export default InvoiceService;
