import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Module 05 Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Workflow Integration', () => {
    it('should create and execute complete workflow', async () => {
      // Create workflow definition
      const createWorkflowDto = {
        name: 'Integration Test Workflow',
        description: 'Test workflow for integration testing',
        tenantId: 'test-tenant',
        steps: [
          {
            id: 'step-1',
            name: 'Initial Step',
            type: 'verification',
            config: {},
          },
          {
            id: 'step-2',
            name: 'Processing Step',
            type: 'processing',
            config: {},
          },
        ],
      };

      const workflowResponse = await request(app.getHttpServer())
        .post('/workflows')
        .send(createWorkflowDto)
        .expect(201);

      const workflowId = workflowResponse.body.id;

      // Create workflow instance
      const createInstanceDto = {
        workflowId,
        tenantId: 'test-tenant',
        context: {
          testData: 'integration test',
        },
      };

      const instanceResponse = await request(app.getHttpServer())
        .post('/workflow-instances')
        .send(createInstanceDto)
        .expect(201);

      const instanceId = instanceResponse.body.id;

      // Execute workflow
      const executionResponse = await request(app.getHttpServer())
        .post(`/workflow-instances/${instanceId}/execute`)
        .expect(200);

      expect(executionResponse.body.status).toBe('running');

      // Wait for completion (polling)
      let finalStatus = 'running';
      let attempts = 0;
      while (finalStatus === 'running' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app.getHttpServer())
          .get(`/workflow-instances/${instanceId}`)
          .expect(200);

        finalStatus = statusResponse.body.status;
        attempts++;
      }

      expect(finalStatus).toBe('completed');
    });

    it('should handle workflow escalation integration', async () => {
      // Create workflow with escalation
      const createWorkflowDto = {
        name: 'Escalation Test Workflow',
        description: 'Test workflow with escalation',
        tenantId: 'test-tenant',
        escalationConfig: {
          enabled: true,
          timeout: 5000, // 5 seconds
          escalationLevel: 1,
        },
        steps: [
          {
            id: 'step-1',
            name: 'Long Running Step',
            type: 'processing',
            config: {
              duration: 10000, // 10 seconds - longer than timeout
            },
          },
        ],
      };

      const workflowResponse = await request(app.getHttpServer())
        .post('/workflows')
        .send(createWorkflowDto)
        .expect(201);

      const workflowId = workflowResponse.body.id;

      // Create and execute instance
      const createInstanceDto = {
        workflowId,
        tenantId: 'test-tenant',
        context: {},
      };

      const instanceResponse = await request(app.getHttpServer())
        .post('/workflow-instances')
        .send(createInstanceDto)
        .expect(201);

      const instanceId = instanceResponse.body.id;

      // Execute workflow
      await request(app.getHttpServer())
        .post(`/workflow-instances/${instanceId}/execute`)
        .expect(200);

      // Wait for escalation
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Check for escalation
      const escalationsResponse = await request(app.getHttpServer())
        .get(`/escalations?workflowInstanceId=${instanceId}`)
        .expect(200);

      expect(escalationsResponse.body.data).toHaveLength(1);
      expect(escalationsResponse.body.data[0].status).toBe('pending');
    });
  });

  describe('Verification Integration', () => {
    it('should create verification with evidence and complete workflow', async () => {
      // Create milestone
      const createMilestoneDto = {
        name: 'Integration Test Milestone',
        description: 'Test milestone for integration',
        tenantId: 'test-tenant',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        value: 10000,
        currency: 'USD',
      };

      const milestoneResponse = await request(app.getHttpServer())
        .post('/milestones')
        .send(createMilestoneDto)
        .expect(201);

      const milestoneId = milestoneResponse.body.id;

      // Create verification
      const createVerificationDto = {
        milestoneId,
        tenantId: 'test-tenant',
        verificationType: 'document',
        requiredDocuments: ['invoice', 'receipt'],
      };

      const verificationResponse = await request(app.getHttpServer())
        .post('/verifications')
        .send(createVerificationDto)
        .expect(201);

      const verificationId = verificationResponse.body.id;

      // Upload evidence
      const createEvidenceDto = {
        verificationId,
        documentType: 'invoice',
        fileName: 'test-invoice.pdf',
        fileData: 'base64-encoded-file-data',
        metadata: {
          uploadDate: new Date().toISOString(),
          uploadedBy: 'test-user',
        },
      };

      const evidenceResponse = await request(app.getHttpServer())
        .post('/evidence')
        .send(createEvidenceDto)
        .expect(201);

      expect(evidenceResponse.body.verificationId).toBe(verificationId);

      // Approve verification
      const approveDto = {
        approved: true,
        comments: 'Integration test approval',
        approvedBy: 'test-approver',
      };

      const approveResponse = await request(app.getHttpServer())
        .post(`/verifications/${verificationId}/approve`)
        .send(approveDto)
        .expect(200);

      expect(approveResponse.body.status).toBe('approved');

      // Check milestone status
      const milestoneStatusResponse = await request(app.getHttpServer())
        .get(`/milestones/${milestoneId}`)
        .expect(200);

      expect(milestoneStatusResponse.body.status).toBe('completed');
    });
  });

  describe('Multi-Service Integration', () => {
    it('should integrate workflow automation with business intelligence', async () => {
      // Enable workflow automation
      const workflowId = 'test-workflow-id';
      
      const automationResponse = await request(app.getHttpServer())
        .post(`/workflow-automation/workflows/${workflowId}/enable-full-automation`)
        .expect(200);

      expect(automationResponse.body.success).toBe(true);

      // Execute automated workflow
      const executeDto = {
        context: {
          testData: 'automation integration test',
          businessData: {
            revenue: 100000,
            costs: 80000,
          },
        },
      };

      const executionResponse = await request(app.getHttpServer())
        .post(`/workflow-automation/workflows/${workflowId}/execute`)
        .send(executeDto)
        .expect(200);

      expect(executionResponse.body.success).toBe(true);

      const executionId = executionResponse.body.data.executionId;

      // Get automation analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get('/workflow-automation/analytics/test-tenant')
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.totalWorkflows).toBeGreaterThan(0);

      // Get business intelligence insights
      const biResponse = await request(app.getHttpServer())
        .get('/business-intelligence/insights/test-tenant')
        .expect(200);

      expect(biResponse.body.success).toBe(true);
      expect(biResponse.body.data).toBeDefined();
    });

    it('should integrate continuous improvement with performance optimization', async () => {
      // Create improvement plan
      const createPlanDto = {
        tenantId: 'test-tenant',
        name: 'Integration Test Improvement Plan',
        description: 'Test plan for continuous improvement',
        objectives: [
          {
            id: 'obj-1',
            title: 'Reduce response time',
            description: 'Improve system response time by 20%',
            category: 'efficiency',
            priority: 'high',
            targetValue: 200,
            currentValue: 250,
            unit: 'ms',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            owner: 'test-user',
            status: 'not_started',
          },
        ],
      };

      const planResponse = await request(app.getHttpServer())
        .post('/continuous-improvement/plans/create')
        .send(createPlanDto)
        .expect(200);

      expect(planResponse.body.name).toBe('Integration Test Improvement Plan');

      const planId = planResponse.body.planId;

      // Execute improvement initiative
      const initiativeResponse = await request(app.getHttpServer())
        .post(`/continuous-improvement/initiatives/${planId}/execute`)
        .expect(200);

      expect(initiativeResponse.body.status).toBe('in_progress');

      // Get performance metrics
      const performanceResponse = await request(app.getHttpServer())
        .get('/performance-optimization/metrics/test-tenant')
        .expect(200);

      expect(performanceResponse.body.success).toBe(true);
      expect(performanceResponse.body.data.metrics).toBeDefined();

      // Optimize performance parameters
      const optimizeResponse = await request(app.getHttpServer())
        .post('/performance-optimization/parameters/test-tenant/optimize')
        .send({
          targetWorkflows: [workflowId],
          optimizationIntensity: 80,
        })
        .expect(200);

      expect(optimizeResponse.body.success).toBe(true);
    });
  });

  describe('Global Integration', () => {
    it('should integrate globalization with global expansion', async () => {
      // Test globalization service
      const globalizationResponse = await request(app.getHttpServer())
        .post('/globalization/translate')
        .send({
          text: 'Hello World',
          targetLanguage: 'es',
          context: 'business',
        })
        .expect(200);

      expect(globalizationResponse.body.translatedText).toBeDefined();

      // Test global expansion
      const expansionResponse = await request(app.getHttpServer())
        .post('/global-expansion/strategies/create')
        .send({
          tenantId: 'test-tenant',
          name: 'Test Expansion Strategy',
          description: 'Test strategy for global expansion',
          targetMarkets: [
            {
              id: 'market-1',
              country: 'Spain',
              region: 'Europe',
              marketSize: {
                totalAddressableMarket: 1000000,
                serviceableAddressableMarket: 500000,
                serviceableObtainableMarket: 100000,
                currency: 'EUR',
                growthRate: 0.05,
                marketPotential: 100000,
              },
              entryStrategy: {
                strategy: 'direct_export',
                rationale: 'Test market entry',
                advantages: ['Direct control'],
                disadvantages: ['Higher risk'],
                investmentRequired: 50000,
                timeToMarket: 6,
                riskLevel: 'medium',
              },
            },
          ],
        })
        .expect(200);

      expect(expansionResponse.body.name).toBe('Test Expansion Strategy');

      const strategyId = expansionResponse.body.strategyId;

      // Analyze market opportunity
      const marketAnalysisResponse = await request(app.getHttpServer())
        .post('/global-expansion/markets/Spain/analyze')
        .expect(200);

      expect(marketAnalysisResponse.body.market).toBe('Spain');
      expect(marketAnalysisResponse.body.opportunityScore).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // Create workflow that will fail
      const createWorkflowDto = {
        name: 'Failure Test Workflow',
        description: 'Test workflow for failure handling',
        tenantId: 'test-tenant',
        steps: [
          {
            id: 'step-1',
            name: 'Failing Step',
            type: 'processing',
            config: {
              forceFailure: true,
            },
          },
        ],
      };

      const workflowResponse = await request(app.getHttpServer())
        .post('/workflows')
        .send(createWorkflowDto)
        .expect(201);

      const workflowId = workflowResponse.body.id;

      // Execute and expect failure
      const createInstanceDto = {
        workflowId,
        tenantId: 'test-tenant',
        context: {},
      };

      const instanceResponse = await request(app.getHttpServer())
        .post('/workflow-instances')
        .send(createInstanceDto)
        .expect(201);

      const instanceId = instanceResponse.body.id;

      const executionResponse = await request(app.getHttpServer())
        .post(`/workflow-instances/${instanceId}/execute`)
        .expect(200);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await request(app.getHttpServer())
        .get(`/workflow-instances/${instanceId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('failed');

      // Verify escalation was created
      const escalationsResponse = await request(app.getHttpServer())
        .get(`/escalations?workflowInstanceId=${instanceId}`)
        .expect(200);

      expect(escalationsResponse.body.data).toHaveLength(1);
      expect(escalationsResponse.body.data[0].status).toBe('pending');
    });

    it('should handle service unavailability gracefully', async () => {
      // Test with invalid service endpoint
      const response = await request(app.getHttpServer())
        .get('/invalid-endpoint')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const requests = [];

      // Create multiple concurrent workflow executions
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/workflows')
            .send({
              name: `Concurrent Workflow ${i}`,
              description: `Test workflow ${i}`,
              tenantId: 'test-tenant',
              steps: [],
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(responses).toHaveLength(concurrentRequests);
      expect(responses.every(r => r.status === 201)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large data payloads efficiently', async () => {
      const largePayload = {
        name: 'Large Data Workflow',
        description: 'Test workflow with large data',
        tenantId: 'test-tenant',
        context: {
          largeArray: Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            data: `item-${i}`,
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              tags: [`tag-${i}`, `category-${i % 10}`],
            },
          })),
        },
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/workflows')
        .send(largePayload)
        .expect(201);
      const endTime = Date.now();

      expect(response.body.name).toBe('Large Data Workflow');
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});
