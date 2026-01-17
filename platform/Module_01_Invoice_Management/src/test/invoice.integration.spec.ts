import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { InvoiceModule } from '../invoice.module';
import { DeepSeekR1Service } from '../services/deepseek-r1.service';
import { InvoiceQualityAssuranceService } from '../services/invoice-quality-assurance.service';

describe('Invoice API Integration Tests', () => {
  let app: INestApplication;
  let deepSeekService: DeepSeekR1Service;
  let qualityAssuranceService: InvoiceQualityAssuranceService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InvoiceModule],
    })
    .overrideProvider(DeepSeekR1Service)
    .useValue({
      generate: jest.fn().mockResolvedValue({
        text: 'AI analysis complete',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        model: 'deepseek-r1',
        finishReason: 'stop',
      }),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    deepSeekService = moduleFixture.get<DeepSeekR1Service>(DeepSeekR1Service);
    qualityAssuranceService = moduleFixture.get<InvoiceQualityAssuranceService>(InvoiceQualityAssuranceService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invoice Endpoints', () => {
    it('POST /invoices - should create a new invoice', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        total: 1000,
        date: '2025-01-12',
        dueDate: '2025-02-11',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 18,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .send(invoiceData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.invoiceNumber).toBe(invoiceData.invoiceNumber);
          expect(res.body.data.customerName).toBe(invoiceData.customerName);
        });
    });

    it('GET /invoices/:id - should retrieve an invoice', async () => {
      // First create an invoice
      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .send({
          invoiceNumber: 'INV-002',
          customerName: 'Test Customer 2',
          customerEmail: 'test2@example.com',
          total: 2000,
          date: '2025-01-12',
          dueDate: '2025-02-11',
        });

      const invoiceId = createResponse.body.data.id;

      return request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('x-api-key', 'test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(invoiceId);
        });
    });

    it('PUT /invoices/:id - should update an invoice', async () => {
      // First create an invoice
      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .send({
          invoiceNumber: 'INV-003',
          customerName: 'Test Customer 3',
          customerEmail: 'test3@example.com',
          total: 3000,
          date: '2025-01-12',
          dueDate: '2025-02-11',
        });

      const invoiceId = createResponse.body.data.id;

      const updateData = {
        customerName: 'Updated Customer Name',
        total: 3500,
      };

      return request(app.getHttpServer())
        .put(`/invoices/${invoiceId}`)
        .set('x-api-key', 'test-key')
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.customerName).toBe(updateData.customerName);
          expect(res.body.data.total).toBe(updateData.total);
        });
    });
  });

  describe('AI Services Endpoints', () => {
    it('POST /ai-invoice/analyze-quality - should analyze invoice quality', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-TEST',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        total: 1000,
        date: '2025-01-12',
        dueDate: '2025-02-11',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 18,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/ai-invoice/analyze-quality')
        .set('x-api-key', 'test-key')
        .send(invoiceData)
        .expect(200)
        .expect((res) => {
          expect(res.body.score).toBeDefined();
          expect(res.body.issues).toBeDefined();
          expect(res.body.improvements).toBeDefined();
          expect(typeof res.body.score).toBe('number');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(Array.isArray(res.body.improvements)).toBe(true);
        });
    });

    it('POST /ai-invoice/auto-fix - should auto-fix invoice issues', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-TEST-FIX',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        total: 999.999, // This should be fixed to 1000
        date: '2025-01-12',
        dueDate: '2025-02-11',
      };

      return request(app.getHttpServer())
        .post('/ai-invoice/auto-fix')
        .set('x-api-key', 'test-key')
        .send(invoiceData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBeDefined();
          expect(res.body.fixedIssues).toBeDefined();
          expect(res.body.remainingIssues).toBeDefined();
          expect(res.body.updatedData).toBeDefined();
          expect(Array.isArray(res.body.fixedIssues)).toBe(true);
        });
    });

    it('POST /ai-invoice/validate-for-sending - should validate invoice for sending', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-TEST-VALIDATE',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        total: 1000,
        date: '2025-01-12',
        dueDate: '2025-02-11',
      };

      return request(app.getHttpServer())
        .post('/ai-invoice/validate-for-sending')
        .set('x-api-key', 'test-key')
        .send(invoiceData)
        .expect(200)
        .expect((res) => {
          expect(res.body.canSend).toBeDefined();
          expect(res.body.blockedBy).toBeDefined();
          expect(res.body.warnings).toBeDefined();
          expect(res.body.recommendations).toBeDefined();
          expect(typeof res.body.canSend).toBe('boolean');
          expect(Array.isArray(res.body.blockedBy)).toBe(true);
        });
    });
  });

  describe('Template Intelligence Endpoints', () => {
    it('POST /ai-invoice/template-analyze - should analyze template performance', async () => {
      return request(app.getHttpServer())
        .post('/ai-invoice/template-analyze')
        .set('x-api-key', 'test-key')
        .send({ templateId: 'template-001' })
        .expect(200)
        .expect((res) => {
          expect(res.body.currentMetrics).toBeDefined();
          expect(res.body.suggestions).toBeDefined();
          expect(res.body.optimizationScore).toBeDefined();
          expect(res.body.priorityActions).toBeDefined();
          expect(typeof res.body.optimizationScore).toBe('number');
          expect(Array.isArray(res.body.suggestions)).toBe(true);
        });
    });

    it('POST /ai-invoice/template-optimize - should optimize template', async () => {
      return request(app.getHttpServer())
        .post('/ai-invoice/template-optimize')
        .set('x-api-key', 'test-key')
        .send({
          templateId: 'template-001',
          businessContext: {
            industry: 'manufacturing',
            region: 'Maharashtra',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.originalTemplate).toBeDefined();
          expect(res.body.optimizedTemplate).toBeDefined();
          expect(res.body.improvements).toBeDefined();
          expect(res.body.expectedImprovements).toBeDefined();
          expect(res.body.implementationPlan).toBeDefined();
          expect(Array.isArray(res.body.improvements)).toBe(true);
        });
    });
  });

  describe('Cultural Intelligence Endpoints', () => {
    it('POST /ai-invoice/cultural-insights - should get cultural insights', async () => {
      return request(app.getHttpServer())
        .post('/ai-invoice/cultural-insights')
        .set('x-api-key', 'test-key')
        .send({
          region: 'Maharashtra',
          businessContext: {
            industry: 'textiles',
            companySize: 'small',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.region).toBe('Maharashtra');
          expect(res.body.communication).toBeDefined();
          expect(res.body.businessPractices).toBeDefined();
          expect(res.body.timing).toBeDefined();
          expect(res.body.payment).toBeDefined();
          expect(res.body.documentation).toBeDefined();
        });
    });

    it('POST /ai-invoice/regional-adaptations - should get regional adaptations', async () => {
      return request(app.getHttpServer())
        .post('/ai-invoice/regional-adaptations')
        .set('x-api-key', 'test-key')
        .send({
          state: 'Gujarat',
          industry: 'textiles',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.state).toBe('Gujarat');
          expect(res.body.primaryLanguage).toBeDefined();
          expect(res.body.adaptationRecommendations).toBeDefined();
          expect(res.body.adaptationRecommendations.language).toBeDefined();
          expect(res.body.adaptationRecommendations.design).toBeDefined();
        });
    });

    it('GET /ai-invoice/festival-calendar - should get festival calendar', async () => {
      return request(app.getHttpServer())
        .get('/ai-invoice/festival-calendar')
        .set('x-api-key', 'test-key')
        .query({ year: 2025 })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0].festival).toBeDefined();
            expect(res.body[0].date).toBeDefined();
            expect(res.body[0].type).toBeDefined();
            expect(res.body[0].businessImpact).toBeDefined();
          }
        });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without API key', async () => {
      return request(app.getHttpServer())
        .get('/invoices')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Authentication failed');
        });
    });

    it('should reject requests with invalid API key', async () => {
      return request(app.getHttpServer())
        .get('/invoices')
        .set('x-api-key', 'invalid-key')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Authentication failed');
        });
    });

    it('should allow requests with valid API key', async () => {
      return request(app.getHttpServer())
        .get('/invoices')
        .set('x-api-key', 'test-key')
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to test rate limiting
      const requests = Array(105).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/invoices')
          .set('x-api-key', 'test-key')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      rateLimitedResponses.forEach(res => {
        expect(res.body.error).toBe('Rate limit exceeded');
      });
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousData = {
        invoiceNumber: "INV-001'; DROP TABLE invoices; --",
        customerName: 'Test Customer',
        total: 1000,
      };

      return request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .send(maliciousData)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Validation failed');
        });
    });

    it('should reject XSS attempts', async () => {
      const maliciousData = {
        invoiceNumber: 'INV-001',
        customerName: '<script>alert("xss")</script>',
        total: 1000,
      };

      return request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .send(maliciousData)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Validation failed');
        });
    });

    it('should reject invalid content types', async () => {
      return request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Validation failed');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .set('x-api-key', 'test-key')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      return request(app.getHttpServer())
        .post('/invoices')
        .set('x-api-key', 'test-key')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});
