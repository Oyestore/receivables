import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditDecisionService } from '../../src/services/credit-decision.service';
import { DecisionRuleService } from '../../src/services/decision-rule.service';
import { CreditDecisionModule } from '../../src/credit-decision.module';
import { TestFixtures } from '../fixtures';

describe('Decision-Rule Pipeline Integration', () => {
    let app: INestApplication;
    let decisionService: CreditDecisionService;
    let ruleService: DecisionRuleService;

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
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Rule Matching and Application', () => {
        it('should evaluate decision using matching active rules', async () => {
            // Create an active rule
            const rule = await ruleService.createRule({
                name: 'Auto-Approve Low Risk',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [
                    { field: 'amount', operator: 'lt' as any, value: 10000 },
                ],
                actions: [
                    { type: 'APPROVE' as any, parameters: { confidence: 95 } },
                ],
                priority: 100,
            }, 'system');

            await ruleService.activateRule(rule.id, 'system');

            // Evaluate decision
            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-1',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 5000,
                context: {},
            });

            expect(decision.status).toBe('approved');
            expect(decision.appliedRules).toContain(rule.id);
        });

        it('should handle multiple matching rules by priority', async () => {
            // Create multiple rules
            const highPriorityRule = await ruleService.createRule({
                name: 'High Priority Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 0 }],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
                priority: 200,
            }, 'system');

            const lowPriorityRule = await ruleService.createRule({
                name: 'Low Priority Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 0 }],
                actions: [{ type: 'REJECT' as any, parameters: {} }],
                priority: 50,
            }, 'system');

            await ruleService.activateRule(highPriorityRule.id, 'system');
            await ruleService.activateRule(lowPriorityRule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-2',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 15000,
                context: {},
            });

            // Higher priority rule should execute first
            expect(decision.appliedRules).toContain(highPriorityRule.id);
        });

        it('should skip inactive rules', async () => {
            const inactiveRule = await ruleService.createRule({
                name: 'Inactive Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 0 }],
                actions: [{ type: 'REJECT' as any, parameters: {} }],
            }, 'system');

            // Don't activate the rule

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-3',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 20000,
                context: {},
            });

            expect(decision.appliedRules || []).not.toContain(inactiveRule.id);
        });

        it('should aggregate results from multiple rules', async () => {
            const rule1 = await ruleService.createRule({
                name: 'Risk Score Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'SCORE' as any, parameters: { weight: 0.4, score: 80 } }],
                priority: 100,
            }, 'system');

            const rule2 = await ruleService.createRule({
                name: 'Amount Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'SCORE' as any, parameters: { weight: 0.6, score: 90 } }],
                priority: 90,
            }, 'system');

            await ruleService.activateRule(rule1.id, 'system');
            await ruleService.activateRule(rule2.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-4',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 25000,
                context: {},
            });

            // Aggregated score should be calculated
            expect(decision.confidenceScore).toBeGreaterThan(0);
        });

        it('should calculate confidence score from rule outcomes', async () => {
            const rule = await ruleService.createRule({
                name: 'High Confidence Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'lt' as any, value: 50000 }],
                actions: [{ type: 'APPROVE' as any, parameters: { confidence: 98 } }],
            }, 'system');

            await ruleService.activateRule(rule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-5',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 30000,
                context: {},
            });

            expect(decision.confidenceScore).toBeGreaterThanOrEqual(95);
        });

        it('should handle rule evaluation errors gracefully', async () => {
            const faultyRule = await ruleService.createRule({
                name: 'Faulty Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [
                    { field: 'nonexistent.field', operator: 'eq' as any, value: 'value' },
                ],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            }, 'system');

            await ruleService.activateRule(faultyRule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-6',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 10000,
                context: {},
            });

            // Should not fail completely
            expect(decision).toBeDefined();
            expect(decision.status).toBeDefined();
        });

        it('should filter rules by entity type', async () => {
            const invoiceRule = await ruleService.createRule({
                name: 'Invoice Only Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            }, 'system');

            const customerRule = await ruleService.createRule({
                name: 'Customer Only Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['customer'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'REJECT' as any, parameters: {} }],
            }, 'system');

            await ruleService.activateRule(invoiceRule.id, 'system');
            await ruleService.activateRule(customerRule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-7',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 15000,
                context: {},
            });

            expect(decision.appliedRules).toContain(invoiceRule.id);
            expect(decision.appliedRules || []).not.toContain(customerRule.id);
        });

        it('should filter rules by decision type', async () => {
            const approvalRule = await ruleService.createRule({
                name: 'Approval Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            }, 'system');

            const limitRule = await ruleService.createRule({
                name: 'Limit Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['limit_increase'],
                conditions: [],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            }, 'system');

            await ruleService.activateRule(approvalRule.id, 'system');
            await ruleService.activateRule(limitRule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-8',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 20000,
                context: {},
            });

            expect(decision.appliedRules).toContain(approvalRule.id);
            expect(decision.appliedRules || []).not.toContain(limitRule.id);
        });

        it('should support rule override mechanisms', async () => {
            const strictRule = await ruleService.createRule({
                name: 'Strict Rejection',
                ruleType: 'VALIDATION' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 100000 }],
                actions: [{ type: 'REJECT' as any, parameters: { canOverride: true } }],
                canBeOverridden: true,
            }, 'system');

            await ruleService.activateRule(strictRule.id, 'system');

            const decision = await decisionService.evaluateDecision({
                entityId: 'invoice-9',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 150000,
                context: { managerOverride: true },
            });

            // Rule should be applied but overridden
            expect(decision.appliedRules).toContain(strictRule.id);
            expect(decision.overrideApplied).toBe(true);
        });

        it('should track rule performance metrics', async () => {
            const rule = await ruleService.createRule({
                name: 'Performance Tracked Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            }, 'system');

            await ruleService.activateRule(rule.id, 'system');

            // Execute multiple times
            await decisionService.evaluateDecision({
                entityId: 'invoice-10',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 10000,
                context: {},
            });

            await decisionService.evaluateDecision({
                entityId: 'invoice-11',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 15000,
                context: {},
            });

            const metrics = await ruleService.getRuleMetrics(rule.id);

            expect(metrics.totalExecutions).toBeGreaterThanOrEqual(2);
        });
    });
});
