import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Distribution API E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for protected endpoints
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@smeplatform.com',
        password: 'admin123',
      });

    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/rules')
        .expect(401);
    });

    it('should accept requests with valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .expect(200);
    });

    it('should reject requests with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/rules')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });
  });

  describe('Distribution Rules API', () => {
    let createdRuleId: string;

    it('should create a new distribution rule', () => {
      return request(app.getHttpServer())
        .post('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          ruleName: 'Test Rule',
          description: 'Test rule for E2E testing',
          ruleType: 'amount_based',
          conditions: {
            minAmount: 1000,
            maxAmount: 5000,
          },
          targetChannel: 'EMAIL',
          priority: 75,
          isActive: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.ruleName).toBe('Test Rule');
          createdRuleId = res.body.data.id;
        });
    });

    it('should get all distribution rules', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should get a specific distribution rule', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/distribution/rules/${createdRuleId}`)
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(createdRuleId);
        });
    });

    it('should update a distribution rule', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/distribution/rules/${createdRuleId}`)
        .set('X-API-Key', 'sk-test-key')
        .send({
          ruleName: 'Updated Test Rule',
          priority: 80,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.ruleName).toBe('Updated Test Rule');
          expect(res.body.data.priority).toBe(80);
        });
    });

    it('should delete a distribution rule (soft delete)', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/distribution/rules/${createdRuleId}`)
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('Distribution Assignments API', () => {
    let createdAssignmentId: string;

    it('should create a manual distribution assignment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/distribution/assignments')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          invoiceId: 'invoice-test-001',
          customerId: 'customer-test-001',
          assignedChannel: 'EMAIL',
          assignmentReason: 'Manual test assignment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.assignedChannel).toBe('EMAIL');
          createdAssignmentId = res.body.data.id;
        });
    });

    it('should create an intelligent distribution assignment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/distribution/assignments/intelligent')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          invoiceId: 'invoice-test-002',
          customerId: 'customer-test-002',
          amount: 15000,
          dueDate: '2024-02-15',
          customerData: {
            segment: 'premium',
            industry: 'manufacturing',
            location: {
              country: 'US',
              state: 'CA',
            },
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.ruleApplied).toBeDefined();
          expect(res.body.data.confidence).toBeDefined();
        });
    });

    it('should get assignments with filters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/assignments')
        .query({
          tenantId: 'tenant-1',
          status: 'PENDING',
          channel: 'EMAIL',
          page: 1,
          limit: 10,
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta.pagination).toBeDefined();
        });
    });

    it('should get assignments by invoice ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/assignments/invoice/invoice-test-001')
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should update assignment status', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/distribution/assignments/${createdAssignmentId}/status`)
        .set('X-API-Key', 'sk-test-key')
        .send({
          distributionStatus: 'SENT',
          sentAt: new Date().toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.distributionStatus).toBe('SENT');
        });
    });

    it('should create multiple assignments in batch', () => {
      return request(app.getHttpServer())
        .post('/api/v1/distribution/assignments/batch')
        .set('X-API-Key', 'sk-test-key')
        .send({
          assignments: [
            {
              tenantId: 'tenant-1',
              invoiceId: 'invoice-batch-001',
              customerId: 'customer-batch-001',
              assignedChannel: 'EMAIL',
              assignmentReason: 'Batch test assignment 1',
            },
            {
              tenantId: 'tenant-1',
              invoiceId: 'invoice-batch-002',
              customerId: 'customer-batch-002',
              assignedChannel: 'SMS',
              assignmentReason: 'Batch test assignment 2',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.created).toBe(2);
        });
    });

    it('should update multiple assignment statuses in batch', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/distribution/assignments/batch/status')
        .set('X-API-Key', 'sk-test-key')
        .send({
          assignmentIds: [createdAssignmentId],
          distributionStatus: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.updated).toBe(1);
        });
    });
  });

  describe('Analytics API', () => {
    it('should get distribution analytics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/analytics')
        .query({
          tenantId: 'tenant-1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.totalAssignments).toBeDefined();
          expect(res.body.data.successRate).toBeDefined();
          expect(res.body.data.channelBreakdown).toBeDefined();
        });
    });

    it('should get channel performance metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/analytics/channels')
        .query({
          tenantId: 'tenant-1',
          days: 30,
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get rule performance metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/analytics/rules')
        .query({
          tenantId: 'tenant-1',
          days: 30,
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Recipient Contacts API', () => {
    let createdContactId: string;

    it('should create a new recipient contact', () => {
      return request(app.getHttpServer())
        .post('/api/v1/recipient-contacts')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          customerId: 'customer-new-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phone: '+1234567890',
          channel: 'EMAIL',
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            whatsappNotifications: true,
            preferredTime: '09:00-17:00',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe('john.doe@test.com');
          createdContactId = res.body.data.id;
        });
    });

    it('should get all recipient contacts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recipient-contacts')
        .query({
          tenantId: 'tenant-1',
          channel: 'EMAIL',
          page: 1,
          limit: 10,
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should search recipient contacts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recipient-contacts/search')
        .query({
          tenantId: 'tenant-1',
          query: 'john',
          searchFields: ['firstName', 'lastName', 'email'],
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get contacts by channel', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recipient-contacts/channel/EMAIL')
        .query({
          tenantId: 'tenant-1',
        })
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should update a recipient contact', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/recipient-contacts/${createdContactId}`)
        .set('X-API-Key', 'sk-test-key')
        .send({
          firstName: 'John Updated',
          preferences: {
            emailNotifications: false,
            smsNotifications: true,
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.firstName).toBe('John Updated');
        });
    });

    it('should delete a recipient contact', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/recipient-contacts/${createdContactId}`)
        .set('X-API-Key', 'sk-test-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('Health Check API', () => {
    it('should return comprehensive health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.services).toBeDefined();
          expect(res.body.metrics).toBeDefined();
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.checks).toBeDefined();
        });
    });

    it('should return provider status', () => {
      return request(app.getHttpServer())
        .get('/health/providers')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBeDefined();
          expect(res.body.sms).toBeDefined();
          expect(res.body.whatsapp).toBeDefined();
        });
    });

    it('should return system metrics', () => {
      return request(app.getHttpServer())
        .get('/health/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalRules).toBeDefined();
          expect(res.body.totalAssignments).toBeDefined();
          expect(res.body.memoryUsage).toBeDefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
      return request(app.getHttpServer())
        .post('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .send({
          // Missing required fields
          ruleName: 'Invalid Rule',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('BAD_REQUEST');
        });
    });

    it('should handle not found errors properly', () => {
      return request(app.getHttpServer())
        .get('/api/v1/distribution/rules/non-existent-id')
        .set('X-API-Key', 'sk-test-key')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('NOT_FOUND');
        });
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = Array(101).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/distribution/rules')
          .set('X-API-Key', 'sk-test-key')
      );

      const results = await Promise.allSettled(promises);
      const rateLimitedRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a rule
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          ruleName: 'Consistency Test Rule',
          ruleType: 'amount_based',
          conditions: { minAmount: 100 },
          targetChannel: 'EMAIL',
        });

      const ruleId = createResponse.body.data.id;

      // Create an assignment using the rule
      const assignmentResponse = await request(app.getHttpServer())
        .post('/api/v1/distribution/assignments')
        .set('X-API-Key', 'sk-test-key')
        .send({
          tenantId: 'tenant-1',
          invoiceId: 'consistency-test-invoice',
          customerId: 'consistency-test-customer',
          assignedChannel: 'EMAIL',
          ruleId: ruleId,
          assignmentReason: 'Consistency test',
        });

      const assignmentId = assignmentResponse.body.data.id;

      // Verify the assignment references the correct rule
      const getAssignmentResponse = await request(app.getHttpServer())
        .get(`/api/v1/distribution/assignments/${assignmentId}`)
        .set('X-API-Key', 'sk-test-key');

      expect(getAssignmentResponse.body.data.ruleId).toBe(ruleId);

      // Delete the rule (should be prevented if assignment exists)
      await request(app.getHttpServer())
        .delete(`/api/v1/distribution/rules/${ruleId}`)
        .set('X-API-Key', 'sk-test-key')
        .expect(400);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 50;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/distribution/rules')
          .set('X-API-Key', 'sk-test-key')
      );

      const results = await Promise.allSettled(promises);
      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulRequests.length).toBe(concurrentRequests);
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/distribution/rules')
        .set('X-API-Key', 'sk-test-key')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
