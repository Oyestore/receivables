import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkPatternDetectionService } from './network-pattern-detection.service';
import { NetworkPaymentObservation } from './network-payment-observation.entity';
import { NetworkBuyerProfile } from './network-buyer-profile.entity';
import { NetworkIntelligence } from './network-intelligence.entity';
import { TenantContribution } from './tenant-contribution.entity';

describe('NetworkPatternDetectionService', () => {
    let service: NetworkPatternDetectionService;
    let observationRepo: Repository<NetworkPaymentObservation>;
    let intelligenceRepo: Repository<NetworkIntelligence>;

    const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
        getMany: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NetworkPatternDetectionService,
                {
                    provide: getRepositoryToken(NetworkPaymentObservation),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(NetworkBuyerProfile),
                    useValue: {
                        findOne: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(NetworkIntelligence),
                    useValue: {
                        save: jest.fn(),
                        find: jest.fn(),
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(TenantContribution),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<NetworkPatternDetectionService>(NetworkPatternDetectionService);
        observationRepo = module.get<Repository<NetworkPaymentObservation>>(
            getRepositoryToken(NetworkPaymentObservation),
        );
        intelligenceRepo = module.get<Repository<NetworkIntelligence>>(
            getRepositoryToken(NetworkIntelligence),
        );
    });

    describe('detectEmergingRisks', () => {
        it('should detect selective late payment patterns', async () => {
            const mockBuyers = [
                {
                    obs_globalBuyerId: 'buyer123',
                    tenantCount: 5,
                    avgOnTimeRate: 0.6,
                    paymentVariability: 20,
                },
            ];

            mockQueryBuilder.getRawMany.mockResolvedValue(mockBuyers);
            jest.spyOn(intelligenceRepo, 'save').mockResolvedValue({} as any);

            const patterns = await service.detectEmergingRisks();

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].pattern).toContain('strategic late payer');
        });

        it('should detect industry deterioration', async () => {
            const mockIndustries = ['C2520'];

            jest.spyOn(service as any, 'getActiveIndustries').mockResolvedValue(mockIndustries);
            jest.spyOn(service as any, 'getIndustryMetrics')
                .mockResolvedValueOnce({ avgDaysToPay: 45, buyerCount: 100 }) // Recent
                .mockResolvedValueOnce({ avgDaysToPay: 30, buyerCount: 100 }); // Baseline

            const patterns = await service.detectEmergingRisks();

            expect(patterns.some((p) => p.pattern.includes('Industry-wide'))).toBe(true);
        });
    });

    describe('getNetworkInsights', () => {
        it('should return network insights for tenant', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                contributionTier: 'STANDARD',
                buyersShared: 50,
            };

            jest.spyOn(module.get(getRepositoryToken(TenantContribution)), 'findOne').mockResolvedValue(
                mockContribution as any,
            );
            jest.spyOn(module.get(getRepositoryToken(NetworkBuyerProfile)), 'count').mockResolvedValue(
                100000,
            );

            const insights = await service.getNetworkInsights('tenant-123');

            expect(insights.networkMetrics).toBeDefined();
            expect(insights.contribution).toBeDefined();
        });
    });

    describe('getIndustryPaymentTrends', () => {
        it('should return 12-month trend data', async () => {
            jest.spyOn(service as any, 'getIndustryMetrics').mockResolvedValue({
                avgDaysToPay: 35,
                onTimeRate: 85,
                transactionCount: 1000,
            });

            const trends = await service.getIndustryPaymentTrends('C2520');

            expect(trends.trends).toHaveLength(12);
            expect(trends.industry).toBe('C2520');
        });
    });
});
