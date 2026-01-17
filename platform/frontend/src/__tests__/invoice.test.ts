import { InvoiceService, InvoiceStatus, Invoice } from '../lib/invoice';
import { User, UserRole } from '../types/auth.types';
import { AuditService } from '../lib/audit';

// Mock dependencies
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
} as any;

const mockAuditService = {
  log: jest.fn(),
} as unknown as jest.Mocked<AuditService>;

// Mock user
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.SME_OWNER,
  tenantId: 'tenant-123',
  mobile: '+1234567890',
  permissions: [],
  isActive: true,
};

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    invoiceService = new InvoiceService(mockPool, mockAuditService);
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createInvoice', () => {
    const invoiceData = {
      invoiceNumber: 'INV20241200001',
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      amount: 1000,
      totalAmount: 1100,
      dueDate: new Date('2024-12-31'),
      tenantId: 'tenant-123',
      lineItems: [
        {
          id: 'item-1',
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000,
          amount: 1000,
          totalAmount: 1000,
        },
      ],
    };

    it('should create a new invoice successfully', async () => {
      // Mock database responses
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing invoice
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'invoice-123',
          invoice_number: invoiceData.invoiceNumber,
          customer_name: invoiceData.customerName,
          customer_email: invoiceData.customerEmail,
          amount: invoiceData.amount,
          total_amount: invoiceData.totalAmount,
          due_date: invoiceData.dueDate,
          status: InvoiceStatus.DRAFT,
          tenant_id: invoiceData.tenantId,
          created_by: mockUser.id,
          created_at: new Date(),
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Line items insert

      const result = await invoiceService.createInvoice(invoiceData, mockUser);

      expect(result).toBeDefined();
      expect(result.invoiceNumber).toBe(invoiceData.invoiceNumber);
      expect(result.customerName).toBe(invoiceData.customerName);
      expect(result.amount).toBe(invoiceData.amount);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        eventType: 'INVOICE_CREATED',
        userId: mockUser.id,
        tenantId: mockUser.tenantId,
        resource: 'invoice',
        resourceId: 'invoice-123',
        action: 'create',
        details: expect.objectContaining({
          invoiceNumber: invoiceData.invoiceNumber,
          amount: invoiceData.totalAmount,
        }),
        newValue: expect.any(Object),
        severity: 'MEDIUM',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });
    });

    it('should generate invoice number if not provided', async () => {
      const invoiceWithoutNumber = { ...invoiceData, invoiceNumber: undefined };
      
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Generate number
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'invoice-123',
          invoice_number: 'INV20241200001',
          customer_name: invoiceData.customerName,
          amount: invoiceData.amount,
          total_amount: invoiceData.totalAmount,
          due_date: invoiceData.dueDate,
          status: InvoiceStatus.DRAFT,
          tenant_id: invoiceData.tenantId,
          created_by: mockUser.id,
          created_at: new Date(),
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await invoiceService.createInvoice(invoiceWithoutNumber, mockUser);

      expect(result.invoiceNumber).toMatch(/^INV\d{10}$/);
    });

    it('should throw error if invoice number already exists', async () => {
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 'existing-invoice' }] 
      });

      await expect(invoiceService.createInvoice(invoiceData, mockUser))
        .rejects.toThrow('Invoice number already exists');
    });

    it('should validate input data', async () => {
      const invalidInvoice = { ...invoiceData, amount: -100 };

      await expect(invoiceService.createInvoice(invalidInvoice, mockUser))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice by ID', async () => {
      const mockInvoice = {
        id: 'invoice-123',
        invoice_number: 'INV20241200001',
        customer_name: 'Test Customer',
        amount: 1000,
        total_amount: 1100,
        due_date: new Date(),
        status: InvoiceStatus.DRAFT,
        tenant_id: 'tenant-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockInvoice] });
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'item-1',
          description: 'Test Item',
          quantity: 1,
          unit_price: 1000,
          amount: 1000,
          total_amount: 1000,
        }]
      });

      const result = await invoiceService.getInvoiceById('invoice-123', mockUser);

      expect(result).toBeDefined();
      expect(result?.id).toBe('invoice-123');
      expect(result?.lineItems).toHaveLength(1);
    });

    it('should return null for non-existent invoice', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await invoiceService.getInvoiceById('non-existent', mockUser);

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await invoiceService.getInvoiceById('invoice-123', mockUser);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        ['invoice-123', 'tenant-123']
      );
    });
  });

  describe('updateInvoice', () => {
    const existingInvoice = {
      id: 'invoice-123',
      invoice_number: 'INV20241200001',
      customer_name: 'Test Customer',
      amount: 1000,
      total_amount: 1100,
      due_date: new Date(),
      status: InvoiceStatus.DRAFT,
      tenant_id: 'tenant-123',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update invoice successfully', async () => {
      const updates = {
        customerName: 'Updated Customer',
        amount: 1200,
        totalAmount: 1320,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          ...existingInvoice,
          customer_name: updates.customerName,
          amount: updates.amount,
          total_amount: updates.totalAmount,
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Line items
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] }); // Get complete

      const result = await invoiceService.updateInvoice('invoice-123', updates, mockUser);

      expect(result?.customerName).toBe(updates.customerName);
      expect(result?.amount).toBe(updates.amount);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        eventType: 'INVOICE_UPDATED',
        userId: mockUser.id,
        tenantId: mockUser.tenantId,
        resource: 'invoice',
        resourceId: 'invoice-123',
        action: 'update',
        details: expect.objectContaining({
          changes: expect.arrayContaining(['customerName', 'amount', 'totalAmount']),
        }),
        oldValue: expect.any(Object),
        newValue: expect.any(Object),
        severity: 'MEDIUM',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });
    });

    it('should throw error for paid invoice', async () => {
      const paidInvoice = { ...existingInvoice, status: InvoiceStatus.PAID };
      mockClient.query.mockResolvedValueOnce({ rows: [paidInvoice] });

      await expect(invoiceService.updateInvoice('invoice-123', { customerName: 'New' }, mockUser))
        .rejects.toThrow('Cannot update paid or cancelled invoice');
    });

    it('should throw error for cancelled invoice', async () => {
      const cancelledInvoice = { ...existingInvoice, status: InvoiceStatus.CANCELLED };
      mockClient.query.mockResolvedValueOnce({ rows: [cancelledInvoice] });

      await expect(invoiceService.updateInvoice('invoice-123', { customerName: 'New' }, mockUser))
        .rejects.toThrow('Cannot update paid or cancelled invoice');
    });

    it('should set paid timestamp when status changes to PAID', async () => {
      const updates = { status: InvoiceStatus.PAID };
      
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          ...existingInvoice,
          status: InvoiceStatus.PAID,
          paid_at: new Date(),
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });

      await invoiceService.updateInvoice('invoice-123', updates, mockUser);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('paid_at = $'),
        expect.arrayContaining([expect.any(Date)])
      );
    });
  });

  describe('deleteInvoice', () => {
    const existingInvoice = {
      id: 'invoice-123',
      invoice_number: 'INV20241200001',
      customer_name: 'Test Customer',
      amount: 1000,
      total_amount: 1100,
      status: InvoiceStatus.DRAFT,
      tenant_id: 'tenant-123',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should delete (cancel) invoice successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await invoiceService.deleteInvoice('invoice-123', mockUser);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE invoices SET status = $1, cancelled_at = NOW(), updated_at = NOW() WHERE id = $2',
        [InvoiceStatus.CANCELLED, 'invoice-123']
      );
      expect(mockAuditService.log).toHaveBeenCalledWith({
        eventType: 'INVOICE_DELETED',
        userId: mockUser.id,
        tenantId: mockUser.tenantId,
        resource: 'invoice',
        resourceId: 'invoice-123',
        action: 'delete',
        details: expect.objectContaining({
          invoiceNumber: existingInvoice.invoice_number,
          amount: existingInvoice.total_amount,
        }),
        oldValue: expect.any(Object),
        severity: 'HIGH',
        category: 'BUSINESS',
        status: 'SUCCESS',
      });
    });

    it('should throw error for paid invoice', async () => {
      const paidInvoice = { ...existingInvoice, status: InvoiceStatus.PAID };
      mockClient.query.mockResolvedValueOnce({ rows: [paidInvoice] });

      await expect(invoiceService.deleteInvoice('invoice-123', mockUser))
        .rejects.toThrow('Cannot delete paid invoice');
    });

    it('should throw error for non-existent invoice', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(invoiceService.deleteInvoice('non-existent', mockUser))
        .rejects.toThrow('Invoice not found');
    });
  });

  describe('listInvoices', () => {
    it('should list invoices with filters', async () => {
      const query = {
        status: InvoiceStatus.DRAFT,
        limit: 10,
        offset: 0,
      };

      const mockInvoices = [
        {
          id: 'invoice-1',
          invoice_number: 'INV20241200001',
          customer_name: 'Customer 1',
          amount: 1000,
          total_amount: 1100,
          status: InvoiceStatus.DRAFT,
          tenant_id: 'tenant-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'invoice-2',
          invoice_number: 'INV20241200002',
          customer_name: 'Customer 2',
          amount: 2000,
          total_amount: 2200,
          status: InvoiceStatus.DRAFT,
          tenant_id: 'tenant-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockClient.query.mockResolvedValueOnce({ rows: mockInvoices });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Line items for invoice 1
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Line items for invoice 2

      const result = await invoiceService.listInvoices(query, mockUser);

      expect(result.invoices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1 AND status = $2'),
        expect.arrayContaining(['tenant-123', InvoiceStatus.DRAFT, 10, 0])
      );
    });

    it('should handle search query', async () => {
      const query = {
        search: 'test',
        limit: 5,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await invoiceService.listInvoices(query, mockUser);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('invoice_number ILIKE'),
        expect.arrayContaining(['tenant-123', '%test%', '%test%', '%test%', 5, 0])
      );
    });

    it('should handle date range filter', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const query = {
        startDate,
        endDate,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await invoiceService.listInvoices(query, mockUser);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $'),
        expect.arrayContaining(['tenant-123', startDate, endDate, 50, 0])
      );
    });
  });

  describe('getInvoiceStats', () => {
    it('should return invoice statistics', async () => {
      const mockStats = {
        total_invoices: '10',
        total_amount: '10000',
        paid_amount: '6000',
        unpaid_amount: '4000',
        overdue_amount: '1000',
        average_amount: '1000',
      };

      const mockStatusCounts = [
        { status: InvoiceStatus.DRAFT, count: '2' },
        { status: InvoiceStatus.PAID, count: '5' },
        { status: InvoiceStatus.OVERDUE, count: '1' },
      ];

      const mockMonthlyStats = [
        { month: '2024-12-01T00:00:00.000Z', count: '5', amount: '5000' },
        { month: '2024-11-01T00:00:00.000Z', count: '3', amount: '3000' },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [mockStats] });
      mockClient.query.mockResolvedValueOnce({ rows: mockStatusCounts });
      mockClient.query.mockResolvedValueOnce({ rows: mockMonthlyStats });

      const result = await invoiceService.getInvoiceStats(mockUser, 30);

      expect(result.totalInvoices).toBe(10);
      expect(result.totalAmount).toBe(10000);
      expect(result.paidAmount).toBe(6000);
      expect(result.unpaidAmount).toBe(4000);
      expect(result.overdueAmount).toBe(1000);
      expect(result.averageAmount).toBe(1000);
      expect(result.statusCounts[InvoiceStatus.DRAFT]).toBe(2);
      expect(result.statusCounts[InvoiceStatus.PAID]).toBe(5);
      expect(result.monthlyStats).toHaveLength(2);
    });
  });

  describe('updateOverdueInvoices', () => {
    it('should update overdue invoices', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 5 });

      const result = await invoiceService.updateOverdueInvoices();

      expect(result).toBe(5);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invoices SET status = \'OVERDUE\''),
        []
      );
    });
  });

  describe('sendInvoice', () => {
    it('should send invoice (update status to SENT)', async () => {
      const existingInvoice = {
        id: 'invoice-123',
        status: InvoiceStatus.DRAFT,
        tenant_id: 'tenant-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          ...existingInvoice,
          status: InvoiceStatus.SENT,
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });

      const result = await invoiceService.sendInvoice('invoice-123', mockUser);

      expect(result?.status).toBe(InvoiceStatus.SENT);
    });
  });

  describe('markInvoiceAsPaid', () => {
    it('should mark invoice as paid', async () => {
      const existingInvoice = {
        id: 'invoice-123',
        status: InvoiceStatus.SENT,
        tenant_id: 'tenant-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          ...existingInvoice,
          status: InvoiceStatus.PAID,
          paid_at: new Date(),
          updated_at: new Date(),
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });

      const result = await invoiceService.markInvoiceAsPaid('invoice-123', mockUser);

      expect(result?.status).toBe(InvoiceStatus.PAID);
      expect(result?.paidAt).toBeDefined();
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate sequential invoice numbers', async () => {
      // Test with no existing invoices
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Access private method through prototype
      const generateNumber = (invoiceService as any).generateInvoiceNumber.bind(invoiceService);
      const result = await generateNumber(mockClient, 'tenant-123');

      expect(result).toMatch(/^INV\d{10}$/);
      expect(result).toContain(new Date().getFullYear().toString());
    });

    it('should increment sequence based on existing invoices', async () => {
      const existingInvoice = {
        invoice_number: 'INV20241200001',
      };

      mockClient.query.mockResolvedValueOnce({ rows: [existingInvoice] });

      const generateNumber = (invoiceService as any).generateInvoiceNumber.bind(invoiceService);
      const result = await generateNumber(mockClient, 'tenant-123');

      expect(result).toBe('INV20241200002');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Database connection failed'));

      await expect(invoiceService.getInvoiceById('invoice-123', mockUser))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle transaction rollback on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(invoiceService.createInvoice({
        invoiceNumber: 'INV20241200001',
        customerName: 'Test Customer',
        amount: 1000,
        totalAmount: 1100,
        dueDate: new Date(),
        tenantId: 'tenant-123',
      }, mockUser)).rejects.toThrow('Database error');

      // Should have attempted to rollback
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant isolation in all queries', async () => {
      // Test various operations
      const operations = [
        () => invoiceService.getInvoiceById('invoice-123', mockUser),
        () => invoiceService.getInvoiceByNumber('INV001', mockUser),
        () => invoiceService.updateInvoice('invoice-123', {}, mockUser),
        () => invoiceService.deleteInvoice('invoice-123', mockUser),
        () => invoiceService.listInvoices({}, mockUser),
      ];

      for (const operation of operations) {
        mockClient.query.mockResolvedValue({ rows: [] });
        
        try {
          await operation();
        } catch (error) {
          // Ignore errors, we're just checking the queries
        }

        // Check that tenant_id was included in the query
        const calls = mockClient.query.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[1]).toContain('tenant-123');
      }
    });
  });
});
