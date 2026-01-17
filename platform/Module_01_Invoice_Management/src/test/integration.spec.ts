import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { InvoiceService } from '../services/invoice.service';
import { PdfGenerationService } from '../services/pdf-generation.service';
import { TemplateService } from '../services/template.service';
import { InvoiceQualityAssuranceService } from '../services/invoice-quality-assurance.service';
import { DeepSeekR1Service } from '../services/deepseek-r1.service';
import { CulturalIntelligenceService } from '../services/cultural-intelligence.service';
import { IntelligentTemplateOptimizationService } from '../services/intelligent-template-optimization.service';
import { ConstraintIntegrationService } from '../services/constraint-integration.service';

describe('Module 01 Integration Tests - Complete Coverage', () => {
  let app: INestApplication;
  let invoiceService: InvoiceService;
  let pdfService: PdfGenerationService;
  let templateService: TemplateService;
  let qualityAssuranceService: InvoiceQualityAssuranceService;
  let deepSeekService: DeepSeekR1Service;
  let culturalService: CulturalIntelligenceService;
  let optimizationService: IntelligentTemplateOptimizationService;
  let constraintService: ConstraintIntegrationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InvoiceService)
      .useValue({
        createInvoice: jest.fn(),
        getInvoiceById: jest.fn(),
        updateInvoice: jest.fn(),
        deleteInvoice: jest.fn(),
        listInvoices: jest.fn(),
        generateInvoicePdf: jest.fn(),
        validateInvoiceQuality: jest.fn(),
        autoFixInvoice: jest.fn(),
        analyzeInvoiceWithAI: jest.fn(),
        optimizeInvoiceWithAI: jest.fn(),
        adaptInvoiceForRegion: jest.fn(),
        applyTemplateToInvoice: jest.fn(),
        optimizeTemplate: jest.fn(),
        identifyInvoiceConstraints: jest.fn(),
      })
      .overrideProvider(PdfGenerationService)
      .useValue({
        generateInvoicePdf: jest.fn(),
        generateBulkInvoices: jest.fn(),
        validatePdfGeneration: jest.fn(),
      })
      .overrideProvider(TemplateService)
      .useValue({
        getTemplateById: jest.fn(),
        applyTemplateToInvoice: jest.fn(),
        validateTemplate: jest.fn(),
      })
      .overrideProvider(InvoiceQualityAssuranceService)
      .useValue({
        validateInvoice: jest.fn(),
        autoFixInvoice: jest.fn(),
        getQualityScore: jest.fn(),
      })
      .overrideProvider(DeepSeekR1Service)
      .useValue({
        generate: jest.fn(),
        analyzeInvoice: jest.fn(),
        optimizeInvoice: jest.fn(),
      })
      .overrideProvider(CulturalIntelligenceService)
      .useValue({
        adaptForRegion: jest.fn(),
        validateCulturalCompliance: jest.fn(),
        getLocalizedContent: jest.fn(),
      })
      .overrideProvider(IntelligentTemplateOptimizationService)
      .useValue({
        optimizeTemplate: jest.fn(),
        analyzePerformance: jest.fn(),
        generateRecommendations: jest.fn(),
      })
      .overrideProvider(ConstraintIntegrationService)
      .useValue({
        identifyConstraints: jest.fn(),
        generateRecommendations: jest.fn(),
        trackConstraintResolution: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    invoiceService = moduleFixture.get<InvoiceService>(InvoiceService);
    pdfService = moduleFixture.get<PdfGenerationService>(PdfGenerationService);
    templateService = moduleFixture.get<TemplateService>(TemplateService);
    qualityAssuranceService = moduleFixture.get<InvoiceQualityAssuranceService>(InvoiceQualityAssuranceService);
    deepSeekService = moduleFixture.get<DeepSeekR1Service>(DeepSeekR1Service);
    culturalService = moduleFixture.get<CulturalIntelligenceService>(CulturalIntelligenceService);
    optimizationService = moduleFixture.get<IntelligentTemplateOptimizationService>(IntelligentTemplateOptimizationService);
    constraintService = moduleFixture.get<ConstraintIntegrationService>(ConstraintIntegrationService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invoice Management Integration', () => {
    it('POST /invoices - should create a new invoice', async () => {
      const invoiceData = {
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
        dueDate: '2024-02-11',
        templateId: 'template-1',
      };

      const mockInvoice = {
        id: 'invoice-1',
        ...invoiceData,
        total: 1180,
        subtotal: 1000,
        taxAmount: 180,
        status: 'draft',
        createdAt: new Date(),
      };

      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', 'Bearer valid-token')
        .send(invoiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('invoice-1');
      expect(response.body.data.total).toBe(1180);
    });

    it('GET /invoices/:id - should retrieve invoice by ID', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        total: 1180,
        status: 'sent',
      };

      jest.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('invoice-1');
      expect(response.body.data.status).toBe('sent');
    });

    it('PUT /invoices/:id - should update invoice', async () => {
      const updateData = {
        customerName: 'Updated Customer',
        total: 1500,
      };

      const updatedInvoice = {
        id: 'invoice-1',
        ...updateData,
        updatedAt: new Date(),
      };

      jest.spyOn(invoiceService, 'updateInvoice').mockResolvedValue(updatedInvoice);

      const response = await request(app.getHttpServer())
        .put('/invoices/invoice-1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customerName).toBe('Updated Customer');
    });

    it('DELETE /invoices/:id - should delete invoice', async () => {
      jest.spyOn(invoiceService, 'deleteInvoice').mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/invoices/invoice-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /invoices - should list invoices with filters', async () => {
      const mockInvoices = [
        {
          id: 'invoice-1',
          invoiceNumber: 'INV-001',
          customerName: 'Customer 1',
          status: 'sent',
        },
        {
          id: 'invoice-2',
          invoiceNumber: 'INV-002',
          customerName: 'Customer 2',
          status: 'paid',
        },
      ];

      jest.spyOn(invoiceService, 'listInvoices').mockResolvedValue(mockInvoices);

      const response = await request(app.getHttpServer())
        .get('/invoices?status=sent&page=1&limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PDF Generation Integration', () => {
    it('POST /invoices/:id/pdf - should generate PDF', async () => {
      const pdfBuffer = Buffer.from('pdf-content');
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockResolvedValue(pdfBuffer);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/pdf')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('POST /invoices/bulk-pdf - should generate bulk PDFs', async () => {
      const bulkData = { invoiceIds: ['invoice-1', 'invoice-2'] };
      const pdfBuffers = [Buffer.from('pdf1'), Buffer.from('pdf2')];

      jest.spyOn(invoiceService, 'generateBulkInvoices').mockResolvedValue(pdfBuffers);

      const response = await request(app.getHttpServer())
        .post('/invoices/bulk-pdf')
        .set('Authorization', 'Bearer valid-token')
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('GET /invoices/:id/pdf/validate - should validate PDF', async () => {
      jest.spyOn(pdfService, 'validatePdfGeneration').mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1/pdf/validate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });
  });

  describe('Quality Assurance Integration', () => {
    it('POST /invoices/:id/quality/validate - should validate invoice quality', async () => {
      const validationResult = {
        isValid: true,
        score: 95,
        issues: [],
        recommendations: [],
      };

      jest.spyOn(invoiceService, 'validateInvoiceQuality').mockResolvedValue(validationResult);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/quality/validate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(95);
    });

    it('POST /invoices/:id/quality/fix - should auto-fix invoice', async () => {
      const fixedInvoice = {
        id: 'invoice-1',
        total: 1180,
        status: 'fixed',
      };

      jest.spyOn(invoiceService, 'autoFixInvoice').mockResolvedValue(fixedInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/quality/fix')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1180);
    });

    it('GET /invoices/:id/quality/score - should get quality score', async () => {
      jest.spyOn(invoiceService, 'getInvoiceQualityScore').mockResolvedValue(92);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1/quality/score')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(92);
    });
  });

  describe('AI Integration', () => {
    it('POST /invoices/:id/ai/analyze - should analyze invoice with AI', async () => {
      const analysis = {
        insights: ['High-value customer', 'Repeat business'],
        recommendations: ['Offer discount', 'Prioritize payment'],
        riskLevel: 'low',
      };

      jest.spyOn(invoiceService, 'analyzeInvoiceWithAI').mockResolvedValue(analysis);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/ai/analyze')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.insights).toHaveLength(2);
    });

    it('POST /invoices/:id/ai/optimize - should optimize invoice with AI', async () => {
      const optimizedInvoice = {
        id: 'invoice-1',
        recommendations: ['Optimize terms', 'Add branding'],
        expectedImprovement: 15,
      };

      jest.spyOn(invoiceService, 'optimizeInvoiceWithAI').mockResolvedValue(optimizedInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/ai/optimize')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toHaveLength(2);
    });
  });

  describe('Cultural Intelligence Integration', () => {
    it('POST /invoices/:id/cultural/adapt - should adapt invoice for region', async () => {
      const adaptedInvoice = {
        id: 'invoice-1',
        regionalFormat: 'Indian',
        localizedContent: {
          'invoice.title': 'चालान',
          'total.amount': 'कुल राशि',
        },
      };

      jest.spyOn(invoiceService, 'adaptInvoiceForRegion').mockResolvedValue(adaptedInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/cultural/adapt')
        .set('Authorization', 'Bearer valid-token')
        .send({ region: 'IN' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.regionalFormat).toBe('Indian');
    });

    it('GET /invoices/:id/cultural/compliance - should validate cultural compliance', async () => {
      jest.spyOn(invoiceService, 'validateCulturalCompliance').mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1/cultural/compliance')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isCompliant).toBe(true);
    });
  });

  describe('Template Integration', () => {
    it('POST /invoices/:id/template/apply - should apply template to invoice', async () => {
      const templateInvoice = {
        id: 'invoice-1',
        templateId: 'template-1',
        appliedAt: new Date(),
      };

      jest.spyOn(invoiceService, 'applyTemplateToInvoice').mockResolvedValue(templateInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/template/apply')
        .set('Authorization', 'Bearer valid-token')
        .send({ templateId: 'template-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templateId).toBe('template-1');
    });

    it('POST /invoices/:id/template/validate - should validate template compatibility', async () => {
      jest.spyOn(invoiceService, 'validateTemplateForInvoice').mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/template/validate')
        .set('Authorization', 'Bearer valid-token')
        .send({ templateId: 'template-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isCompatible).toBe(true);
    });
  });

  describe('Template Optimization Integration', () => {
    it('POST /templates/:id/optimize - should optimize template', async () => {
      const optimization = {
        recommendations: ['Improve layout', 'Add branding'],
        expectedImprovement: 15,
        priority: 'high',
      };

      jest.spyOn(invoiceService, 'optimizeTemplate').mockResolvedValue(optimization);

      const response = await request(app.getHttpServer())
        .post('/templates/template-1/optimize')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toHaveLength(2);
    });

    it('GET /templates/:id/performance - should get template performance', async () => {
      const performance = {
        conversionRate: 0.85,
        averagePaymentTime: 15,
        customerSatisfaction: 4.5,
      };

      jest.spyOn(invoiceService, 'getTemplatePerformance').mockResolvedValue(performance);

      const response = await request(app.getHttpServer())
        .get('/templates/template-1/performance')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversionRate).toBe(0.85);
    });
  });

  describe('Constraint Integration', () => {
    it('GET /invoices/:id/constraints - should identify invoice constraints', async () => {
      const constraints = [
        {
          type: 'payment_delay',
          description: 'Customer pays after 45 days',
          impact: 'high',
          recommendation: 'Offer early payment discount',
        },
      ];

      jest.spyOn(invoiceService, 'identifyInvoiceConstraints').mockResolvedValue(constraints);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1/constraints')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('GET /invoices/:id/constraints/recommendations - should get constraint recommendations', async () => {
      const recommendations = [
        {
          action: 'Implement early payment discount',
          expectedBenefit: '15% faster payments',
          implementation: 'Update invoice terms',
        },
      ];

      jest.spyOn(invoiceService, 'getConstraintRecommendations').mockResolvedValue(recommendations);

      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1/constraints/recommendations')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Advanced Operations Integration', () => {
    it('POST /invoices/:id/calculate-totals - should calculate invoice totals', async () => {
      const totals = {
        subtotal: 1000,
        taxAmount: 180,
        total: 1180,
      };

      jest.spyOn(invoiceService, 'calculateInvoiceTotals').mockReturnValue(totals);

      const response = await request(app.getHttpServer())
        .post('/invoices/invoice-1/calculate-totals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          lineItems: [
            { quantity: 1, unitPrice: 1000, taxRate: 0.18 },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1180);
    });

    it('POST /invoices/recurring - should create recurring invoice', async () => {
      const recurringProfile = {
        id: 'profile-1',
        frequency: 'monthly',
        nextGenerationDate: new Date(),
        templateId: 'template-1',
      };

      const recurringInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-001',
        recurringProfileId: 'profile-1',
      };

      jest.spyOn(invoiceService, 'createRecurringInvoice').mockResolvedValue(recurringInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/recurring')
        .set('Authorization', 'Bearer valid-token')
        .send(recurringProfile)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recurringProfileId).toBe('profile-1');
    });

    it('GET /invoices/status-transition/:from/:to - should check status transition validity', async () => {
      jest.spyOn(invoiceService, 'canTransitionStatus').mockReturnValue(true);

      const response = await request(app.getHttpServer())
        .get('/invoices/status-transition/draft/sent')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canTransition).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invoice not found error', async () => {
      jest.spyOn(invoiceService, 'getInvoiceById').mockRejectedValue(new Error('Invoice not found'));

      const response = await request(app.getHttpServer())
        .get('/invoices/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invoice not found');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        invoiceNumber: '',
        customerName: '',
        lineItems: [],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices/invoice-1')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('unauthorized');
    });

    it('should handle service unavailability', async () => {
      jest.spyOn(invoiceService, 'listInvoices').mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service unavailable');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
      };

      jest.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(mockInvoice);

      const requests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .get('/invoices/invoice-1')
          .set('Authorization', 'Bearer valid-token')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(responses).toHaveLength(20);
      expect(responses.every(res => res.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large invoice lists efficiently', async () => {
      const largeInvoiceList = Array.from({ length: 100 }, (_, i) => ({
        id: `invoice-${i}`,
        invoiceNumber: `INV-${i}`,
        customerName: `Customer ${i}`,
      }));

      jest.spyOn(invoiceService, 'listInvoices').mockResolvedValue(largeInvoiceList);

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/invoices?limit=100')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle bulk PDF generation efficiently', async () => {
      const bulkData = { invoiceIds: Array.from({ length: 50 }, (_, i) => `invoice-${i}`) };
      const pdfBuffers = Array.from({ length: 50 }, () => Buffer.from('pdf-content'));

      jest.spyOn(invoiceService, 'generateBulkInvoices').mockResolvedValue(pdfBuffers);

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/invoices/bulk-pdf')
        .set('Authorization', 'Bearer valid-token')
        .send(bulkData)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should handle complete invoice lifecycle', async () => {
      // Create invoice
      const invoiceData = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
      };

      const createdInvoice = {
        id: 'invoice-1',
        ...invoiceData,
        total: 1180,
        status: 'draft',
      };

      jest.spyOn(invoiceService, 'createInvoice').mockResolvedValue(createdInvoice);
      jest.spyOn(invoiceService, 'validateInvoiceQuality').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(invoiceService, 'generateInvoicePdf').mockResolvedValue(Buffer.from('pdf'));
      jest.spyOn(invoiceService, 'updateInvoice').mockResolvedValue({ ...createdInvoice, status: 'sent' });

      // Create invoice
      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', 'Bearer valid-token')
        .send(invoiceData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.status).toBe('draft');

      // Validate quality
      const validateResponse = await request(app.getHttpServer())
        .post('/invoices/invoice-1/quality/validate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.score).toBe(95);

      // Generate PDF
      const pdfResponse = await request(app.getHttpServer())
        .post('/invoices/invoice-1/pdf')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(pdfResponse.body.success).toBe(true);

      // Send invoice
      const sendResponse = await request(app.getHttpServer())
        .put('/invoices/invoice-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'sent' })
        .expect(200);

      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.data.status).toBe('sent');
    });

    it('should integrate all AI services for invoice optimization', async () => {
      const invoiceId = 'invoice-1';

      // Mock all AI services
      jest.spyOn(invoiceService, 'analyzeInvoiceWithAI').mockResolvedValue({
        insights: ['High-value customer'],
        recommendations: ['Offer discount'],
      });

      jest.spyOn(invoiceService, 'optimizeInvoiceWithAI').mockResolvedValue({
        recommendations: ['Optimize terms'],
        expectedImprovement: 15,
      });

      jest.spyOn(invoiceService, 'adaptInvoiceForRegion').mockResolvedValue({
        regionalFormat: 'Indian',
        localizedContent: { 'invoice.title': 'चालान' },
      });

      jest.spyOn(invoiceService, 'identifyInvoiceConstraints').mockResolvedValue([
        { type: 'payment_delay', impact: 'high' },
      ]);

      // Analyze invoice
      const analysisResponse = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/ai/analyze`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);

      // Optimize invoice
      const optimizeResponse = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/ai/optimize`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(optimizeResponse.body.success).toBe(true);

      // Adapt for region
      const adaptResponse = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/cultural/adapt`)
        .set('Authorization', 'Bearer valid-token')
        .send({ region: 'IN' })
        .expect(200);

      expect(adaptResponse.body.success).toBe(true);

      // Identify constraints
      const constraintsResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}/constraints`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(constraintsResponse.body.success).toBe(true);
      expect(constraintsResponse.body.data).toHaveLength(1);
    });
  });
});
