import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnerManagementService } from '../partner-management.service';
import { Partner, PartnerType, PartnerStatus } from '../../entities/partner.entity';
import { PartnerCommission } from '../../entities/partner-commission.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('PartnerManagementService', () => {
    let service: PartnerManagementService;
    let partnerRepo: Repository<Partner>;
    let commissionRepo: Repository<PartnerCommission>;
    let eventEmitter: EventEmitter2;

    const mockPartner = {
        id: 'prt-123',
        name: 'Test Partner',
        type: PartnerType.CHANNEL,
        status: PartnerStatus.ACTIVE,
        commissionRate: 20,
        tier: 'bronze',
        totalReferrals: 10,
        activeCustomers: 5,
        totalRevenue: 100000,
        lifetimeCommissions: 20000,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PartnerManagementService,
                {
                    provide: getRepositoryToken(Partner),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        increment: jest.fn(),
                        createQueryBuilder: jest.fn(),
                        manager: {
                            transaction: jest.fn((cb) => cb({
                                increment: jest.fn(),
                            })),
                        },
                    },
                },
                {
                    provide: getRepositoryToken(PartnerCommission),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PartnerManagementService>(PartnerManagementService);
        partnerRepo = module.get(getRepositoryToken(Partner));
        commissionRepo = module.get(getRepositoryToken(PartnerCommission));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        jest.clearAllMocks();
    });

    describe('registerPartner', () => {
        it('should register new partner successfully', async () => {
            (partnerRepo.create as jest.Mock).mockReturnValue(mockPartner);
            (partnerRepo.save as jest.Mock).mockResolvedValue(mockPartner);

            const result = await service.registerPartner({
                name: 'Test Partner',
                type: PartnerType.CHANNEL,
                primaryContact: {
                    name: 'John Doe',
                    email: 'john@partner.com',
                },
            });

            expect(result.name).toBe('Test Partner');
            expect(partnerRepo.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('partner.registered', expect.any(Object));
        });

        it('should apply default commission rate for channel partners', async () => {
            (partnerRepo.create as jest.Mock).mockImplementation((data) => ({
                ...mockPartner,
                ...data,
            }));
            (partnerRepo.save as jest.Mock).mockResolvedValue(mockPartner);

            const result = await service.registerPartner({
                name: 'Channel Partner',
                type: PartnerType.CHANNEL,
                primaryContact: { name: 'Test', email: 'test@test.com' },
            });

            expect(result.commissionRate).toBe(20); // Default for channel
        });

        it('should generate API key for integration partners', async () => {
            const integrationPartner = { ...mockPartner, type: PartnerType.INTEGRATION };
            (partnerRepo.create as jest.Mock).mockReturnValue(integrationPartner);
            (partnerRepo.save as jest.Mock).mockResolvedValue({
                ...integrationPartner,
                apiKey: 'pk_12345',
            });

            const result = await service.registerPartner({
                name: 'Integration Partner',
                type: PartnerType.INTEGRATION,
                primaryContact: { name: 'Test', email: 'test@integration.com' },
            });

            expect(result.apiKey).toBeDefined();
        });
    });

    describe('trackReferral', () => {
        it('should track partner referral', async () => {
            (partnerRepo.increment as jest.Mock).mockResolvedValue(undefined);

            const result = await service.trackReferral('prt-123', {
                customerId: 'cust-123',
                email: 'customer@company.com',
                companyName: 'Test Company',
                estimatedRevenue: 50000,
            });

            expect(result.referralId).toBeDefined();
            expect(result.trackingLink).toContain('prt-123');
            expect(partnerRepo.increment).toHaveBeenCalledWith(
                { id: 'prt-123' },
                'totalReferrals',
                1,
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith('partner.referral.tracked', expect.any(Object));
        });
    });

    describe('calculateCommission', () => {
        it('should calculate commission correctly', async () => {
            (partnerRepo.findOne as jest.Mock).mockResolvedValue(mockPartner);
            (commissionRepo.create as jest.Mock).mockImplementation((data) => data);
            (commissionRepo.save as jest.Mock).mockResolvedValue({
                commissionAmount: 10000,
                partnerId: 'prt-123',
            });

            const result = await service.calculateCommission('prt-123', {
                customerId: 'cust-123',
                transactionType: 'new_customer',
                revenueAmount: 50000,
            });

            expect(result.commissionAmount).toBe(10000); // 20% of 50000
            expect(eventEmitter.emit).toHaveBeenCalledWith('partner.commission.calculated', expect.any(Object));
        });
    });

    describe('getPartnerPerformance', () => {
        it('should return performance metrics', async () => {
            (partnerRepo.findOne as jest.Mock).mockResolvedValue(mockPartner);
            (commissionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    revenueGenerated: '100000',
                    commissionsEarned: '20000',
                }),
            });
            (commissionRepo.count as jest.Mock).mockResolvedValue(5);

            const result = await service.getPartnerPerformance(
                'prt-123',
                new Date('2026-01-01'),
                new Date('2026-01-31'),
            );

            expect(result.revenueGenerated).toBe(100000);
            expect(result.commissionsEarned).toBe(20000);
            expect(result.conversionsCount).toBe(5);
            expect(result.conversionRate).toBeGreaterThan(0);
        });
    });

    describe('getPartnerLeaderboard', () => {
        it('should return top partners by revenue', async () => {
            const mockQueryBuilder = {
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mockPartner, id: 'prt-1', name: 'Partner 1', totalRevenue: 200000 },
                    { ...mockPartner, id: 'prt-2', name: 'Partner 2', totalRevenue: 150000 },
                ]),
            };

            (partnerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getPartnerLeaderboard('revenue', 10);

            expect(result.length).toBe(2);
            expect(result[0].rank).toBe(1);
            expect(result[0].value).toBe(200000);
        });
    });

    describe('evaluateTierUpgrade', () => {
        it('should recommend tier upgrade when eligible', async () => {
            const goldEligiblePartner = {
                ...mockPartner,
                totalRevenue: 250000,
                totalReferrals: 60,
                tier: 'bronze',
            };

            (partnerRepo.findOne as jest.Mock).mockResolvedValue(goldEligiblePartner);

            const result = await service.evaluateTierUpgrade('prt-123');

            expect(result.recommendedTier).toBe('gold');
            expect(result.eligible).toBe(true);
        });

        it('should not recommend upgrade if not eligible', async () => {
            (partnerRepo.findOne as jest.Mock).mockResolvedValue(mockPartner);

            const result = await service.evaluateTierUpgrade('prt-123');

            expect(result.eligible).toBe(false);
        });
    });

    describe('getCommissionPayoutReport', () => {
        const mockCommissions = [
            { commissionAmount: 5000, status: 'pending' },
            { commission Amount: 3000, status: 'paid' },
            { commissionAmount: 2000, status: 'pending' },
        ];

        it('should calculate payout totals', async () => {
            (commissionRepo.find as jest.Mock).mockResolvedValue(mockCommissions);

            const result = await service.getCommissionPayoutReport('prt-123');

            expect(result.commissionsPending).toBe(7000);
            expect(result.commissionsPaid).toBe(3000);
            expect(result.totalCommissions).toBe(10000);
        });
    });

    describe('Edge Cases', () => {
        it('should handle partner not found', async () => {
            (partnerRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                service.calculateCommission('non-existent', {
                    customerId: 'cust-123',
                    transactionType: 'new_customer',
                    revenueAmount: 50000,
                }),
            ).rejects.toThrow('Partner not found');
        });
    });
});
