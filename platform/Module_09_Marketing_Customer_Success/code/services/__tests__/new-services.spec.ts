import { Test, TestingModule } from '@nestjs/testing';
import { ProductUsageAnalyticsService } from '../product-usage-analytics.service';
import { AutomatedPlaybookService, PlaybookTrigger } from '../automated-playbook.service';
import { MLChurnPredictionService } from '../ml-churn-prediction.service';
import { NetworkIntelligenceService } from '../network-intelligence.service';
import { ViralWorkflowService, MagicMomentTrigger } from '../viral-workflow.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Comprehensive Test Suite for Module 09 New Services
 * 
 * Tests all newly implemented Phase 9.2 and 9.5 services
 */

describe('Module 09 - Phase 9.2 & 9.5 Services', () => {
    let productUsageService: ProductUsageAnalyticsService;
    let playbookService: AutomatedPlaybookService;
    let churnPredictionService: MLChurnPredictionService;
    let networkIntelService: NetworkIntelligenceService;
    let viralWorkflowService: ViralWorkflowService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductUsageAnalyticsService,
                AutomatedPlaybookService,
                MLChurnPredictionService,
                NetworkIntelligenceService,
                ViralWorkflowService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        productUsageService = module.get<ProductUsageAnalyticsService>(
            ProductUsageAnalyticsService,
        );
        playbookService = module.get<AutomatedPlaybookService>(
            AutomatedPlaybookService,
        );
        churnPredictionService = module.get<MLChurnPredictionService>(
            MLChurnPredictionService,
        );
        networkIntelService = module.get<NetworkIntelligenceService>(
            NetworkIntelligenceService,
        );
        viralWorkflowService = module.get<ViralWorkflowService>(
            ViralWorkflowService,
        );
    });

    // ========================================================================
    // PRODUCT USAGE ANALYTICS TESTS
    // ========================================================================

    describe('ProductUsageAnalyticsService', () => {
        it('should be defined', () => {
            expect(productUsageService).toBeDefined();
        });

        it('should track feature usage', async () => {
            await expect(
                productUsageService.trackFeatureUsage({
                    tenantId: 'tenant_001',
                    customerId: 'cust_001',
                    featureName: 'invoice_creation',
                    moduleId: 'module_01',
                    action: 'create',
                    timestamp: new Date(),
                }),
            ).resolves.not.toThrow();
        });

        it('should calculate usage metrics', async () => {
            const metrics = await productUsageService.getCustomerUsageMetrics(
                'tenant_001',
                'cust_001',
            );

            expect(metrics).toHaveProperty('customerId');
            expect(metrics).toHaveProperty('engagementScore');
            expect(metrics).toHaveProperty('features');
            expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
            expect(metrics.engagementScore).toBeLessThanOrEqual(100);
            expect(Array.isArray(metrics.features)).toBe(true);
        });

        it('should identify adoption gaps', async () => {
            const gaps = await productUsageService.identifyAdoptionGaps(
                'tenant_001',
                'cust_001',
            );

            expect(gaps).toHaveProperty('unutilizedFeatures');
            expect(gaps).toHaveProperty('underutilizedFeatures');
            expect(gaps).toHaveProperty('recommendations');
            expect(Array.isArray(gaps.recommendations)).toBe(true);
        });

        it('should compare with cohort', async () => {
            const comparison = await productUsageService.getCohortUsageComparison(
                'tenant_001',
                'cust_001',
            );

            expect(comparison).toHaveProperty('customerUsage');
            expect(comparison).toHaveProperty('cohortAverage');
            expect(comparison).toHaveProperty('percentile');
            expect(comparison.comparison).toMatch(/above_average|average|below_average/);
        });
    });

    // ========================================================================
    // AUTOMATED PLAYBOOK TESTS
    // ========================================================================

    describe('AutomatedPlaybookService', () => {
        it('should be defined', () => {
            expect(playbookService).toBeDefined();
        });

        it('should execute playbook for trigger', async () => {
            const execution = await playbookService.executePlaybook(
                'tenant_001',
                'cust_001',
                PlaybookTrigger.LOW_ENGAGEMENT,
                { reason: 'test' },
            );

            expect(execution).toBeDefined();
            expect(execution.playbookId).toBeDefined();
            expect(execution.status).toBe('running');
        });

        it('should have default playbooks registered', () => {
            const playbooks = playbookService.getActivePlaybooks();
            expect(playbooks.length).toBeGreaterThan(0);
        });

        it('should allow custom playbook registration', () => {
            playbookService.registerPlaybook({
                id: 'test_playbook',
                name: 'Test Playbook',
                description: 'Test',
                trigger: PlaybookTrigger.CHURN_RISK_HIGH,
                active: true,
                priority: 'high',
                steps: [],
            });

            const playbooks = playbookService.getActivePlaybooks();
            expect(playbooks.some(p => p.id === 'test_playbook')).toBe(true);
        });

        it('should toggle playbook activation', () => {
            const playbooks = playbookService.getActivePlaybooks();
            const firstPlaybook = playbooks[0];

            playbookService.togglePlaybook(firstPlaybook.id, false);
            expect(playbooks.find(p => p.id === firstPlaybook.id).active).toBe(false);

            playbookService.togglePlaybook(firstPlaybook.id, true);
            expect(playbooks.find(p => p.id === firstPlaybook.id).active).toBe(true);
        });
    });

    // ========================================================================
    // ML CHURN PREDICTION TESTS
    // ========================================================================

    describe('MLChurnPredictionService', () => {
        it('should be defined', () => {
            expect(churnPredictionService).toBeDefined();
        });

        it('should predict churn probability', async () => {
            const prediction = await churnPredictionService.predictChurn({
                customerId: 'cust_001',
                usageMetrics: {
                    daysActive: 180,
                    loginFrequency: 3,
                    avgSessionDuration: 25,
                    featureAdoptionRate: 0.6,
                    lastLoginDays: 7,
                },
                financialMetrics: {
                    totalRevenue: 500000,
                    avgInvoiceValue: 50000,
                    paymentReliability: 0.9,
                    outstandingAmount: 100000,
                },
                engagementMetrics: {
                    emailOpenRate: 0.4,
                    supportTickets: 2,
                    npsScore: 8,
                    lastContactDays: 15,
                },
            });

            expect(prediction).toHaveProperty('churnProbability');
            expect(prediction).toHaveProperty('riskLevel');
            expect(prediction).toHaveProperty('topRiskFactors');
            expect(prediction).toHaveProperty('interventions');
            expect(prediction.churnProbability).toBeGreaterThanOrEqual(0);
            expect(prediction.churnProbability).toBeLessThanOrEqual(1);
            expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);
        });

        it('should batch predict churn', async () => {
            const inputs = [
                {
                    customerId: 'cust_001',
                    usageMetrics: {
                        daysActive: 180,
                        loginFrequency: 3,
                        avgSessionDuration: 25,
                        featureAdoptionRate: 0.6,
                        lastLoginDays: 7,
                    },
                    financialMetrics: {
                        totalRevenue: 500000,
                        avgInvoiceValue: 50000,
                        paymentReliability: 0.9,
                        outstandingAmount: 100000,
                    },
                    engagementMetrics: {
                        emailOpenRate: 0.4,
                        supportTickets: 2,
                        lastContactDays: 15,
                    },
                },
            ];

            const predictions = await churnPredictionService.batchPredictChurn(inputs);
            expect(predictions).toHaveLength(1);
            expect(predictions[0].customerId).toBe('cust_001');
        });

        it('should provide cohort analysis', async () => {
            const predictions = await churnPredictionService.batchPredictChurn([
                {
                    customerId: 'cust_001',
                    usageMetrics: { daysActive: 180, loginFrequency: 3, avgSessionDuration: 25, featureAdoptionRate: 0.6, lastLoginDays: 7 },
                    financialMetrics: { totalRevenue: 500000, avgInvoiceValue: 50000, paymentReliability: 0.9, outstandingAmount: 100000 },
                    engagementMetrics: { emailOpenRate: 0.4, supportTickets: 2, lastContactDays: 15 },
                },
            ]);

            const analysis = await churnPredictionService.getCohortAnalysis(predictions);

            expect(analysis).toHaveProperty('distribution');
            expect(analysis).toHaveProperty('avgChurnProbability');
            expect(analysis).toHaveProperty('topRiskFactors');
            expect(analysis).toHaveProperty('recommendedActions');
        });
    });

    // ========================================================================
    // NETWORK INTELLIGENCE TESTS
    // ========================================================================

    describe('NetworkIntelligenceService', () => {
        it('should be defined', () => {
            expect(networkIntelService).toBeDefined();
        });

        it('should collect network events', async () => {
            await expect(
                networkIntelService.collectEvent({
                    tenantId: 'tenant_001',
                    industry: 'technology',
                    companySize: 'medium',
                    eventType: 'payment_received',
                    value: 35,
                    timestamp: new Date(),
                }),
            ).resolves.not.toThrow();
        });

        it('should get benchmarks', async () => {
            const benchmark = await networkIntelService.getBenchmark({
                metric: 'dso',
                industry: 'technology',
                companySize: 'medium',
            });

            expect(benchmark).toHaveProperty('networkAverage');
            expect(benchmark).toHaveProperty('top10Percent');
            expect(benchmark).toHaveProperty('sampleSize');
            expect(benchmark.networkAverage).toBeGreaterThan(0);
        });

        it('should get actionable insights', async () => {
            const insights = await networkIntelService.getActionableInsights(
                'tenant_001',
                'cust_001',
                {
                    industry: 'technology',
                    companySize: 'medium',
                    metrics: { dso: 45, collection_rate: 0.85 },
                },
            );

            expect(Array.isArray(insights)).toBe(true);
            insights.forEach(insight => {
                expect(insight).toHaveProperty('type');
                expect(insight).toHaveProperty('title');
                expect(insight).toHaveProperty('impact');
                expect(insight).toHaveProperty('action');
            });
        });

        it('should get crowd credit insight', async () => {
            const insight = await networkIntelService.getCrowdCreditInsight('cust_001');

            expect(insight).toHaveProperty('riskScore');
            expect(insight).toHaveProperty('peerReports');
            expect(insight).toHaveProperty('paymentReliability');
            expect(insight).toHaveProperty('insights');
            expect(Array.isArray(insight.insights)).toBe(true);
        });

        it('should predict payment date', async () => {
            const prediction = await networkIntelService.predictPaymentDate({
                customerId: 'cust_001',
                amount: 100000,
                industry: 'technology',
                paymentTerms: 30,
                historicalBehavior: [],
            });

            expect(prediction).toHaveProperty('predictedDate');
            expect(prediction).toHaveProperty('confidence');
            expect(prediction).toHaveProperty('reasoning');
            expect(prediction.predictedDate instanceof Date).toBe(true);
        });
    });

    // ========================================================================
    // VIRAL WORKFLOW TESTS
    // ========================================================================

    describe('ViralWorkflowService', () => {
        let eventEmitter: EventEmitter2;

        beforeEach(() => {
            eventEmitter = new EventEmitter2();
            viralWorkflowService = new ViralWorkflowService(eventEmitter);
        });

        it('should be defined', () => {
            expect(viralWorkflowService).toBeDefined();
        });

        it('should create viral opportunity', async () => {
            const opportunity = await viralWorkflowService.createViralOpportunity(
                MagicMomentTrigger.NEW_CUSTOMER_INVOICE,
                {
                    userId: 'user_001',
                    customerId: 'cust_001',
                    customerName: 'Test Customer',
                    invoiceId: 'inv_001',
                    amount: 100000,
                    tenantId: 'tenant_001',
                },
            );

            expect(opportunity).toHaveProperty('id');
            expect(opportunity).toHaveProperty('type');
            expect(opportunity).toHaveProperty('emotion');
            expect(opportunity).toHaveProperty('cta');
            expect(opportunity.trigger).toBe(MagicMomentTrigger.NEW_CUSTOMER_INVOICE);
        });

        it('should track viral action', async () => {
            await expect(
                viralWorkflowService.trackViralAction({
                    opportunityId: 'opp_001',
                    actionTaken: 'primary',
                    userId: 'user_001',
                    timestamp: new Date(),
                }),
            ).resolves.not.toThrow();
        });

        it('should calculate viral coefficient', async () => {
            const coefficient = await viralWorkflowService.calculateViralCoefficient();

            expect(coefficient).toHaveProperty('overall');
            expect(coefficient).toHaveProperty('byOpportunityType');
            expect(coefficient).toHaveProperty('trend');
            expect(coefficient.overall).toBeGreaterThan(0);
            expect(['increasing', 'stable', 'decreasing']).toContain(coefficient.trend);
        });
    });

    // ========================================================================
    // INTEGRATION TESTS
    // ========================================================================

    describe('Cross-Service Integration', () => {
        it('should integrate churn prediction with automated playbooks', async () => {
            const prediction = await churnPredictionService.predictChurn({
                customerId: 'cust_001',
                usageMetrics: {
                    daysActive: 90,
                    loginFrequency: 1,
                    avgSessionDuration: 10,
                    featureAdoptionRate: 0.3,
                    lastLoginDays: 45,
                },
                financialMetrics: {
                    totalRevenue: 100000,
                    avgInvoiceValue: 20000,
                    paymentReliability: 0.6,
                    outstandingAmount: 50000,
                },
                engagementMetrics: {
                    emailOpenRate: 0.15,
                    supportTickets: 8,
                    lastContactDays: 60,
                },
            });

            if (prediction.riskLevel === 'high' || prediction.riskLevel === 'critical') {
                const execution = await playbookService.executePlaybook(
                    'tenant_001',
                    prediction.customerId,
                    PlaybookTrigger.CHURN_RISK_HIGH,
                    { churnProbability: prediction.churnProbability },
                );

                expect(execution).toBeDefined();
                expect(execution.status).toBe('running');
            }
        });

        it('should use network intelligence for personalized insights', async () => {
            const usageMetrics = await productUsageService.getCustomerUsageMetrics(
                'tenant_001',
                'cust_001',
            );

            const insights = await networkIntelService.getActionableInsights(
                'tenant_001',
                'cust_001',
                {
                    industry: 'technology',
                    companySize: 'medium',
                    metrics: {
                        engagement_score: usageMetrics.engagementScore,
                    },
                },
            );

            expect(insights).toBeDefined();
            expect(Array.isArray(insights)).toBe(true);
        });
    });
});
