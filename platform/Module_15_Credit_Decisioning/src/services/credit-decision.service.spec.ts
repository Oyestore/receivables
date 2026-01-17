import { Test, TestingModule } from '@nestjs/testing';
import { CreditDecisionService } from './credit-decision.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreditDecisionEntity } from '../entities/credit-decision.entity';
import { TestFixtures } from '../../tests/fixtures';
import { DecisionRuleService } from './decision-rule.service';
import { DecisionWorkflowService } from './decision-workflow.service';

describe('CreditDecisionService', () => {
    let service: CreditDecisionService;
    let decisionRepo: any;
    let ruleService: Partial<DecisionRuleService>;
    let workflowService: Partial<DecisionWorkflowService>;

    beforeEach(async () => {
        decisionRepo = createMockRepository<CreditDecisionEntity>();

        ruleService = {
            getActiveRules: jest.fn(),
            evaluateRules: jest.fn(),
        };

        workflowService = {
            getDefaultWorkflow: jest.fn(),
            executeWorkflowStep: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreditDecisionService,
                { provide: getRepositoryToken(CreditDecisionEntity), useValue: decisionRepo },
                { provide: DecisionRuleService, useValue: ruleService },
                { provide: DecisionWorkflowService, useValue: workflowService },
            ],
        }).compile();

        service = module.get<CreditDecisionService>(CreditDecisionService);
    });

    describe('evaluateDecision', () => {
        it('should auto-approve low-risk decision with high confidence', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({
                amount: 5000,
                riskScore: 30,
                confidenceScore: 95,
                status: 'pending',
            });

            const mockRules = [
                TestFixtures.createMockDecisionRule({
                    conditions: [{ field: 'amount', operator: 'lte', value: 10000 }],
                    action: 'approve',
                }),
            ];

            (ruleService.getActiveRules as jest.Mock).mockResolvedValue(mockRules);
            (ruleService.evaluateRules as jest.Mock).mockResolvedValue({
                action: 'approve',
                confidence: 95,
            });
            decisionRepo.save.mockResolvedValue({ ...mockDecision, status: 'approved' });

            const result = await service.evaluateDecision(mockDecision);

            expect(result.status).toBe('approved');
            expect(result.autoDecision).toBe(true);
            expect(ruleService.getActiveRules).toHaveBeenCalled();
        });

        it('should require manual review for high-risk decision', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({
                amount: 50000,
                riskScore: 80,
                confidenceScore: 60,
            });

            const mockRules = [
                TestFixtures.createMockDecisionRule({
                    conditions: [{ field: 'amount', operator: 'gt', value: 10000 }],
                    action: 'manual_review',
                }),
            ];

            (ruleService.getActiveRules as jest.Mock).mockResolvedValue(mockRules);
            (ruleService.evaluateRules as jest.Mock).mockResolvedValue({
                action: 'manual_review',
                confidence: 60,
            });
            decisionRepo.save.mockResolvedValue({ ...mockDecision, status: 'pending_review' });

            const result = await service.evaluateDecision(mockDecision);

            expect(result.status).toBe('pending_review');
            expect(result.autoDecision).toBe(false);
        });

        it('should reject high-risk decision with low confidence', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({
                amount: 100000,
                riskScore: 95,
                confidenceScore: 40,
            });

            const mockRules = [
                TestFixtures.createMockDecisionRule({
                    conditions: [{ field: 'riskScore', operator: 'gt', value: 90 }],
                    action: 'reject',
                }),
            ];

            (ruleService.evaluateRules as jest.Mock).mockResolvedValue({
                action: 'reject',
                confidence: 90,
            });
            decisionRepo.save.mockResolvedValue({ ...mockDecision, status: 'rejected' });

            const result = await service.evaluateDecision(mockDecision);

            expect(result.status).toBe('rejected');
        });

        it('should handle multi-rule evaluation', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({
                amount: 7500,
                riskScore: 55,
            });

            const mockRules = [
                TestFixtures.createMockDecisionRule({ priority: 100, action: 'approve' }),
                TestFixtures.createMockDecisionRule({ priority: 50, action: 'manual_review' }),
            ];

            (ruleService.getActiveRules as jest.Mock).mockResolvedValue(mockRules);
            (ruleService.evaluateRules as jest.Mock).mockResolvedValue({
                action: 'approve',
                matchedRules: 2,
            });

            await service.evaluateDecision(mockDecision);

            expect(ruleService.evaluateRules).toHaveBeenCalledWith(mockDecision, mockRules);
        });

        it('should default to manual review when no rules match', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision();

            (ruleService.getActiveRules as jest.Mock).mockResolvedValue([]);
            (ruleService.evaluateRules as jest.Mock).mockResolvedValue({
                action: 'manual_review',
                confidence: 0,
            });
            decisionRepo.save.mockResolvedValue({ ...mockDecision, status: 'pending_review' });

            const result = await service.evaluateDecision(mockDecision);

            expect(result.status).toBe('pending_review');
            expect(result.autoDecision).toBe(false);
        });
    });

    describe('calculateRiskScore', () => {
        it('should calculate risk score with multiple factors', async () => {
            const factors = {
                amount: 10000,
                creditHistory: 'good',
                industryRisk: 'low',
                paymentHistory: 'excellent',
            };

            const riskScore = await service.calculateRiskScore(factors);

            expect(riskScore).toBeGreaterThanOrEqual(0);
            expect(riskScore).toBeLessThanOrEqual(100);
        });

        it('should weight amount factor appropriately', async () => {
            const lowAmount = await service.calculateRiskScore({ amount: 1000 });
            const highAmount = await service.calculateRiskScore({ amount: 100000 });

            expect(highAmount).toBeGreaterThan(lowAmount);
        });

        it('should consider credit history in score', async () => {
            const goodCredit = await service.calculateRiskScore({ creditHistory: 'excellent' });
            const poorCredit = await service.calculateRiskScore({ creditHistory: 'poor' });

            expect(poorCredit).toBeGreaterThan(goodCredit);
        });

        it('should normalize risk score to 0-100 range', async () => {
            const factors = {
                amount: 999999,
                creditHistory: 'poor',
                industryRisk: 'high',
            };

            const riskScore = await service.calculateRiskScore(factors);

            expect(riskScore).toBeLessThanOrEqual(100);
            expect(riskScore).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getDecision', () => {
        it('should retrieve decision by ID', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision();
            decisionRepo.findOne.mockResolvedValue(mockDecision);

            const result = await service.getDecision(mockDecision.id);

            expect(result).toEqual(mockDecision);
            expect(decisionRepo.findOne).toHaveBeenCalledWith({
                where: { id: mockDecision.id },
            });
        });

        it('should return null for non-existent decision', async () => {
            decisionRepo.findOne.mockResolvedValue(null);

            const result = await service.getDecision('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getDecisionsByEntity', () => {
        it('should retrieve decisions by entity ID and type', async () => {
            const mockDecisions = [
                TestFixtures.createMockCreditDecision({ entityId: 'inv-1', entityType: 'invoice' }),
                TestFixtures.createMockCreditDecision({ entityId: 'inv-1', entityType: 'invoice' }),
            ];

            decisionRepo.find.mockResolvedValue(mockDecisions);

            const result = await service.getDecisionsByEntity('inv-1', 'invoice');

            expect(result).toHaveLength(2);
            expect(result.every(d => d.entityId === 'inv-1')).toBe(true);
        });

        it('should filter by tenant ID', async () => {
            const mockDecisions = [TestFixtures.createMockCreditDecision({ tenantId: 'tenant-1' })];
            decisionRepo.find.mockResolvedValue(mockDecisions);

            await service.getDecisionsByEntity('entity-1', 'invoice', 'tenant-1');

            expect(decisionRepo.find).toHaveBeenCalledWith({
                where: {
                    entityId: 'entity-1',
                    entityType: 'invoice',
                    tenantId: 'tenant-1',
                },
            });
        });
    });

    describe('updateDecisionStatus', () => {
        it('should update decision status', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({ status: 'pending' });
            decisionRepo.findOne.mockResolvedValue(mockDecision);
            decisionRepo.save.mockResolvedValue({ ...mockDecision, status: 'approved' });

            const result = await service.updateDecisionStatus(mockDecision.id, 'approved');

            expect(result.status).toBe('approved');
            expect(decisionRepo.save).toHaveBeenCalled();
        });

        it('should reject invalid status transitions', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({ status: 'approved' });
            decisionRepo.findOne.mockResolvedValue(mockDecision);

            await expect(
                service.updateDecisionStatus(mockDecision.id, 'pending')
            ).rejects.toThrow('Invalid status transition');
        });

        it('should track status change timestamp', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision();
            decisionRepo.findOne.mockResolvedValue(mockDecision);
            decisionRepo.save.mockResolvedValue({ ...mockDecision, updatedAt: new Date() });

            const result = await service.updateDecisionStatus(mockDecision.id, 'approved');

            expect(result.updatedAt).toBeDefined();
        });
    });

    describe('getDecisionAnalytics', () => {
        it('should return analytics for tenant', async () => {
            const mockDecisions = [
                TestFixtures.createMockCreditDecision({ status: 'approved', tenantId: 'tenant-1' }),
                TestFixtures.createMockCreditDecision({ status: 'rejected', tenantId: 'tenant-1' }),
                TestFixtures.createMockCreditDecision({ status: 'approved', tenantId: 'tenant-1' }),
            ];

            decisionRepo.find.mockResolvedValue(mockDecisions);

            const analytics = await service.getDecisionAnalytics('tenant-1');

            expect(analytics.total).toBe(3);
            expect(analytics.approved).toBe(2);
            expect(analytics.rejected).toBe(1);
            expect(analytics.approvalRate).toBeCloseTo(66.67, 1);
        });

        it('should calculate average decision time', async () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const mockDecisions = [
                TestFixtures.createMockCreditDecision({
                    createdAt: oneHourAgo,
                    decidedAt: now,
                }),
            ];

            decisionRepo.find.mockResolvedValue(mockDecisions);

            const analytics = await service.getDecisionAnalytics('tenant-1');

            expect(analytics.averageDecisionTimeMinutes).toBeCloseTo(60, 0);
        });

        it('should group by decision type', async () => {
            const mockDecisions = [
                TestFixtures.createMockCreditDecision({ decisionType: 'credit_approval' }),
                TestFixtures.createMockCreditDecision({ decisionType: 'credit_approval' }),
                TestFixtures.createMockCreditDecision({ decisionType: 'limit_increase' }),
            ];

            decisionRepo.find.mockResolvedValue(mockDecisions);

            const analytics = await service.getDecisionAnalytics('tenant-1');

            expect(analytics.byType).toBeDefined();
            expect(analytics.byType['credit_approval']).toBe(2);
            expect(analytics.byType['limit_increase']).toBe(1);
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            decisionRepo.findOne.mockRejectedValue(new Error('Database error'));

            await expect(service.getDecision('test-id')).rejects.toThrow('Database error');
        });

        it('should handle rule evaluation errors', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision();
            (ruleService.evaluateRules as jest.Mock).mockRejectedValue(new Error('Rule error'));

            await expect(service.evaluateDecision(mockDecision)).rejects.toThrow();
        });
    });
});
