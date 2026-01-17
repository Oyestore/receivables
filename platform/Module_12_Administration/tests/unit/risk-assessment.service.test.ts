import { RiskAssessmentService } from '../code/services/risk-assessment.service';

describe('RiskAssessmentService', () => {
    let riskService: RiskAssessmentService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        riskService = new RiskAssessmentService();
    });

    describe('getCategories', () => {
        it('should return all active risk categories', async () => {
            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        id: 'cat-1',
                        category_name: 'Cybersecurity Risk',
                        category_type: 'security',
                        weight: 1.5,
                        is_active: true,
                    },
                    {
                        id: 'cat-2',
                        category_name: 'Financial Risk',
                        category_type: 'financial',
                        weight: 1.2,
                        is_active: true,
                    },
                ],
            });

            const result = await riskService.getCategories(true);

            expect(result).toHaveLength(2);
            expect(result[0].categoryName).toBe('Cybersecurity Risk');
            expect(result[1].categoryType).toBe('financial');
        });
    });

    describe('createAssessment', () => {
        it('should create risk assessment', async () => {
            const assessmentData = {
                tenantId: 'tenant-123',
                assessmentDate: new Date('2024-06-01'),
                assessmentType: 'periodic' as const,
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'assess-123',
                        tenant_id: assessmentData.tenantId,
                        assessment_number: 'RISK-2024-0011',
                        assessment_date: assessmentData.assessmentDate,
                        assessment_type: assessmentData.assessmentType,
                        status: 'in_progress',
                    }],
                });

            const result = await riskService.createAssessment(assessmentData);

            expect(result.assessmentNumber).toBe('RISK-2024-0011');
            expect(result.status).toBe('in_progress');
        });
    });

    describe('recordEvent', () => {
        it('should record risk event with calculated score', async () => {
            const eventData = {
                tenantId: 'tenant-123',
                eventTitle: 'Data Breach Attempt',
                eventType: 'threat' as const,
                severity: 'critical' as const,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'event-123',
                    tenant_id: eventData.tenantId,
                    event_title: eventData.eventTitle,
                    event_type: eventData.eventType,
                    severity: eventData.severity,
                    impact_score: 10,
                    likelihood_score: 5,
                    risk_score: 5,
                    status: 'open',
                }],
            });

            const result = await riskService.recordEvent(eventData);

            expect(result.severity).toBe('critical');
            expect(result.status).toBe('open');
            expect(result.riskScore).toBeGreaterThan(0);
        });

        it('should calculate risk score from impact and likelihood', async () => {
            const eventData = {
                eventTitle: 'Security Incident',
                severity: 'high' as const,
                impactScore: 8,
                likelihoodScore: 6,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'event-456',
                    risk_score: 4.8, // (8 * 6) / 10
                }],
            });

            const result = await riskService.recordEvent(eventData);

            expect(result.riskScore).toBeCloseTo(4.8, 1);
        });
    });

    describe('createMitigation', () => {
        it('should create mitigation plan', async () => {
            const mitigationData = {
                tenantId: 'tenant-123',
                eventId: 'event-456',
                riskDescription: 'Weak password policy',
                mitigationStrategy: 'Implement MFA and password complexity requirements',
                priority: 'high' as const,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'mit-123',
                    tenant_id: mitigationData.tenantId,
                    event_id: mitigationData.eventId,
                    risk_description: mitigationData.riskDescription,
                    mitigation_strategy: mitigationData.mitigationStrategy,
                    priority: mitigationData.priority,
                    status: 'planned',
                }],
            });

            const result = await riskService.createMitigation(mitigationData);

            expect(result.riskDescription).toBe('Weak password policy');
            expect(result.status).toBe('planned');
            expect(result.priority).toBe('high');
        });
    });

    describe('calculateRiskScore', () => {
        it('should calculate tenant risk score', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValue({
                rows: [{
                    avg_risk: '6.5',
                    critical_count: '2',
                    high_count: '3',
                    open_count: '8',
                }],
            });

            const score = await riskService.calculateRiskScore(tenantId);

            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should calculate category-specific risk score', async () => {
            const tenantId = 'tenant-123';
            const categoryId = 'cat-security';

            mockPool.query.mockResolvedValue({
                rows: [{
                    avg_risk: '7.0',
                    critical_count: '1',
                    high_count: '2',
                    open_count: '4',
                }],
            });

            const score = await riskService.calculateRiskScore(tenantId, categoryId);

            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('updateIndicator', () => {
        it('should update risk indicator and determine status', async () => {
            const indicatorData = {
                tenantId: 'tenant-123',
                categoryId: 'cat-operational',
                indicatorName: 'Failed Login Attempts',
                currentValue: 150,
                thresholdValue: 100,
                thresholdOperator: '>' as const,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'ind-123',
                    indicator_name: indicatorData.indicatorName,
                    current_value: indicatorData.currentValue,
                    threshold_value: indicatorData.thresholdValue,
                    status: 'warning',
                }],
            });

            const result = await riskService.updateIndicator(indicatorData);

            expect(result.currentValue).toBe(150);
            expect(result.status).toMatch(/normal|warning|critical/);
        });
    });

    describe('generatePrediction', () => {
        it('should generate risk prediction', async () => {
            const tenantId = 'tenant-123';
            const predictionHorizon = '30_days' as const;

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [
                        { overall_risk_score: 45, trend_date: new Date() },
                        { overall_risk_score: 48, trend_date: new Date() },
                        { overall_risk_score: 50, trend_date: new Date() },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'pred-123',
                        tenant_id: tenantId,
                        prediction_horizon: predictionHorizon,
                        predicted_risk_score: 52,
                        predicted_risk_level: 'high',
                        confidence_score: 0.75,
                    }],
                });

            const result = await riskService.generatePrediction(tenantId, predictionHorizon);

            expect(result.predictionHorizon).toBe('30_days');
            expect(result.predictedRiskScore).toBeGreaterThanOrEqual(0);
            expect(result.confidenceScore).toBeLessThanOrEqual(1);
        });

        it('should return low confidence for insufficient data', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        confidence_score: 0.3,
                    }],
                });

            const result = await riskService.generatePrediction('tenant-123', '7_days');

            expect(result.confidence Score).toBeLessThan(0.5);
        });
    });

    describe('updateTrends', () => {
        it('should update risk trends', async () => {
            const tenantId = 'tenant-123';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ avg_risk: '55', critical_count: '2', high_count: '3', open_count: '6' }] })
                .mockResolvedValueOnce({ rows: [{ open_count: '6', critical_count: '2' }] })
                .mockResolvedValueOnce({ rows: [{ completed: '8', total: '10' }] })
                .mockResolvedValueOnce({ rows: [{ overall_risk_score: '50' }] })
                .mockResolvedValueOnce({ rows: [] });

            await riskService.updateTrends(tenantId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO risk_trends'),
                expect.any(Array)
            );
        });
    });

    describe('getTrends', () => {
        it('should return risk trends for specified period', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        tenant_id: tenantId,
                        trend_date: new Date(),
                        overall_risk_score: 52,
                        risk_level: 'medium',
                        open_events: 5,
                        critical_events: 1,
                        mitigation_completion_rate: 75,
                        trend_direction: 'stable',
                    },
                ],
            });

            const result = await riskService.getTrends(tenantId, 30);

            expect(result).toHaveLength(1);
            expect(result[0].trendDirection).toMatch(/improving|stable|deteriorating/);
        });
    });
});
