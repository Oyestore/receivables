import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceService } from '../services/invoice.service';
import { Invoice } from '../invoice.entity';
import { InvoiceLineItem } from '../invoice-line-item.entity';
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

describe('InvoiceService - Complete Tests', () => {
  let service: InvoiceService;
  let invoiceRepository: Repository<Invoice>;
  let lineItemRepository: Repository<InvoiceLineItem>;
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
    subtotal: 1000,
    taxAmount: 0,
    status: 'draft',
    date: new Date(),
    dueDate: new Date(),
    lineItems: [],
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLineItem = {
    id: 'item-1',
    invoiceId: 'invoice-1',
    description: 'Test Item',
    quantity: 1,
    unitPrice: 1000,
    totalPrice: 1000,
    taxRate: 0,
    taxAmount: 0,
    hsnCode: '1234',
    sacCode: '5678',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getRepositoryToken(InvoiceEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceLineItemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PdfGenerationService,
          useValue: {
            generateInvoicePdf: jest.fn(),
            generateBulkInvoices: jest.fn(),
            validatePdfGeneration: jest.fn(),
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
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepository = module.get<Repository<InvoiceEntity>>(getRepositoryToken(InvoiceEntity));
    lineItemRepository = module.get<Repository<InvoiceLineItemEntity>>(getRepositoryToken(InvoiceLineItemEntity));
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

      jest.spyOn(invoiceRepository, 'create').mockReturnValue(mockInvoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(mockInvoice);
      jest.spyOn(lineItemRepository, 'create').mockReturnValue(mockLineItem);
      jest.spyOn(lineItemRepository, 'save').mockResolvedValue(mockLineItem);

      const result = await service.createInvoice(createInvoiceDto, 'user-1', 'tenant-1');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalled();
      expect(invoiceRepository.save).toHaveBeenCalled();
    });

    it('should get invoice by ID', async () => {
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceById('invoice-1', 'tenant-1');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'invoice-1', tenantId: 'tenant-1' },
        relations: ['lineItems'],
      });
    });

    it('should update invoice', async () => {
      const updateInvoiceDto: UpdateInvoiceDto = {
        customerName: 'Updated Customer',
        total: 1500,
      };

      const updatedInvoice = { ...mockInvoice, ...updateInvoiceDto };
      jest.spyOn(invoiceRepository, 'update').mockResolvedValue(undefined);
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(updatedInvoice);

      const result = await service.updateInvoice('invoice-1', updateInvoiceDto, 'tenant-1');

      expect(result.customerName).toBe('Updated Customer');
      expect(result.total).toBe(1500);
    });

    it('should delete invoice', async () => {
      jest.spyOn(invoiceRepository, 'delete').mockResolvedValue({ affected: 1 });

      await service.deleteInvoice('invoice-1', 'tenant-1');

      expect(invoiceRepository.delete).toHaveBeenCalledWith({
        id: 'invoice-1',
        tenantId: 'tenant-1',
      });
    });

    it('should list invoices with filters', async () => {
      const invoices = [mockInvoice];
      jest.spyOn(invoiceRepository, 'find').mockResolvedValue(invoices);

      const result = await service.listInvoices('tenant-1', {
        status: 'draft',
        customerName: 'Test',
      });

      expect(result).toEqual(invoices);
      expect(invoiceRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          status: 'draft',
          customerName: 'Test',
        },
        relations: ['lineItems'],
      });
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF for invoice', async () => {
      const pdfBuffer = Buffer.from('pdf content');
      jest.spyOn(pdfService, 'generateInvoicePdf').mockResolvedValue(pdfBuffer);

      const result = await service.generateInvoicePdf('invoice-1', 'tenant-1');

      expect(result).toBe(pdfBuffer);
      expect(pdfService.generateInvoicePdf).toHaveBeenCalledWith(mockInvoice);
    });

    it('should generate bulk PDFs', async () => {
      const pdfBuffers = [Buffer.from('pdf1'), Buffer.from('pdf2')];
      jest.spyOn(invoiceRepository, 'find').mockResolvedValue([mockInvoice, mockInvoice]);
      jest.spyOn(pdfService, 'generateBulkInvoices').mockResolvedValue(pdfBuffers);

      const result = await service.generateBulkInvoices(['invoice-1', 'invoice-2'], 'tenant-1');

      expect(result).toEqual(pdfBuffers);
      expect(pdfService.generateBulkInvoices).toHaveBeenCalled();
    });

    it('should validate PDF generation', async () => {
      jest.spyOn(pdfService, 'validatePdfGeneration').mockResolvedValue(true);

      const result = await service.validatePdfGeneration('invoice-1', 'tenant-1');

      expect(result).toBe(true);
    });
  });

  describe('Quality Assurance Integration', () => {
    it('should validate invoice quality', async () => {
      const validationResult = {
        isValid: true,
        score: 95,
        issues: [],
        recommendations: [],
      };

      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue(validationResult);

      const result = await service.validateInvoiceQuality('invoice-1', 'tenant-1');

      expect(result).toEqual(validationResult);
      expect(qualityAssuranceService.validateInvoice).toHaveBeenCalledWith(mockInvoice);
    });

    it('should auto-fix invoice issues', async () => {
      const fixedInvoice = { ...mockInvoice, total: 1100 };
      jest.spyOn(qualityAssuranceService, 'autoFixInvoice').mockResolvedValue(fixedInvoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(fixedInvoice);

      const result = await service.autoFixInvoice('invoice-1', 'tenant-1');

      expect(result).toEqual(fixedInvoice);
      expect(qualityAssuranceService.autoFixInvoice).toHaveBeenCalled();
    });

    it('should get quality score', async () => {
      jest.spyOn(qualityAssuranceService, 'getQualityScore').mockResolvedValue(92);

      const result = await service.getInvoiceQualityScore('invoice-1', 'tenant-1');

      expect(result).toBe(92);
    });
  });

  describe('AI Integration', () => {
    it('should analyze invoice with AI', async () => {
      const analysis = {
        insights: ['High-value customer', 'Repeat business'],
        recommendations: ['Offer discount', 'Prioritize payment'],
        riskLevel: 'low',
      };

      jest.spyOn(deepSeekService, 'analyzeInvoice').mockResolvedValue(analysis);

      const result = await service.analyzeInvoiceWithAI('invoice-1', 'tenant-1');

      expect(result).toEqual(analysis);
      expect(deepSeekService.analyzeInvoice).toHaveBeenCalledWith(mockInvoice);
    });

    it('should optimize invoice with AI', async () => {
      const optimizedInvoice = { ...mockInvoice, recommendations: ['Optimize terms'] };
      jest.spyOn(deepSeekService, 'optimizeInvoice').mockResolvedValue(optimizedInvoice);

      const result = await service.optimizeInvoiceWithAI('invoice-1', 'tenant-1');

      expect(result).toEqual(optimizedInvoice);
    });
  });

  describe('Cultural Intelligence', () => {
    it('should adapt invoice for region', async () => {
      const adaptedInvoice = { ...mockInvoice, regionalFormat: 'Indian' };
      jest.spyOn(culturalService, 'adaptForRegion').mockResolvedValue(adaptedInvoice);

      const result = await service.adaptInvoiceForRegion('invoice-1', 'tenant-1', 'IN');

      expect(result).toEqual(adaptedInvoice);
      expect(culturalService.adaptForRegion).toHaveBeenCalledWith(mockInvoice, 'IN');
    });

    it('should validate cultural compliance', async () => {
      jest.spyOn(culturalService, 'validateCulturalCompliance').mockResolvedValue(true);

      const result = await service.validateCulturalCompliance('invoice-1', 'tenant-1');

      expect(result).toBe(true);
    });
  });

  describe('Template Integration', () => {
    it('should apply template to invoice', async () => {
      const template = { id: 'template-1', name: 'Standard Template' };
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(template);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue(mockInvoice);

      const result = await service.applyTemplateToInvoice('invoice-1', 'template-1', 'tenant-1');

      expect(result).toEqual(mockInvoice);
      expect(templateService.applyTemplateToInvoice).toHaveBeenCalled();
    });

    it('should validate template compatibility', async () => {
      jest.spyOn(templateService, 'validateTemplate').mockResolvedValue(true);

      const result = await service.validateTemplateForInvoice('invoice-1', 'template-1', 'tenant-1');

      expect(result).toBe(true);
    });
  });

  describe('Template Optimization', () => {
    it('should optimize template based on performance', async () => {
      const optimization = {
        recommendations: ['Improve layout', 'Add branding'],
        expectedImprovement: 15,
        priority: 'high',
      };

      jest.spyOn(optimizationService, 'optimizeTemplate').mockResolvedValue(optimization);

      const result = await service.optimizeTemplate('template-1', 'tenant-1');

      expect(result).toEqual(optimization);
    });

    it('should analyze template performance', async () => {
      const performance = {
        conversionRate: 0.85,
        averagePaymentTime: 15,
        customerSatisfaction: 4.5,
      };

      jest.spyOn(optimizationService, 'analyzePerformance').mockResolvedValue(performance);

      const result = await service.getTemplatePerformance('template-1', 'tenant-1');

      expect(result).toEqual(performance);
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

      jest.spyOn(constraintService, 'identifyConstraints').mockResolvedValue(constraints);

      const result = await service.identifyInvoiceConstraints('invoice-1', 'tenant-1');

      expect(result).toEqual(constraints);
    });

    it('should generate constraint-based recommendations', async () => {
      const recommendations = [
        {
          action: 'Implement early payment discount',
          expectedBenefit: '15% faster payments',
          implementation: 'Update invoice terms',
        },
      ];

      jest.spyOn(constraintService, 'generateRecommendations').mockResolvedValue(recommendations);

      const result = await service.getConstraintRecommendations('invoice-1', 'tenant-1');

      expect(result).toEqual(recommendations);
    });
  });

  describe('Advanced Invoice Operations', () => {
    it('should calculate invoice totals correctly', async () => {
      const invoiceWithItems = {
        ...mockInvoice,
        lineItems: [
          { quantity: 2, unitPrice: 100, taxRate: 0.18 },
          { quantity: 1, unitPrice: 500, taxRate: 0.18 },
        ],
      };

      const totals = service.calculateInvoiceTotals(invoiceWithItems);

      expect(totals.subtotal).toBe(700);
      expect(totals.taxAmount).toBe(126);
      expect(totals.total).toBe(826);
    });

    it('should handle recurring invoice creation', async () => {
      const recurringProfile = {
        id: 'profile-1',
        frequency: 'monthly',
        nextGenerationDate: new Date(),
        templateId: 'template-1',
      };

      jest.spyOn(invoiceRepository, 'create').mockReturnValue(mockInvoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(mockInvoice);

      const result = await service.createRecurringInvoice(recurringProfile, 'tenant-1');

      expect(result).toEqual(mockInvoice);
    });

    it('should handle invoice status transitions', async () => {
      const transitions = [
        { from: 'draft', to: 'sent', allowed: true },
        { from: 'sent', to: 'paid', allowed: true },
        { from: 'paid', to: 'draft', allowed: false },
      ];

      transitions.forEach(({ from, to, allowed }) => {
        const result = service.canTransitionStatus(from, to);
        expect(result).toBe(allowed);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invoice not found', async () => {
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getInvoiceById('invalid-id', 'tenant-1'))
        .rejects.toThrow('Invoice not found');
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        invoiceNumber: '',
        customerName: '',
        lineItems: [],
      };

      await expect(service.createInvoice(invalidDto, 'user-1', 'tenant-1'))
        .rejects.toThrow();
    });

    it('should handle PDF generation errors', async () => {
      jest.spyOn(pdfService, 'generateInvoicePdf').mockRejectedValue(new Error('PDF generation failed'));

      await expect(service.generateInvoicePdf('invoice-1', 'tenant-1'))
        .rejects.toThrow('PDF generation failed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk invoice creation efficiently', async () => {
      const bulkData = Array.from({ length: 100 }, (_, i) => ({
        invoiceNumber: `INV-${i}`,
        customerName: `Customer ${i}`,
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      }));

      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(mockInvoice);

      const startTime = Date.now();
      const results = await Promise.all(
        bulkData.map(dto => service.createInvoice(dto, 'user-1', 'tenant-1'))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent invoice operations', async () => {
      const operations = Array.from({ length: 20 }, (_, i) =>
        service.getInvoiceById('invoice-1', 'tenant-1')
      );

      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(mockInvoice);

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.id === 'invoice-1')).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with all services for invoice creation', async () => {
      const createInvoiceDto: CreateInvoiceDto = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        templateId: 'template-1',
      };

      // Mock all service integrations
      jest.spyOn(invoiceRepository, 'create').mockReturnValue(mockInvoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(mockInvoice);
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(culturalService, 'adaptForRegion').mockResolvedValue(mockInvoice);
      jest.spyOn(optimizationService, 'optimizeTemplate').mockResolvedValue({ recommendations: [] });

      const result = await service.createInvoice(createInvoiceDto, 'user-1', 'tenant-1');

      expect(result).toEqual(mockInvoice);
      expect(qualityAssuranceService.validateInvoice).toHaveBeenCalled();
      expect(culturalService.adaptForRegion).toHaveBeenCalled();
    });

    it('should handle complete invoice lifecycle', async () => {
      // Create -> Validate -> Generate PDF -> Send
      jest.spyOn(invoiceRepository, 'create').mockReturnValue(mockInvoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(mockInvoice);
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(pdfService, 'generateInvoicePdf').mockResolvedValue(Buffer.from('pdf'));

      const invoice = await service.createInvoice({
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      }, 'user-1', 'tenant-1');

      const validation = await service.validateInvoiceQuality(invoice.id, 'tenant-1');
      const pdf = await service.generateInvoicePdf(invoice.id, 'tenant-1');

      expect(invoice.id).toBe('invoice-1');
      expect(validation.isValid).toBe(true);
      expect(pdf).toBeInstanceOf(Buffer);
    });
  });
});
