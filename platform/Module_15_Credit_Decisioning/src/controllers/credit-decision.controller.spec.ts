import { Test, TestingModule } from '@nestjs/testing';
import { CreditDecisionController } from './credit-decision.controller';
import { CreditDecisionService } from '../services/credit-decision.service';
import { TestFixtures } from '../../tests/fixtures';

describe('CreditDecisionController', () => {
    let controller: CreditDecisionController;
    let service: Partial<CreditDecisionService>;

    beforeEach(async () => {
        service = {
            evaluateDecision: jest.fn(),
            getDecision: jest.fn(),
            getDecisionsByEntity: jest.fn(),
            updateDecisionStatus: jest.fn(),
            getDecisionAnalytics: jest.fn(),
            calculateRiskScore: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CreditDecisionController],
            providers: [
                { provide: CreditDecisionService, useValue: service },
            ],
        }).compile();

        controller = module.get<CreditDecisionController>(CreditDecisionController);
    });

    describe('POST /credit-decisions/evaluate', () => {
        it('should evaluate credit decision and return result', async () => {
            const requestDto = {
                entityId: 'invoice-1',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 50000,
                context: { creditHistory: 'good' },
            };

            const mockResult = {
                decisionId: 'decision-1',
                status: 'approved' as any,
                approvedAmount: 50000,
                confidenceScore: 95,
                riskScore: 25,
                decisionReason: 'Low risk, good credit history',
                appliedRules: [],
                requiresManualReview: false,
            };

            (service.evaluateDecision as jest.Mock).mockResolvedValue(mockResult);

            const result = await controller.evaluateDecision(requestDto);

            expect(result).toEqual(mockResult);
            expect(service.evaluateDecision).toHaveBeenCalledWith(requestDto);
        });

        it('should handle high-risk decisions requiring manual review', async () => {
            const requestDto = {
                entityId: 'invoice-2',
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 150000,
                context: { creditHistory: 'poor' },
            };

            const mockResult = {
                decisionId: 'decision-2',
                status: 'pending_review' as any,
                confidenceScore: 60,
                riskScore: 85,
                decisionReason: 'High risk requires manual review',
                requiresManualReview: true,
                workflowId: 'workflow-1',
            };

            (service.evaluateDecision as jest.Mock).mockResolvedValue(mockResult);

            const result = await controller.evaluateDecision(requestDto);

            expect(result.status).toBe('pending_review');
            expect(result.requiresManualReview).toBe(true);
            expect(result.workflowId).toBeDefined();
        });

        it('should validate required fields in request', async () => {
            const invalidRequest = {
                entityId: 'invoice-1',
                // Missing required fields
            };

            await expect(
                controller.evaluateDecision(invalidRequest as any)
            ).rejects.toThrow();
        });
    });

    describe('GET /credit-decisions/:id', () => {
        it('should retrieve decision by ID', async () => {
            const mockDecision = TestFixtures.createMockCreditDecision({
                id: 'decision-1',
                status: 'approved' as any,
            });

            (service.getDecision as jest.Mock).mockResolvedValue(mockDecision);

            const result = await controller.getDecision('decision-1');

            expect(result).toEqual(mockDecision);
            expect(service.getDecision).toHaveBeenCalledWith('decision-1');
        });

        it('should return 404 when decision not found', async () => {
            (service.getDecision as jest.Mock).mockRejectedValue(
                new Error('Decision not found')
            );

            await expect(controller.getDecision('non-existent')).rejects.toThrow(
                'Decision not found'
            );
        });
    });

    describe('GET /credit-decisions/entity/:entityId', () => {
        it('should retrieve all decisions for entity', async () => {
            const mockDecisions = [
                TestFixtures.createMockCreditDecision({ entityId: 'invoice-1' }),
                TestFixtures.createMockCreditDecision({ entityId: 'invoice-1' }),
            ];

            (service.getDecisionsByEntity as jest.Mock).mockResolvedValue(mockDecisions);

            const result = await controller.getDecisionsByEntity(
                'invoice-1',
                'invoice'
            );

            expect(result).toHaveLength(2);
            expect(service.getDecisionsByEntity).toHaveBeenCalledWith(
                'invoice-1',
                'invoice',
                undefined
            );
        });

        it('should filter by tenant when provided', async () => {
            const mockDecisions = [
                TestFixtures.createMockCreditDecision({ tenantId: 'tenant-1' }),
            ];

            (service.getDecisionsByEntity as jest.Mock).mockResolvedValue(mockDecisions);

            await controller.getDecisionsByEntity('invoice-1', 'invoice', 'tenant-1');

            expect(service.getDecisionsByEntity).toHaveBeenCalledWith(
                'invoice-1',
                'invoice',
                'tenant-1'
            );
        });
    });

    describe('PATCH /credit-decisions/:id/status', () => {
        it('should update decision status', async () => {
            const updateDto = {
                status: 'approved' as any,
                reviewerId: 'reviewer-1',
                reviewNotes: 'Manually approved after review',
            };

            const mockUpdated = TestFixtures.createMockCreditDecision({
                id: 'decision-1',
                status: 'approved' as any,
            });

            (service.updateDecisionStatus as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await controller.updateDecisionStatus(
                'decision-1',
                updateDto
            );

            expect(result.status).toBe('approved');
            expect(service.updateDecisionStatus).toHaveBeenCalledWith(
                'decision-1',
                'approved',
                'reviewer-1',
                'Manually approved after review'
            );
        });

        it('should prevent invalid status transitions', async () => {
            (service.updateDecisionStatus as jest.Mock).mockRejectedValue(
                new Error('Invalid status transition')
            );

            await expect(
                controller.updateDecisionStatus('decision-1', {
                    status: 'pending' as any,
                })
            ).rejects.toThrow('Invalid status transition');
        });
    });

    describe('GET /credit-decisions/analytics', () => {
        it('should return decision analytics for tenant', async () => {
            const mockAnalytics = {
                total: 100,
                approved: 75,
                rejected: 20,
                pending: 5,
                approvalRate: 75,
                averageDecisionTimeMinutes: 45,
                byType: {
                    credit_approval: 60,
                    limit_increase: 40,
                },
            };

            (service.getDecisionAnalytics as jest.Mock).mockResolvedValue(
                mockAnalytics
            );

            const result = await controller.getAnalytics('tenant-1');

            expect(result).toEqual(mockAnalytics);
            expect(service.getDecisionAnalytics).toHaveBeenCalledWith('tenant-1');
        });

        it('should handle analytics for tenant with no decisions', async () => {
            const emptyAnalytics = {
                total: 0,
                approved: 0,
                rejected: 0,
                pending: 0,
                approvalRate: 0,
            };

            (service.getDecisionAnalytics as jest.Mock).mockResolvedValue(
                emptyAnalytics
            );

            const result = await controller.getAnalytics('new-tenant');

            expect(result.total).toBe(0);
        });
    });

    describe('POST /credit-decisions/risk-score', () => {
        it('should calculate risk score for given factors', async () => {
            const factors = {
                amount: 75000,
                creditHistory: 'fair',
                industryRisk: 'medium',
                paymentHistory: 'good',
            };

            (service.calculateRiskScore as jest.Mock).mockResolvedValue(55);

            const result = await controller.calculateRiskScore(factors);

            expect(result.riskScore).toBe(55);
            expect(result.riskLevel).toBe('MEDIUM');
            expect(service.calculateRiskScore).toHaveBeenCalledWith(factors);
        });

        it('should categorize risk levels correctly', async () => {
            (service.calculateRiskScore as jest.Mock).mockResolvedValue(25);

            const result = await controller.calculateRiskScore({});

            expect(result.riskLevel).toBe('LOW');
        });
    });

    describe('error handling', () => {
        it('should handle service errors gracefully', async () => {
            (service.evaluateDecision as jest.Mock).mockRejectedValue(
                new Error('Service unavailable')
            );

            await expect(
                controller.evaluateDecision({} as any)
            ).rejects.toThrow('Service unavailable');
        });

        it('should propagate validation errors', async () => {
            (service.evaluateDecision as jest.Mock).mockRejectedValue(
                new Error('Validation failed: Invalid amount')
            );

            await expect(
                controller.evaluateDecision({
                    entityId: 'test',
                    entityType: 'invoice',
                    decisionType: 'credit_approval' as any,
                    requestedAmount: -1000, // Invalid
                })
            ).rejects.toThrow('Validation failed');
        });
    });
});
