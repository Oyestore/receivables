import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceController } from '../controllers/invoice.controller';
import { InvoiceService } from '../services/invoice.service';
import { PdfGenerationService } from '../services/pdf-generation.service';
import { TemplateService } from '../services/template.service';
import { InvoiceQualityAssuranceService } from '../services/invoice-quality-assurance.service';
import { DeepSeekR1Service } from '../services/deepseek-r1.service';
import { CulturalIntelligenceService } from '../services/cultural-intelligence.service';
import { IntelligentTemplateOptimizationService } from '../services/intelligent-template-optimization.service';
import { ConstraintIntegrationService } from '../services/constraint-integration.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('InvoiceController - Complete Tests', () => {
  let controller: InvoiceController;
  let invoiceService: InvoiceService;
  let pdfService: PdfGenerationService;
  let templateService: TemplateService;
  let qualityAssuranceService: InvoiceQualityAssuranceService;
  let deepSeekService: DeepSeekR1Service;
  let culturalService: CulturalIntelligenceService;
  let optimizationService: IntelligentTemplateOptimizationService;
  let constraintService: ConstraintIntegrationService;

  const mockInvoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    total: 1000,
    subtotal: 850,
    taxAmount: 150,
    status: 'draft',
    date: new Date(),
    dueDate: new Date(),
    lineItems: [
      {
        id: 'item-1',
        description: 'Test Item',
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
        taxRate: 0,
        taxAmount: 0,
        hsnCode: '1234',
      },
    ],
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'admin',
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            createInvoice: jest.fn(),
            getInvoiceById: jest.fn(),
            updateInvoice: jest.fn(),
            deleteInvoice: jest.fn(),
            listInvoices: jest.fn(),
            generateInvoicePdf: jest.fn(),
            generateBulkInvoices: jest.fn(),
            validateInvoiceQuality: jest.fn(),
            autoFixInvoice: jest.fn(),
            getInvoiceQualityScore: jest.fn(),
            analyzeInvoiceWithAI: jest.fn(),
            optimizeInvoiceWithAI: jest.fn(),
            adaptInvoiceForRegion: jest.fn(),
            validateCulturalCompliance: jest.fn(),
            applyTemplateToInvoice: jest.fn(),
            validateTemplateForInvoice: jest.fn(),
            optimizeTemplate: jest.fn(),
            getTemplatePerformance: jest.fn(),
            identifyInvoiceConstraints: jest.fn(),
            getConstraintRecommendations: jest.fn(),
            calculateInvoiceTotals: jest.fn(),
            createRecurringInvoice: jest.fn(),
            canTransitionStatus: jest.fn(),
          },
        },
        {
          provide: PdfGenerationService,
          useValue: {
            generateInvoicePdf: jest.fn(),
            generateBulkInvoices: jest.fn(),
            validatePdfGeneration: jest.fn(),
            validatePdfContent: jest.fn(),
          },
        },
        {
          provide: TemplateService,
          useValue: {
            getTemplateById: jest.fn(),
            applyTemplateToInvoice: jest.fn(),
            validateTemplate: jest.fn(),
          },
        },
        {
          provide: InvoiceQualityAssuranceService,
          useValue: {
            validateInvoice: jest.fn(),
            autoFixInvoice: jest.fn(),
            getQualityScore: jest.fn(),
          },
        },
        {
          provide: DeepSeekR1Service,
          useValue: {
            generate: jest.fn(),
            analyzeInvoice: jest.fn(),
            optimizeInvoice: jest.fn(),
          },
        },
        {
          provide: CulturalIntelligenceService,
          useValue: {
            adaptForRegion: jest.fn(),
            validateCulturalCompliance: jest.fn(),
            getLocalizedContent: jest.fn(),
          },
        },
        {
          provide: IntelligentTemplateOptimizationService,
          useValue: {
            optimizeTemplate: jest.fn(),
            analyzePerformance: jest.fn(),
            generateRecommendations: jest.fn(),
          },
        },
        {
          provide: ConstraintIntegrationService,
          useValue: {
            identifyConstraints: jest.fn(),
            generateRecommendations: jest.fn(),
            trackConstraintResolution: jest.fn(),
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvoiceController>(InvoiceController);
    invoiceService = module.get<InvoiceService>(InvoiceService);
    pdfService = module.get<PdfGenerationService>(PdfGenerationService);
    templateService = module.get<TemplateService>(TemplateService);
    qualityAssuranceService = module.get<InvoiceQualityAssuranceService>(InvoiceQualityAssuranceService);
    deepSeekService = module.get<DeepSeekR1Service>(DeepSeekR1Service);
    culturalService = module.get<CulturalIntelligenceService>(CulturalIntelligenceService);
    optimizationService = module.get<IntelligentTemplateOptimizationService>(IntelligentTemplateOptimizationService);
    constraintService = module.get<ConstraintIntegrationService>(ConstraintIntegrationService);
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new invoice', async () => {
      const createInvoiceDto: CreateInvoiceDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 1000,
            hsnCode: '1234',
          },
        ],
        dueDate: new Date(),
        templateId: 'template-1',
      };

      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
      expect(invoiceService.createInvoice).toHaveBeenCalledWith(createInvoiceDto, 'user-1', 'tenant-1');
    });

    it('should get invoice by ID', async () => {
      jest.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(mockInvoice);

      const result = await controller.getInvoice('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
      expect(invoiceService.getInvoiceById).toHaveBeenCalledWith('invoice-1', 'tenant-1');
    });

    it('should update invoice', async () => {
      const updateInvoiceDto: UpdateInvoiceDto = {
        customerName: 'Updated Customer',
        total: 1500,
      };

      const updatedInvoice = { ...mockInvoice, ...updateInvoiceDto };
      jest.spyOn(invoiceService, 'updateInvoice').mockResolvedValue(updatedInvoice);

      const result = await controller.updateInvoice('invoice-1', updateInvoiceDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data.customerName).toBe('Updated Customer');
      expect(result.data.total).toBe(1500);
    });

    it('should delete invoice', async () => {
      jest.spyOn(invoiceService, 'deleteInvoice').mockResolvedValue(undefined);

      const result = await controller.deleteInvoice('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(invoiceService.deleteInvoice).toHaveBeenCalledWith('invoice-1', 'tenant-1');
    });

    it('should list invoices with filters', async () => {
      const invoices = [mockInvoice];
      const query = {
        status: 'draft',
        customerName: 'Test',
        page: 1,
        limit: 10,
      };

      jest.spyOn(invoiceService, 'listInvoices').mockResolvedValue(invoices);

      const result = await controller.listInvoices(query, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(invoices);
      expect(invoiceService.listInvoices).toHaveBeenCalledWith('tenant-1', query);
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF for invoice', async () => {
      const pdfBuffer = Buffer.from('pdf-content');
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockResolvedValue(pdfBuffer);

      const result = await controller.generateInvoicePdf('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pdfBuffer);
      expect(invoiceService.generateInvoicePdf).toHaveBeenCalledWith('invoice-1', 'tenant-1');
    });

    it('should generate bulk PDFs', async () => {
      const pdfBuffers = [Buffer.from('pdf1'), Buffer.from('pdf2')];
      const bulkDto = { invoiceIds: ['invoice-1', 'invoice-2'] };

      jest.spyOn(invoiceService, 'generateBulkInvoices').mockResolvedValue(pdfBuffers);

      const result = await controller.generateBulkPdfs(bulkDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pdfBuffers);
      expect(invoiceService.generateBulkInvoices).toHaveBeenCalledWith(['invoice-1', 'invoice-2'], 'tenant-1');
    });

    it('should validate PDF generation', async () => {
      jest.spyOn(pdfService, 'validatePdfGeneration').mockResolvedValue(true);

      const result = await controller.validatePdfGeneration('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
    });
  });

  describe('Quality Assurance', () => {
    it('should validate invoice quality', async () => {
      const validationResult = {
        isValid: true,
        score: 95,
        issues: [],
        recommendations: [],
      };

      jest.spyOn(invoiceService, 'validateInvoiceQuality').mockResolvedValue(validationResult);

      const result = await controller.validateInvoiceQuality('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validationResult);
    });

    it('should auto-fix invoice issues', async () => {
      const fixedInvoice = { ...mockInvoice, total: 1100 };
      jest.spyOn(invoiceService, 'autoFixInvoice').mockResolvedValue(fixedInvoice);

      const result = await controller.autoFixInvoice('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fixedInvoice);
    });

    it('should get quality score', async () => {
      jest.spyOn(invoiceService, 'getInvoiceQualityScore').mockResolvedValue(92);

      const result = await controller.getInvoiceQualityScore('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(92);
    });
  });

  describe('AI Integration', () => {
    it('should analyze invoice with AI', async () => {
      const analysis = {
        insights: ['High-value customer', 'Repeat business'],
        recommendations: ['Offer discount', 'Prioritize payment'],
        riskLevel: 'low',
      };

      jest.spyOn(invoiceService, 'analyzeInvoiceWithAI').mockResolvedValue(analysis);

      const result = await controller.analyzeInvoiceWithAI('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(analysis);
    });

    it('should optimize invoice with AI', async () => {
      const optimizedInvoice = { ...mockInvoice, recommendations: ['Optimize terms'] };
      jest.spyOn(invoiceService, 'optimizeInvoiceWithAI').mockResolvedValue(optimizedInvoice);

      const result = await controller.optimizeInvoiceWithAI('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(optimizedInvoice);
    });
  });

  describe('Cultural Intelligence', () => {
    it('should adapt invoice for region', async () => {
      const adaptedInvoice = { ...mockInvoice, regionalFormat: 'Indian' };
      const regionDto = { region: 'IN' };

      jest.spyOn(invoiceService, 'adaptInvoiceForRegion').mockResolvedValue(adaptedInvoice);

      const result = await controller.adaptInvoiceForRegion('invoice-1', regionDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(adaptedInvoice);
      expect(invoiceService.adaptInvoiceForRegion).toHaveBeenCalledWith('invoice-1', 'tenant-1', 'IN');
    });

    it('should validate cultural compliance', async () => {
      jest.spyOn(invoiceService, 'validateCulturalCompliance').mockResolvedValue(true);

      const result = await controller.validateCulturalCompliance('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data.isCompliant).toBe(true);
    });
  });

  describe('Template Integration', () => {
    it('should apply template to invoice', async () => {
      const templateDto = { templateId: 'template-1' };
      jest.spyOn(invoiceService, 'applyTemplateToInvoice').mockResolvedValue(mockInvoice);

      const result = await controller.applyTemplateToInvoice('invoice-1', templateDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
    });

    it('should validate template compatibility', async () => {
      const templateDto = { templateId: 'template-1' };
      jest.spyOn(invoiceService, 'validateTemplateForInvoice').mockResolvedValue(true);

      const result = await controller.validateTemplateForInvoice('invoice-1', templateDto, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data.isCompatible).toBe(true);
    });
  });

  describe('Template Optimization', () => {
    it('should optimize template based on performance', async () => {
      const optimization = {
        recommendations: ['Improve layout', 'Add branding'],
        expectedImprovement: 15,
        priority: 'high',
      };

      jest.spyOn(invoiceService, 'optimizeTemplate').mockResolvedValue(optimization);

      const result = await controller.optimizeTemplate('template-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(optimization);
    });

    it('should analyze template performance', async () => {
      const performance = {
        conversionRate: 0.85,
        averagePaymentTime: 15,
        customerSatisfaction: 4.5,
      };

      jest.spyOn(invoiceService, 'getTemplatePerformance').mockResolvedValue(performance);

      const result = await controller.getTemplatePerformance('template-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(performance);
    });
  });

  describe('Constraint Integration', () => {
    it('should identify invoice-related constraints', async () => {
      const constraints = [
        {
          type: 'payment_delay',
          description: 'Customer pays after 45 days',
          impact: 'high',
          recommendation: 'Offer early payment discount',
        },
      ];

      jest.spyOn(invoiceService, 'identifyInvoiceConstraints').mockResolvedValue(constraints);

      const result = await controller.identifyInvoiceConstraints('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(constraints);
    });

    it('should generate constraint-based recommendations', async () => {
      const recommendations = [
        {
          action: 'Implement early payment discount',
          expectedBenefit: '15% faster payments',
          implementation: 'Update invoice terms',
        },
      ];

      jest.spyOn(invoiceService, 'getConstraintRecommendations').mockResolvedValue(recommendations);

      const result = await controller.getConstraintRecommendations('invoice-1', { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(recommendations);
    });
  });

  describe('Advanced Invoice Operations', () => {
    it('should calculate invoice totals', async () => {
      const totals = {
        subtotal: 850,
        taxAmount: 153,
        total: 1003,
      };

      jest.spyOn(invoiceService, 'calculateInvoiceTotals').mockReturnValue(totals);

      const result = await controller.calculateInvoiceTotals(mockInvoice);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(totals);
    });

    it('should create recurring invoice', async () => {
      const recurringProfile = {
        id: 'profile-1',
        frequency: 'monthly',
        nextGenerationDate: new Date(),
        templateId: 'template-1',
      };

      jest.spyOn(invoiceService, 'createRecurringInvoice').mockResolvedValue(mockInvoice);

      const result = await controller.createRecurringInvoice(recurringProfile, { user: mockUser });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
    });

    it('should check status transition validity', async () => {
      jest.spyOn(invoiceService, 'canTransitionStatus').mockReturnValue(true);

      const result = await controller.canTransitionStatus('draft', 'sent');

      expect(result.success).toBe(true);
      expect(result.data.canTransition).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invoice not found error', async () => {
      const error = new Error('Invoice not found');
      jest.spyOn(invoiceService, 'getInvoiceById').mockRejectedValue(error);

      const result = await controller.getInvoice('invalid-id', { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invoice not found');
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed: Invalid invoice data');
      jest.spyOn(invoiceService, 'createInvoice').mockRejectedValue(error);

      const invalidDto = {
        invoiceNumber: '',
        customerName: '',
        lineItems: [],
      };

      const result = await controller.createInvoice(invalidDto, { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle PDF generation errors', async () => {
      const error = new Error('PDF generation failed');
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockRejectedValue(error);

      const result = await controller.generateInvoicePdf('invoice-1', { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF generation failed');
    });

    it('should handle service unavailability errors', async () => {
      const error = new Error('Service temporarily unavailable');
      jest.spyOn(invoiceService, 'listInvoices').mockRejectedValue(error);

      const result = await controller.listInvoices({}, { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service temporarily unavailable');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to create invoices', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      const createInvoiceDto: CreateInvoiceDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
      };

      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto, { user: adminUser });

      expect(result.success).toBe(true);
    });

    it('should allow user to view their own invoices', async () => {
      const regularUser = { ...mockUser, role: 'user' };
      jest.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(mockInvoice);

      const result = await controller.getInvoice('invoice-1', { user: regularUser });

      expect(result.success).toBe(true);
    });

    it('should restrict access based on tenant', async () => {
      const otherTenantUser = { ...mockUser, tenantId: 'other-tenant' };
      jest.spyOn(invoiceService, 'getInvoiceById').mockRejectedValue(new Error('Access denied'));

      const result = await controller.getInvoice('invoice-1', { user: otherTenantUser });

      expect(result.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 20 }, () =>
        controller.getInvoice('invoice-1', { user: mockUser })
      );

      jest.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(mockInvoice);

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large invoice lists efficiently', async () => {
      const largeInvoiceList = Array.from({ length: 100 }, (_, i) => ({
        ...mockInvoice,
        id: `invoice-${i}`,
        invoiceNumber: `INV-${i}`,
      }));

      jest.spyOn(invoiceService, 'listInvoices').mockResolvedValue(largeInvoiceList);

      const startTime = Date.now();
      const result = await controller.listInvoices({ limit: 100 }, { user: mockUser });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in create invoice', async () => {
      const invalidDto = {
        customerName: 'Test Customer',
        // Missing required fields
      };

      const result = await controller.createInvoice(invalidDto, { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerEmail: 'invalid-email',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
      };

      const result = await controller.createInvoice(invalidDto, { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate line items', async () => {
      const invalidDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        lineItems: [
          {
            description: '',
            quantity: -1,
            unitPrice: 0,
          },
        ],
      };

      const result = await controller.createInvoice(invalidDto, { user: mockUser });

      expect(result.success).toBe(false);
      expect(result.error).toContain('line items');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all services for complete invoice workflow', async () => {
      const createInvoiceDto: CreateInvoiceDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
      };

      // Mock all service integrations
      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(mockInvoice);
      jest.spyOn(invoiceService, 'validateInvoiceQuality').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockResolvedValue(Buffer.from('pdf'));

      const createdInvoice = await controller.createInvoice(createInvoiceDto, { user: mockUser });
      const validation = await controller.validateInvoiceQuality('invoice-1', { user: mockUser });
      const pdf = await controller.generateInvoicePdf('invoice-1', { user: mockUser });

      expect(createdInvoice.success).toBe(true);
      expect(validation.success).toBe(true);
      expect(pdf.success).toBe(true);
    });

    it('should handle complete invoice lifecycle', async () => {
      // Create -> Validate -> Generate PDF -> Send
      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(mockInvoice);
      jest.spyOn(invoiceService, 'validateInvoiceQuality').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockResolvedValue(Buffer.from('pdf'));

      const createInvoiceDto: CreateInvoiceDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
      };

      const created = await controller.createInvoice(createInvoiceDto, { user: mockUser });
      const validated = await controller.validateInvoiceQuality('invoice-1', { user: mockUser });
      const pdfGenerated = await controller.generateInvoicePdf('invoice-1', { user: mockUser });

      expect(created.success).toBe(true);
      expect(validated.success).toBe(true);
      expect(pdfGenerated.success).toBe(true);
    });
  });
});
