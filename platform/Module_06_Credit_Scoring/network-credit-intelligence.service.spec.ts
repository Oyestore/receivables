import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkCreditIntelligenceService } from './network-credit-intelligence.service';
import { NetworkBuyerProfile } from './network-buyer-profile.entity';
import { NetworkPaymentObservation } from './network-payment-observation.entity';
import { TenantContribution } from './tenant-contribution.entity';
import { NetworkIntelligence } from './network-intelligence.entity';
import { BuyerProfile } from './buyer-profile.entity';

describe('NetworkCreditIntelligenceService', () => {
    let service: NetworkCreditIntelligenceService;
    let networkBuyerRepo: Repository<NetworkBuyerProfile>;
    let observationRepo: Repository<NetworkPaymentObservation>;
    let contributionRepo: Repository<TenantContribution>;

    const mockRepositoryFactory = () => ({
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            having: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn(),
            getRawOne: jest.fn(),
            getMany: jest.fn(),
        })),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NetworkCreditIntelligenceService,
                {
                    provide: getRepositoryToken(NetworkBuyerProfile),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(NetworkPaymentObservation),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(TenantContribution),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(NetworkIntelligence),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(BuyerProfile),
                    useFactory: mockRepositoryFactory,
                },
            ],
        }).compile();

        service = module.get<NetworkCreditIntelligenceService>(NetworkCreditIntelligenceService);
        networkBuyerRepo = module.get<Repository<NetworkBuyerProfile>>(
            getRepositoryToken(NetworkBuyerProfile),
        );
        observationRepo = module.get<Repository<NetworkPaymentObservation>>(
            getRepositoryToken(NetworkPaymentObservation),
        );
        contributionRepo = module.get<Repository<TenantContribution>>(
            getRepositoryToken(TenantContribution),
        );
    });

    describe('getCommunityScore', () => {
        it('should return community score for existing buyer', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                benefits: { communityScoreAccess: true },
                networkScoresAccessed: 0,
            };

            const mockNetworkProfile = {
                globalBuyerId: 'hash123',
                communityScore: 87,
                trustTier: 'Platinum',
                dataPoints: 247,
                confidence: 94,
                aggregateMetrics: { avgDaysToPay: 32 },
                industryRank: 12,
                trendDirection: 'improving',
                trustBadges: ['Verified by 50+ businesses'],
            };

            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(mockContribution as any);
            jest.spyOn(networkBuyerRepo, 'findOne').mockResolvedValue(mockNetworkProfile as any);
            jest.spyOn(contributionRepo, 'save').mockResolvedValue(mockContribution as any);

            const result = await service.getCommunityScore('ABCDE1234F', 'tenant-123');

            expect(result.communityScore).toBe(87);
            expect(result.trustTier).toBe('Platinum');
            expect(result.accessGranted).toBe(true);
        });

        it('should deny access for tenants without permission', async () => {
            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(null);

            const result = await service.getCommunityScore('ABCDE1234F', 'tenant-123');

            expect(result.accessGranted).toBe(false);
            expect(result.upgradeRequired).toBe(true);
        });

        it('should return neutral score for new buyers', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                benefits: { communityScoreAccess: true },
            };

            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(mockContribution as any);
            jest.spyOn(networkBuyerRepo, 'findOne').mockResolvedValue(null);

            const result = await service.getCommunityScore('NEW123', 'tenant-123');

            expect(result.communityScore).toBe(50); // Neutral score
            expect(result.trustTier).toBe('Bronze');
            expect(result.dataPoints).toBe(0);
        });
    });

    describe('contributePaymentObservation', () => {
        it('should contribute observation with anonymization', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                optInToNetworkSharing: true,
                privacySettings: { sharePaymentHistory: true },
                transactionsShared: 0,
            };

            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(mockContribution as any);
            jest.spyOn(observationRepo, 'save').mockResolvedValue({} as any);
            jest.spyOn(contributionRepo, 'save').mockResolvedValue(mockContribution as any);

            await service.contributePaymentObservation('tenant-123', 'ABCDE1234F', {
                daysToPay: 45,
                invoiceAmount: 500000,
                transactionDate: new Date(),
                paidOnTime: false,
                hadDispute: false,
                industryCode: 'C2520',
                region: 'Maharashtra',
                revenueClass: 'MEDIUM',
            });

            expect(observationRepo.save).toHaveBeenCalled();
            expect(contributionRepo.save).toHaveBeenCalled();
        });

        it('should not contribute ifSiết tenant opted out', async () => {
            const mockContribution = {
                tenantId: 'tenant-123',
                optInToNetworkSharing: false,
            };

            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(mockContribution as any);
            jest.spyOn(observationRepo, 'save');

            await service.contributePaymentObservation('tenant-123', 'ABCDE1234F', {} as any);

            expect(observationRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('registerTenant', () => {
        it('should register new tenant with STANDARD tier', async () => {
            jest.spyOn(contributionRepo, 'findOne').mockResolvedValue(null);
            jest.spyOn(contributionRepo, 'save').mockImplementation((entity) =>
                Promise.resolve(entity as any),
            );

            const result = await service.registerTenant('tenant-new');

            expect(result.tenantId).toBe('tenant-new');
            expect(result.contributionTier).toBe('STANDARD');
            expect(result.optInToNetworkSharing).toBe(true);
        });
    });

    // Additional critical tests
    describe('Community Score Calculation', () => {
        it('should calculate correct community score', () => {
            const metrics = {
                avgDaysToPay: 30,
                onTimePaymentRate: 90,
                disputeRate: 2,
                partialPaymentRate: 5,
                totalTransactions: 100,
                uniqueTenants: 10,
            };

            const score = (service as any).calculateCommunityScore(metrics);

            expect(score).toBeGreaterThan(70);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('Anonymization', () => {
        it('should properly hash identifiers', () => {
            const hash = (service as any).hashIdentifier('ABCDE1234F');

            expect(hash).toHaveLength(64); // SHA-256 produces 64 char hex
            expect(hash).not.toContain('ABCDE');
        });
    });
});
