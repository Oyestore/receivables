import { Test, TestingModule } from '@nestjs/testing';
import { NetworkCreditIntelligenceController } from './network-credit-intelligence.controller';
import { NetworkCreditIntelligenceService } from './network-credit-intelligence.service';
import { NetworkPatternDetectionService } from './network-pattern-detection.service';

describe('NetworkCreditIntelligenceController', () => {
    let controller: NetworkCreditIntelligenceController;
    let networkService: NetworkCreditIntelligenceService;
    let patternService: NetworkPatternDetectionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NetworkCreditIntelligenceController],
            providers: [
                {
                    provide: NetworkCreditIntelligenceService,
                    useValue: {
                        getCommunityScore: jest.fn(),
                        contributePaymentObservation: jest.fn(),
                        registerTenant: jest.fn(),
                        getNetworkIntelligence: jest.fn(),
                    },
                },
                {
                    provide: NetworkPatternDetectionService,
                    useValue: {
                        getNetworkInsights: jest.fn(),
                        detectEmergingRisks: jest.fn(),
                        getIndustryPaymentTrends: jest.fn(),
                        getPeerBenchmarking: jest.fn(),
                        getTrustScoreDistribution: jest.fn(),
                        compareBuyerToNetwork: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<NetworkCreditIntelligenceController>(
            NetworkCreditIntelligenceController,
        );
        networkService = module.get<NetworkCreditIntelligenceService>(
            NetworkCreditIntelligenceService,
        );
        patternService = module.get<NetworkPatternDetectionService>(
            NetworkPatternDetectionService,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('GET /score/:buyerPAN', () => {
        it('should return community score', async () => {
            const mockScore = {
                communityScore: 87,
                trustTier: 'Platinum',
                accessGranted: true,
            };

            jest.spyOn(networkService, 'getCommunityScore').mockResolvedValue(mockScore);

            const result = await controller.getCommunityScore('ABCDE1234F', 'tenant-123');

            expect(result.communityScore).toBe(87);
            expect(result.trustTier).toBe('Platinum');
            expect(networkService.getCommunityScore).toHaveBeenCalledWith(
                'ABCDE1234F',
                'tenant-123',
            );
        });

        it('should deny access for unauthorized tenants', async () => {
            const mockScore = {
                accessGranted: false,
                upgradeRequired: true,
            };

            jest.spyOn(networkService, 'getCommunityScore').mockResolvedValue(mockScore);

            const result = await controller.getCommunityScore('ABCDE1234F', 'tenant-123');

            expect(result.accessGranted).toBe(false);
        });
    });

    describe('POST /contribute', () => {
        it('should accept payment observation', async () => {
            const payload = {
                tenantId: 'tenant-123',
                buyerPAN: 'ABCDE1234F',
                paymentData: {
                    daysToPay: 45,
                    invoiceAmount: 500000,
                    transactionDate: new Date(),
                    paidOnTime: false,
                    hadDispute: false,
                    industryCode: 'C2520',
                    region: 'Maharashtra',
                    revenueClass: 'MEDIUM',
                },
            };

            jest.spyOn(networkService, 'contributePaymentObservation').mockResolvedValue();

            const result = await controller.contributeObservation(payload);

            expect(result.success).toBe(true);
            expect(networkService.contributePaymentObservation).toHaveBeenCalled();
        });
    });

    describe('POST /register', () => {
        it('should register tenant for network', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                contributionTier: 'STANDARD',
            };

            jest.spyOn(networkService, 'registerTenant').mockResolvedValue(mockContribution as any);

            const result = await controller.registerTenant({ tenantId: 'tenant-123' });

            expect(result.success).toBe(true);
            expect(result.contribution.contributionTier).toBe('STANDARD');
        });
    });

    describe('GET /intelligence', () => {
        it('should return network intelligence', async () => {
            const mockIntelligence = [
                { type: 'EMERGING_RISK', severity: 'HIGH', title: 'Test alert' },
            ];

            jest.spyOn(networkService, 'getNetworkIntelligence').mockResolvedValue(
                mockIntelligence as any,
            );

            const result = await controller.getNetworkIntelligence('tenant-123');

            expect(result.count).toBe(1);
            expect(result.intelligence).toHaveLength(1);
        });
    });

    describe('GET /insights/dashboard/:tenantId', () => {
        it('should return dashboard insights', async () => {
            const mockInsights = {
                networkMetrics: { totalBuyers: 100000 },
                contribution: { tier: 'STANDARD' },
            };

            jest.spyOn(patternService, 'getNetworkInsights').mockResolvedValue(mockInsights);

            const result = await controller.getNetworkInsights('tenant-123');

            expect(result.networkMetrics).toBeDefined();
        });
    });

    describe('GET /patterns/emerging-risks', () => {
        it('should return emerging risk patterns', async () => {
            const mockPatterns = [
                { pattern: 'Industry deterioration', riskLevel: 'HIGH' },
            ];

            jest.spyOn(patternService, 'detectEmergingRisks').mockResolvedValue(mockPatterns);

            const result = await controller.getEmergingRisks('tenant-123');

            expect(result.count).toBe(1);
            expect(result.patterns).toHaveLength(1);
        });
    });

    describe('GET /trends/industry/:industryCode', () => {
        it('should return industry trends', async () => {
            const mockTrends = {
                industry: 'C2520',
                trends: [],
            };

            jest.spyOn(patternService, 'getIndustryPaymentTrends').mockResolvedValue(mockTrends);

            const result = await controller.getIndustryTrends('C2520');

            expect(result.industry).toBe('C2520');
        });
    });

    describe('authorization', () => {
        it('should have JWT and Roles guards applied', () => {
            const guards = Reflect.getMetadata('__guards__', NetworkCreditIntelligenceController);

            expect(guards).toBeDefined();
        });
    });
});
