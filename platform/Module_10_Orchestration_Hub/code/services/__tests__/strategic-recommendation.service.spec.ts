/**
 * StrategicRecommendationService Unit Tests
 * 
 * Tests for dynamic recommendation generation and ROI projection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StrategicRecommendationService } from '../strategic-recommendation.service';
import {
    IConstraint,
    ConstraintType,
    ConstraintSeverity,
    RecommendationType,
} from '../../types/orchestration.types';

describe('StrategicRecommendationService', () => {
    let service: StrategicRecommendationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StrategicRecommendationService],
        }).compile();

        service = module.get<StrategicRecommendationService>(StrategicRecommendationService);
    });

    describe('generateRecommendation', () => {
        it('should generate cash flow recommendation with high ROI', async () => {
            const constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CASH_FLOW,
                severity: ConstraintSeverity.CRITICAL,
                description: 'High outstanding receivables',
                impact_score: 85,
                identified_data: {
                    total_outstanding: 500000,
                    overdue_count: 25,
                    avg_overdue_days: 45,
                },
                status: 'active' as any,
                root_causes: ['Extended payment delays'],
                affected_modules: ['module_01', 'module_03'],
            };

            const recommendation = await service.generateRecommendation('tenant-123', constraint);

            expect(recommendation).toBeDefined();
            expect(recommendation.title).toContain('Cash Flow');
            expect(recommendation.estimated_roi_percentage).toBeGreaterThan(100);
            expect(recommendation.action_items.length).toBeGreaterThan(0);
            expect(recommendation.priority).toBeGreaterThan(5);
        });

        it('should generate appropriate action items for credit risk constraints', async () => {
            const constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CREDIT_RISK,
                severity: ConstraintSeverity.HIGH,
                description: 'Multiple high-risk customers',
                impact_score: 70,
                identified_data: {
                    high_risk_count: 8,
                    avg_score: 620,
                    concentration_risk_percentage: 35,
                },
                status: 'active' as any,
                root_causes: ['Insufficient credit screening'],
                affected_modules: ['module_06', 'module_07'],
            };

            const recommendation = await service.generateRecommendation('tenant-123', constraint);

            expect(recommendation.action_items.length).toBeGreaterThan(0);

            // Should include credit assessment action
            const hasAssessmentAction = recommendation.action_items.some(item =>
                item.title.toLowerCase().includes('credit') || item.title.toLowerCase().includes('assessment')
            );
            expect(hasAssessmentAction).toBe(true);

            // Should include high-risk review action with specific count
            const hasReviewAction = recommendation.action_items.some(item =>
                item.title.includes('8')
            );
            expect(hasReviewAction).toBe(true);
        });

        it('should estimate timeline based on constraint type', async () => {
            const cashFlowConstraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CASH_FLOW,
                severity: ConstraintSeverity.HIGH,
                description: 'Cash flow issue',
                impact_score: 75,
                identified_data: {},
                status: 'active' as any,
            };

            const strategicConstraint: IConstraint = {
                ...cashFlowConstraint,
                constraint_type: ConstraintType.CUSTOMER_SEGMENT,
            };

            const cashFlowRec = await service.generateRecommendation('tenant-123', cashFlowConstraint);
            const strategicRec = await service.generateRecommendation('tenant-123', strategicConstraint);

            // Cash flow should have shorter timeline than strategic changes
            expect(cashFlowRec.implementation_timeline_days).toBeLessThan(
                strategicRec.implementation_timeline_days!
            );
        });
    });

    describe('generateRecommendations', () => {
        it('should prioritize recommendations by impact and ROI', async () => {
            const constraints: IConstraint[] = [
                {
                    tenant_id: 'tenant-123',
                    constraint_type: ConstraintType.OPERATIONAL,
                    severity: ConstraintSeverity.MEDIUM,
                    description: 'Some drafts',
                    impact_score: 40,
                    identified_data: {},
                    status: 'active' as any,
                },
                {
                    tenant_id: 'tenant-123',
                    constraint_type: ConstraintType.CASH_FLOW,
                    severity: ConstraintSeverity.CRITICAL,
                    description: 'Critical cash flow',
                    impact_score: 90,
                    identified_data: {},
                    status: 'active' as any,
                },
                {
                    tenant_id: 'tenant-123',
                    constraint_type: ConstraintType.COLLECTION_EFFICIENCY,
                    severity: ConstraintSeverity.HIGH,
                    description: 'Collection issues',
                    impact_score: 70,
                    identified_data: {},
                    status: 'active' as any,
                },
            ];

            const recommendations = await service.generateRecommendations('tenant-123', constraints);

            expect(recommendations.length).toBe(3);

            // Top recommendation should be cash flow (highest impact + severity)
            expect(recommendations[0].constraint_type).toBe(ConstraintType.CASH_FLOW);

            // Should be sorted by priority (descending)
            for (let i = 0; i < recommendations.length - 1; i++) {
                expect(recommendations[i].priority).toBeGreaterThanOrEqual(recommendations[i + 1].priority);
            }
        });

        it('should mark top recommendation as "One Thing to Focus On"', async () => {
            const constraints: IConstraint[] = [
                {
                    tenant_id: 'tenant-123',
                    constraint_type: ConstraintType.CASH_FLOW,
                    severity: ConstraintSeverity.CRITICAL,
                    description: 'Critical issue',
                    impact_score: 95,
                    identified_data: {},
                    status: 'active' as any,
                },
                {
                    tenant_id: 'tenant-123',
                    constraint_type: ConstraintType.OPERATIONAL,
                    severity: ConstraintSeverity.LOW,
                    description: 'Minor issue',
                    impact_score: 30,
                    identified_data: {},
                    status: 'active' as any,
                },
            ];

            const recommendations = await service.generateRecommendations('tenant-123', constraints);

            // Top recommendation should be marked as "One Thing"
            expect(recommendations[0].description).toContain('PRIMARY FOCUS');
            expect(recommendations[0].description).toContain('Dr. Barnard');
            expect(recommendations[0].description).toContain('One Thing');
        });
    });

    describe('ROI Calculation', () => {
        it('should calculate higher ROI for cash flow constraints', async () => {
            const cashFlowConstraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CASH_FLOW,
                severity: ConstraintSeverity.HIGH,
                description: 'Cash flow',
                impact_score: 70,
                identified_data: {},
                status: 'active' as any,
            };

            const processConstraint: IConstraint = {
                ...cashFlowConstraint,
                constraint_type: ConstraintType.PROCESS,
            };

            const cashFlowRec = await service.generateRecommendation('tenant-123', cashFlowConstraint);
            const processRec = await service.generateRecommendation('tenant-123', processConstraint);

            expect(cashFlowRec.estimated_roi_percentage).toBeGreaterThan(
                processRec.estimated_roi_percentage!
            );
        });

        it('should apply severity multiplier to ROI', async () => {
            const criticalConstraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.COLLECTION_EFFICIENCY,
                severity: ConstraintSeverity.CRITICAL,
                description: 'Critical',
                impact_score: 70,
                identified_data: {},
                status: 'active' as any,
            };

            const mediumConstraint: IConstraint = {
                ...criticalConstraint,
                severity: ConstraintSeverity.MEDIUM,
            };

            const criticalRec = await service.generateRecommendation('tenant-123', criticalConstraint);
            const mediumRec = await service.generateRecommendation('tenant-123', mediumConstraint);

            expect(criticalRec.estimated_roi_percentage).toBeGreaterThan(
                mediumRec.estimated_roi_percentage!
            );
        });

        it('should cap ROI at 300%', async () => {
            const veryHighImpact Constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CASH_FLOW,
                severity: ConstraintSeverity.CRITICAL,
                description: 'Massive impact',
                impact_score: 200,
                identified_data: {},
                status: 'active' as any,
            };

            const recommendation = await service.generateRecommendation(
                'tenant-123',
                veryHighImpactConstraint
            );

            expect(recommendation.estimated_roi_percentage).toBeLessThanOrEqual(300);
        });
    });

    describe('Action Item Generation', () => {
        it('should include specific counts in action items', async () => {
            const constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.OPERATIONAL,
                severity: ConstraintSeverity.HIGH,
                description: 'Draft backlog',
                impact_score: 60,
                identified_data: {
                    draft_invoices: 45,
                    avg_send_delay_days: 3.5,
                },
                status: 'active' as any,
            };

            const recommendation = await service.generateRecommendation('tenant-123', constraint);

            // Should include specific number from data
            const hasDraftCount = recommendation.action_items.some(item =>
                item.title.includes('45') || item.description.includes('45')
            );
            expect(hasDraftCount).toBe(true);
        });

        it('should estimate effort in hours for each action', async () => {
            const constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CREDIT_RISK,
                severity: ConstraintSeverity.HIGH,
                description: 'Risk',
                impact_score: 65,
                identified_data: { high_risk_count: 10 },
                status: 'active' as any,
            };

            const recommendation = await service.generateRecommendation('tenant-123', constraint);

            recommendation.action_items.forEach(item => {
                expect(item.estimated_effort_hours).toBeGreaterThan(0);
                expect(item.expected_completion_days).toBeGreaterThan(0);
            });
        });
    });

    describe('Success Metrics', () => {
        it('should define measurable success metrics', async () => {
            const constraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.CASH_FLOW,
                severity: ConstraintSeverity.HIGH,
                description: 'Cash flow',
                impact_score: 75,
                identified_data: {},
                status: 'active' as any,
            };

            const recommendation = await service.generateRecommendation('tenant-123', constraint);

            expect(recommendation.success_metrics).toBeDefined();
            expect(recommendation.success_metrics!.length).toBeGreaterThan(0);

            // Metrics should include specific targets
            const hasTarget = recommendation.success_metrics!.some(metric =>
                metric.includes('%') || metric.includes('days') || metric.includes('reduced')
            );
            expect(hasTarget).toBe(true);
        });
    });

    describe('Risk Assessment', () => {
        it('should identify risks for complex implementations', async () => {
            const complexConstraint: IConstraint = {
                tenant_id: 'tenant-123',
                constraint_type: ConstraintType.PROCESS,
                severity: ConstraintSeverity.HIGH,
                description: 'Complex',
                impact_score: 70,
                identified_data: {},
                status: 'active' as any,
                affected_modules: ['module_01', 'module_02', 'module_03', 'module_05'], // Many modules
            };

            const recommendation = await service.generateRecommendation('tenant-123', complexConstraint);

            expect(recommendation.risk_factors).toBeDefined();
            expect(recommendation.risk_factors!.length).toBeGreaterThan(0);

            // Should mention multi-module coordination
            const hasCoordinationRisk = recommendation.risk_factors!.some(risk =>
                risk.includes('module') || risk.includes('coordination')
            );
            expect(hasCoordinationRisk).toBe(true);
        });
    });
});
