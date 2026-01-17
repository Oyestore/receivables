import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralService } from '../referral.service';
import { Referral } from '../../entities/referral.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReferralService', () => {
    let service: ReferralService;
    let repository: Repository<Referral>;
    let eventEmitter: EventEmitter2;

    const mockReferral = {
        id: 'ref-123',
        tenantId: 'tenant-123',
        referrerId: 'customer-123',
        refereeId: 'customer-456',
        referralCode: 'REF123',
        status: 'pending',
        reward: 1000,
        createdAt: new Date(),
        completedAt: null,
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReferralService,
                {
                    provide: getRepositoryToken(Referral),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<ReferralService>(ReferralService);
        repository = module.get<Repository<Referral>>(getRepositoryToken(Referral));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        jest.clearAllMocks();
    });

    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have repository injected', () => {
            expect(repository).toBeDefined();
        });
    });

    describe('generateReferralCode', () => {
        it('should generate unique referral code', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue({ referralCode: 'ABC123' });
            mockRepository.save.mockResolvedValue({ referralCode: 'ABC123' });

            const result = await service.generateReferralCode('customer-123', 'tenant-123');

            expect(result.referralCode).toBeDefined();
            expect(result.referralCode.length).toBeGreaterThan(0);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should ensure code uniqueness', async () => {
            // First attempt returns existing code
            mockRepository.findOne.mockResolvedValueOnce({ referralCode: 'SAME123' });
            mockRepository.findOne.mockResolvedValueOnce(null);
            mockRepository.create.mockReturnValue({ referralCode: 'NEW123' });
            mockRepository.save.mockResolvedValue({ referralCode: 'NEW123' });

            const result = await service.generateReferralCode('customer-123', 'tenant-123');

            expect(repository.findOne).toHaveBeenCalledTimes(2);
            expect(result.referralCode).toBe('NEW123');
        });

        it('should allow one code per customer', async () => {
            mockRepository.findOne.mockResolvedValue(mockReferral);

            await expect(
                service.generateReferralCode('customer-123', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should emit code generated event', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue({ referralCode: 'ABC123' });
            mockRepository.save.mockResolvedValue({ referralCode: 'ABC123' });

            await service.generateReferralCode('customer-123', 'tenant-123');

            expect(eventEmitter.emit).toHaveBeenCalledWith('referral.code.generated', {
                customerId: 'customer-123',
                referralCode: expect.any(String),
            });
        });
    });

    describe('applyReferralCode', () => {
        it('should apply valid referral code', async () => {
            mockRepository.findOne.mockResolvedValue({
                ...mockReferral,
                status: 'active',
            });
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.applyReferralCode(
                'REF123',
                'customer-789',
                'tenant-123',
            );

            expect(result.refereeId).toBe('customer-789');
            expect(result.status).toBe('pending');
            expect(repository.save).toHaveBeenCalled();
        });

        it('should throw if code not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.applyReferralCode('INVALID', 'customer-789', 'tenant-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should prevent self-referral', async () => {
            mockRepository.findOne.mockResolvedValue(mockReferral);

            await expect(
                service.applyReferralCode('REF123', 'customer-123', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should prevent duplicate use of code', async () => {
            mockRepository.findOne.mockResolvedValue({
                ...mockReferral,
                refereeId: 'customer-789', // Already used
            });

            await expect(
                service.applyReferralCode('REF123', 'customer-999', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should emit code applied event', async () => {
            mockRepository.findOne.mockResolvedValue({
                ...mockReferral,
                status: 'active',
            });
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            await service.applyReferralCode('REF123', 'customer-789', 'tenant-123');

            expect(eventEmitter.emit).toHaveBeenCalledWith('referral.code.applied', {
                referralCode: 'REF123',
                referrerId: mockReferral.referrerId,
                refereeId: 'customer-789',
            });
        });
    });

    describe('completeReferral', () => {
        it('should complete pending referral', async () => {
            const pendingReferral = {
                ...mockReferral,
                status: 'pending',
                refereeId: 'customer-789',
            };

            mockRepository.findOne.mockResolvedValue(pendingReferral);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.completeReferral('ref-123', 'tenant-123');

            expect(result.status).toBe('completed');
            expect(result.completedAt).toBeDefined();
            expect(repository.save).toHaveBeenCalled();
        });

        it('should throw if referral not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.completeReferral('non-existent', 'tenant-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should prevent completing already completed referral', async () => {
            const completedReferral = {
                ...mockReferral,
                status: 'completed',
                completedAt: new Date(),
            };

            mockRepository.findOne.mockResolvedValue(completedReferral);

            await expect(
                service.completeReferral('ref-123', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should emit completion event', async () => {
            const pendingReferral = {
                ...mockReferral,
                status: 'pending',
            };

            mockRepository.findOne.mockResolvedValue(pendingReferral);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            await service.completeReferral('ref-123', 'tenant-123');

            expect(eventEmitter.emit).toHaveBeenCalledWith('referral.completed', {
                referralId: 'ref-123',
                referrerId: mockReferral.referrerId,
                refereeId: mockReferral.refereeId,
                reward: mockReferral.reward,
            });
        });
    });

    describe('getReferralsByCustomer', () => {
        const referrals = [
            mockReferral,
            { ...mockReferral, id: 'ref-456', refereeId: 'customer-999' },
        ];

        it('should return all referrals for customer', async () => {
            mockRepository.find.mockResolvedValue(referrals);

            const result = await service.getReferralsByCustomer('customer-123', 'tenant-123');

            expect(result).toEqual(referrals);
            expect(repository.find).toHaveBeenCalledWith({
                where: { referrerId: 'customer-123', tenantId: 'tenant-123' },
                order: { createdAt: 'DESC' },
            });
        });

        it('should filter by status', async () => {
            const completed = [{ ...mockReferral, status: 'completed' }];
            mockRepository.find.mockResolvedValue(completed);

            const result = await service.getReferralsByCustomer(
                'customer-123',
                'tenant-123',
                { status: 'completed' },
            );

            expect(repository.find).toHaveBeenCalledWith({
                where: {
                    referrerId: 'customer-123',
                    tenantId: 'tenant-123',
                    status: 'completed',
                },
                order: { createdAt: 'DESC' },
            });
        });

        it('should return empty array when no referrals', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getReferralsByCustomer('customer-123', 'tenant-123');

            expect(result).toEqual([]);
        });
    });

    describe('getReferralStats', () => {
        it('should calculate referral statistics', async () => {
            const referrals = [
                { ...mockReferral, status: 'completed', reward: 1000 },
                { ...mockReferral, id: 'ref-2', status: 'completed', reward: 1000 },
                { ...mockReferral, id: 'ref-3', status: 'pending', reward: 1000 },
            ];

            mockRepository.find.mockResolvedValue(referrals);
            mockRepository.count.mockResolvedValue(3);

            const result = await service.getReferralStats('customer-123', 'tenant-123');

            expect(result).toHaveProperty('totalReferrals');
            expect(result).toHaveProperty('completed');
            expect(result).toHaveProperty('pending');
            expect(result).toHaveProperty('totalRewards');
            expect(result.totalReferrals).toBe(3);
            expect(result.completed).toBe(2);
            expect(result.totalRewards).toBe(2000);
        });

        it('should handle zero referrals gracefully', async () => {
            mockRepository.find.mockResolvedValue([]);
            mockRepository.count.mockResolvedValue(0);

            const result = await service.getReferralStats('customer-123', 'tenant-123');

            expect(result.totalReferrals).toBe(0);
            expect(result.totalRewards).toBe(0);
        });
    });

    describe('calculateReward', () => {
        it('should calculate reward based on referee value', async () => {
            const result = await service.calculateReward({
                refereeValue: 10000,
                tier: 'standard',
            });

            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(10000);
        });

        it('should apply tier multipliers', async () => {
            const standardReward = await service.calculateReward({
                refereeValue: 10000,
                tier: 'standard',
            });

            const premiumReward = await service.calculateReward({
                refereeValue: 10000,
                tier: 'premium',
            });

            expect(premiumReward).toBeGreaterThan(standardReward);
        });

        it('should cap reward at maximum', async () => {
            const result = await service.calculateReward({
                refereeValue: 10000000, // Very high value
                tier: 'standard',
            });

            expect(result).toBeLessThanOrEqual(50000); // Max cap
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle null values gracefully', async () => {
            const referralWithNulls = {
                ...mockReferral,
                refereeId: null,
                reward: null,
            };

            mockRepository.findOne.mockResolvedValue(referralWithNulls);

            const result = await service.getReferral('ref-123', 'tenant-123');

            expect(result).toBeDefined();
        });

        it('should handle database errors', async () => {
            mockRepository.find.mockRejectedValue(new Error('Database error'));

            await expect(
                service.getReferralsByCustomer('customer-123', 'tenant-123'),
            ).rejects.toThrow('Database error');
        });

        it('should enforce tenant isolation', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getReferral('ref-123', 'wrong-tenant'),
            ).rejects.toThrow(NotFoundException);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'ref-123', tenantId: 'wrong-tenant' },
            });
        });

        it('should handle concurrent referral creations', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockImplementation((data) => ({
                ...data,
                referralCode: Math.random().toString(36).substring(7),
            }));
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const promises = Array.from({ length: 5 }, (_, i) =>
                service.generateReferralCode(`customer-${i}`, 'tenant-123'),
            );

            const results = await Promise.all(promises);

            expect(results.length).toBe(5);
            expect(new Set(results.map(r => r.referralCode)).size).toBe(5); // All unique
        });
    });

    describe('getReferralLeaderboard', () => {
        it('should return top referrers', async () => {
            const topReferrers = [
                { referrerId: 'customer-1', count: 10, rewards: 10000 },
                { referrerId: 'customer-2', count: 8, rewards: 8000 },
                { referrerId: 'customer-3', count: 5, rewards: 5000 },
            ];

            // Mock query builder
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(topReferrers),
            };

            repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

            const result = await service.getReferralLeaderboard('tenant-123', 10);

            expect(result).toEqual(topReferrers);
            expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
        });

        it('should filter by time period', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

            await service.getReferralLeaderboard('tenant-123', 10, {
                startDate: new Date('2026-01-01'),
            });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
        });
    });

    describe('Performance', () => {
        it('should handle large number of referrals efficiently', async () => {
            const largeReferralList = Array.from({ length: 1000 }, (_, i) => ({
                ...mockReferral,
                id: `ref-${i}`,
                refereeId: `customer-${i}`,
            }));

            mockRepository.find.mockResolvedValue(largeReferralList);

            const startTime = Date.now();
            const result = await service.getReferralsByCustomer('customer-123', 'tenant-123');
            const endTime = Date.now();

            expect(result.length).toBe(1000);
            expect(endTime - startTime).toBeLessThan(1000);
        });

        it('should generate code within acceptable time', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue({ referralCode: 'TEST123' });
            mockRepository.save.mockResolvedValue({ referralCode: 'TEST123' });

            const startTime = Date.now();
            await service.generateReferralCode('customer-123', 'tenant-123');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(500);
        });
    });
});
