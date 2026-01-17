import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from '../services/referral.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Referral, ReferralStatus, ReferralReward, RewardTier } from '../entities/referral.entity';

describe('ReferralService', () => {
    let service: ReferralService;
    let referralRepository: Repository<Referral>;
    let rewardRepository: Repository<ReferralReward>;

    const mockReferralRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockRewardRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReferralService,
                {
                    provide: getRepositoryToken(Referral),
                    useValue: mockReferralRepository,
                },
                {
                    provide: getRepositoryToken(ReferralReward),
                    useValue: mockRewardRepository,
                },
            ],
        }).compile();

        service = module.get<ReferralService>(ReferralService);
        referralRepository = module.get<Repository<Referral>>(
            getRepositoryToken(Referral),
        );
        rewardRepository = module.get<Repository<ReferralReward>>(
            getRepositoryToken(ReferralReward),
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createReferral', () => {
        it('should create a new referral successfully', async () => {
            const tenantId = 'tenant-123';
            const dto = {
                referrerId: 'user-123',
                referredEmail: 'test@example.com',
                referredName: 'Test User',
            };

            mockReferralRepository.findOne.mockResolvedValue(null); // No duplicate
            mockReferralRepository.create.mockReturnValue({ ...dto, id: 'ref-123' });
            mockReferralRepository.save.mockResolvedValue({
                id: 'ref-123',
                ...dto,
                tenantId,
                status: ReferralStatus.PENDING,
            });

            const result = await service.createReferral(tenantId, dto);

            expect(result.id).toBe('ref-123');
            expect(result.status).toBe(ReferralStatus.PENDING);
            expect(mockReferralRepository.findOne).toHaveBeenCalledWith({
                where: {
                    tenantId,
                    referredEmail: dto.referredEmail,
                    status: ReferralStatus.PENDING,
                },
            });
        });

        it('should throw error for duplicate referral', async () => {
            const tenantId = 'tenant-123';
            const dto = {
                referrerId: 'user-123',
                referredEmail: 'duplicate@example.com',
                referredName: 'Duplicate User',
            };

            mockReferralRepository.findOne.mockResolvedValue({ id: 'existing-ref' });

            await expect(service.createReferral(tenantId, dto)).rejects.toThrow(
                'This email has already been referred',
            );
        });
    });

    describe('convertReferral', () => {
        it('should convert pending referral successfully', async () => {
            const tenantId = 'tenant-123';
            const referralCode = 'ABCD1234';
            const referredUserId = 'user-456';

            const mockReferral = {
                id: 'ref-123',
                referrerId: 'user-123',
                status: ReferralStatus.PENDING,
            };

            mockReferralRepository.findOne.mockResolvedValue(mockReferral);
            mockReferralRepository.save.mockResolvedValue({
                ...mockReferral,
                status: ReferralStatus.CONVERTED,
                referredUserId,
            });

            // Mock reward creation
            mockRewardRepository.create.mockReturnValue({});
            mockRewardRepository.save.mockResolvedValue({});

            const result = await service.convertReferral(
                tenantId,
                referralCode,
                referredUserId,
            );

            expect(result.status).toBe(ReferralStatus.CONVERTED);
            expect(result.referredUserId).toBe(referredUserId);
        });

        it('should throw error if referral not found', async () => {
            mockReferralRepository.findOne.mockResolvedValue(null);

            await expect(
                service.convertReferral('tenant-123', 'INVALID', 'user-456'),
            ).rejects.toThrow('Referral not found or already converted');
        });
    });

    describe('getUserReferralStats', () => {
        it('should calculate correct statistics', async () => {
            const tenantId = 'tenant-123';
            const userId = 'user-123';

            const mockReferrals = [
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED },
                { status: ReferralStatus.COMPLETED }, // 10 completed
                { status: ReferralStatus.PENDING },
                { status: ReferralStatus.PENDING },
            ];

            const mockRewards = [
                { rewardAmount: 1000 },
                { rewardAmount: 1500 },
                { rewardAmount: 2000 },
            ];

            mockReferralRepository.find.mockResolvedValue(mockReferrals);
            mockRewardRepository.find.mockResolvedValue(mockRewards);

            const result = await service.getUserReferralStats(tenantId, userId);

            expect(result.totalReferrals).toBe(12);
            expect(result.successfulReferrals).toBe(10);
            expect(result.pendingReferrals).toBe(2);
            expect(result.totalRewardsEarned).toBe(4500);
            expect(result.currentTier).toBe(RewardTier.SILVER); // 10 successful = Silver tier
        });
    });

    describe('calculateTier', () => {
        it('should return correct tier based on referral count', () => {
            // Use reflection to access private method for testing
            const calculateTier = (service as any).calculateTier.bind(service);

            expect(calculateTier(5)).toBe(RewardTier.BRONZE);
            expect(calculateTier(10)).toBe(RewardTier.SILVER);
            expect(calculateTier(20)).toBe(RewardTier.GOLD);
            expect(calculateTier(50)).toBe(RewardTier.PLATINUM);
        });
    });

    describe('calculateRewardAmount', () => {
        it('should calculate correct reward with tier multiplier', () => {
            const calculateRewardAmount = (service as any).calculateRewardAmount.bind(service);

            // Bronze tier (1.0x) - signup
            expect(calculateRewardAmount('referral_signup', RewardTier.BRONZE)).toBe(500);

            // Silver tier (1.5x) - signup
            expect(calculateRewardAmount('referral_signup', RewardTier.SILVER)).toBe(750);

            // Gold tier (2.0x) - completion with purchase
            const goldReward = calculateRewardAmount(
                'referral_completion',
                RewardTier.GOLD,
                100000, // ₹1L purchase
            );
            expect(goldReward).toBeGreaterThan(2000); // Base 1000 + 5% of 100k = 6000, then 2x

            // Platinum tier (3.0x)
            expect(calculateRewardAmount('referral_signup', RewardTier.PLATINUM)).toBe(1500);
        });
    });
});
