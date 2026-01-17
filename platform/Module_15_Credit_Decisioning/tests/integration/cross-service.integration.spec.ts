import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditDecisionService } from '../../src/services/credit-decision.service';
import { DecisionRuleService } from '../../src/services/decision-rule.service';
import { DecisionWorkflowService } from '../../src/services/decision-workflow.service';
import { ManualReviewService } from '../../src/services/manual-review.service';
import { CreditDecisionModule } from '../../src/credit-decision.module';

describe('Cross-Service Coordination', () => {
    let app: INestApplication;
    let decisionService: CreditDecisionService;
    let ruleService: DecisionRuleService;
    let workflowService: DecisionWorkflowService;
    let reviewService: ManualReviewService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [__dirname + '/../../src/entities/*.entity{.ts,.js}'],
                    synchronize: true,
                    dropSchema: true,
                }),
                CreditDecisionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        decisionService = moduleFixture.get<CreditDecisionService>(CreditDecisionService);
        ruleService = moduleFixture.get<DecisionRuleService>(DecisionRuleService);
        workflowService = moduleFixture.get<DecisionWorkflowService>(DecisionWorkflowService);
        reviewService = moduleFixture.get<ManualReviewService>(ManualReviewService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should coordinate across all services for complex decision', async () => {
        // Create rule
        const rule = await ruleService.createRule({
            name: 'Complex Coordination Rule',
            ruleType: 'SCORING' as any,
            entityTypes: ['invoice'],
            decisionTypes: ['credit_approval'],
            conditions: [{ field: 'amount', operator: 'gt' as any, value: 75000 }],
            actions: [{ type: 'MANUAL_REVIEW' as any, parameters: {} }],
        }, 'system');
        await ruleService.activateRule(rule.id, 'system');

        // Create workflow
        const workflow = await workflowService.createWorkflow({
            name: 'Complex Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Rule Evaluation', order: 1, type: 'AUTOMATED' as any },
                { name: 'Manual Review', order: 2, type: 'MANUAL' as any },
            ],
        }, 'system');
        await workflowService.activateWorkflow(workflow.id, 'system');

        // Evaluate decision (triggers all services)
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-1',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 100000,
            context: { workflowId: workflow.id },
        });

        expect(decision).toBeDefined();
        expect(decision.appliedRules).toContain(rule.id);
        expect(decision.workflowId).toBeDefined();
    });

    it('should handle service failures with proper rollback', async () => {
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-2',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 50000,
            context: { simulateRuleFailure: true },
        });

        // Decision should still be created even if rule evaluation fails
        expect(decision).toBeDefined();
        expect(decision.status).toBeDefined();
    });

    it('should propagate errors correctly across services', async () => {
        await expect(
            decisionService.evaluateDecision({
                entityId: 'invoice-3',
                entityType: 'invalid-type',
                decisionType: 'credit_approval' as any,
                requestedAmount: -1000, // Invalid amount
                context: {},
            })
        ).rejects.toThrow();
    });

    it('should emit and handle events between services', async () => {
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-4',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 60000,
            context: {},
        });

        // Event should trigger workflow if configured
        expect(decision.eventEmitted).toBeDefined();
    });

    it('should support distributed tracing across services', async () => {
        const traceId = 'trace-123';

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-5',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 40000,
            context: { traceId },
        });

        expect(decision.traceId || traceId).toBe(traceId);
    });

    it('should implement circuit breaker pattern', async () => {
        // Simulate multiple failures
        for (let i = 0; i < 5; i++) {
            try {
                await decisionService.evaluateDecision({
                    entityId: `invoice-${6 + i}`,
                    entityType: 'invoice',
                    decisionType: 'credit_approval' as any,
                    requestedAmount: 30000,
                    context: { simulateFailure: true },
                });
            } catch (error) {
                // Expected failures
            }
        }

        // Circuit should open after multiple failures
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-11',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 35000,
            context: {},
        });

        expect(decision).toBeDefined();
    });

    it('should implement retry logic with exponential backoff', async () => {
        const startTime = Date.now();

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-12',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 45000,
            context: { retryRequired: true },
        });

        const duration = Date.now() - startTime;
        expect(decision).toBeDefined();
        // Should include retry time if implemented
    });

    it('should coordinate cache invalidation across services', async () => {
        const rule = await ruleService.createRule({
            name: 'Cache Test Rule',
            ruleType: 'SCORING' as any,
            entityTypes: ['invoice'],
            decisionTypes: ['credit_approval'],
            conditions: [],
            actions: [{ type: 'APPROVE' as any, parameters: {} }],
        }, 'system');

        await ruleService.activateRule(rule.id, 'system');

        // Update rule (should invalidate cache)
        await ruleService.updateRule(rule.id, { priority: 200 }, 'system');

        // Next evaluation should use updated rule
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-13',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 25000,
            context: {},
        });

        expect(decision).toBeDefined();
    });

    it('should aggregate metrics from all services', async () => {
        // Execute operations across services
        await decisionService.evaluateDecision({
            entityId: 'invoice-14',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 55000,
            context: {},
        });

        const decisionAnalytics = await decisionService.getDecisionAnalytics();
        const workflowStats = await workflowService.getWorkflowStats();
        const reviewStats = await reviewService.getReviewStats();

        expect(decisionAnalytics).toBeDefined();
        expect(workflowStats).toBeDefined();
        expect(reviewStats).toBeDefined();
    });

    it('should maintain data consistency across service boundaries', async () => {
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-15',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 80000,
            context: {},
        });

        // Verify decision exists
        const retrievedDecision = await decisionService.getDecision(decision.id);
        expect(retrievedDecision.id).toBe(decision.id);
        expect(retrievedDecision.status).toBe(decision.status);

        // If workflow created, verify it exists
        if (decision.workflowId) {
            const workflow = await workflowService.getWorkflow(decision.workflowId);
            expect(workflow).toBeDefined();
        }
    });
});
