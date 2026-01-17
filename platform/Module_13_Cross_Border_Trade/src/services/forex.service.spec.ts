import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForexService } from '../services/forex.service';
import { ForexRate, CurrencyPair } from '../entities/forex-rate.entity';
import { TestFixtures } from '../../test/fixtures';
import { createMockRepository } from '../../test/setup';

describe('ForexService', () => {
    let service: ForexService;
    let forexRateRepo: Partial<Repository<ForexRate>>;

    beforeEach(async () => {
        forexRateRepo = createMockRepository<ForexRate>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForexService,
                {
                    provide: getRepositoryToken(ForexRate),
                    useValue: forexRateRepo,
                },
            ],
        }).compile();

        service = module.get<ForexService>(ForexService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getCurrentRate', () => {
        it('should return current exchange rate for valid currency pair', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                rate: 3.67,
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const result = await service.getCurrentRate('USD', 'AED');

            expect(result).toEqual(mockRate);
            expect(forexRateRepo.findOne).toHaveBeenCalledWith({
                where: {
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                },
                order: {
                    createdAt: 'DESC',
                },
            });
        });

        it('should return null for non-existent currency pair', async () => {
            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(null);

            const result = await service.getCurrentRate('XXX', 'YYY');

            expect(result).toBeNull();
        });

        it('should handle repository errors gracefully', async () => {
            (forexRateRepo.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(service.getCurrentRate('USD', 'AED')).rejects.toThrow('Database error');
        });
    });

    describe('convertCurrency', () => {
        it('should convert currency using current rate', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                rate: 3.67,
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const request = {
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: 1000,
            };

            const result = await service.convertCurrency(request);

            expect(result.fromCurrency).toBe('USD');
            expect(result.toCurrency).toBe('AED');
            expect(result.amount).toBe(1000);
            expect(result.convertedAmount).toBe(3670); // 1000 * 3.67
            expect(result.rate).toBe(3.67);
        });

        it('should lock rate when lockRate is true', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                rate: 3.67,
            });

            const lockedRate = { ...mockRate, lockedRate: 3.67 };

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);
            (forexRateRepo.save as jest.Mock).mockResolvedValue(lockedRate);

            const request = {
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: 1000,
                lockRate: true,
                lockDurationMinutes: 30,
            };

            const result = await service.convertCurrency(request);

            expect(result.lockedRate).toBe(3.67);
            expect(result.lockedUntil).toBeDefined();
            expect(forexRateRepo.save).toHaveBeenCalled();
        });

        it('should throw error for non-existent currency pair', async () => {
            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(null);

            const request = {
                fromCurrency: 'XXX',
                toCurrency: 'YYY',
                amount: 1000,
            };

            await expect(service.convertCurrency(request)).rejects.toThrow();
        });

        it('should handle zero Amount', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                rate: 3.67,
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const request = {
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: 0,
            };

            const result = await service.convertCurrency(request);

            expect(result.convertedAmount).toBe(0);
        });

        it('should handle negative amount', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                rate: 3.67,
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const request = {
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: -1000,
            };

            await expect(service.convertCurrency(request)).rejects.toThrow();
        });
    });

    describe('lockRate', () => {
        it('should lock exchange rate for specified duration', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                rate: 3.67,
            });

            const lockedRate = {
                ...mockRate,
                lockedRate: 3.67,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            };

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);
            (forexRateRepo.save as jest.Mock).mockResolvedValue(lockedRate);

            const result = await service.lockRate('USD', 'AED', 30);

            expect(result.lockedRate).toBe(3.67);
            expect(result.lockedUntil).toBeDefined();
            expect(forexRateRepo.save).toHaveBeenCalled();
        });

        it('should use default duration of 30 minutes', async () => {
            const mockRate = TestFixtures.createMockForexRate();

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);
            (forexRateRepo.save as jest.Mock).mockResolvedValue(mockRate);

            await service.lockRate('USD', 'AED');

            const saveCall = (forexRateRepo.save as jest.Mock).mock.calls[0][0];
            const lockedUntil = new Date(saveCall.lockedUntil);
            const expectedTime = new Date(Date.now() + 30 * 60 * 1000);
            const timeDiff = Math.abs(lockedUntil.getTime() - expectedTime.getTime());

            expect(timeDiff).toBeLessThan(1000); // Within 1 second
        });

        it('should throw error for non-existent currency pair', async () => {
            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.lockRate('XXX', 'YYY')).rejects.toThrow();
        });
    });

    describe('getLockedRate', () => {
        it('should return valid locked rate', async () => {
            const lockedRate = TestFixtures.createMockForexRate({
                lockedRate: 3.67,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(lockedRate);

            const result = await service.getLockedRate('USD', 'AED');

            expect(result).toEqual(lockedRate);
        });

        it('should return null for expired locked rate', async () => {
            const expiredRate = TestFixtures.createMockForexRate({
                lockedRate: 3.67,
                lockedUntil: new Date(Date.now() - 1000), // Expired
            });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(expiredRate);

            const result = await service.getLockedRate('USD', 'AED');

            expect(result).toBeNull();
        });

        it('should return null when no locked rate exists', async () => {
            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(null);

            const result = await service.getLockedRate('USD', 'AED');

            expect(result).toBeNull();
        });
    });

    describe('getAvailableCurrencies', () => {
        it('should return list of unique currencies', async () => {
            const mockRates = [
                TestFixtures.createMockForexRate({ fromCurrency: 'USD', toCurrency: 'AED' }),
                TestFixtures.createMockForexRate({ fromCurrency: 'USD', toCurrency: 'EUR' }),
                TestFixtures.createMockForexRate({ fromCurrency: 'EUR', toCurrency: 'AED' }),
            ];

            (forexRateRepo.find as jest.Mock).mockResolvedValue(mockRates);

            const result = await service.getAvailableCurrencies();

            expect(result).toContain('USD');
            expect(result).toContain('AED');
            expect(result).toContain('EUR');
            expect(result.length).toBe(3);
        });

        it('should return empty array when no rates exist', async () => {
            (forexRateRepo.find as jest.Mock).mockResolvedValue([]);

            const result = await service.getAvailableCurrencies();

            expect(result).toEqual([]);
        });
    });

    describe('getRatesForCurrency', () => {
        it('should return all rates for a specific currency', async () => {
            const mockRates = [
                TestFixtures.createMockForexRate({ fromCurrency: 'USD', toCurrency: 'AED' }),
                TestFixtures.createMockForexRate({ fromCurrency: 'USD', toCurrency: 'EUR' }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockRates),
            };

            (forexRateRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getRatesForCurrency('USD');

            expect(result).toEqual(mockRates);
            expect(result.length).toBe(2);
        });
    });

    describe('updateRate', () => {
        it('should update existing rate', async () => {
            const existingRate = TestFixtures.createMockForexRate();
            const updatedRate = { ...existingRate, rate: 3.70 };

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(existingRate);
            (forexRateRepo.save as jest.Mock).mockResolvedValue(updatedRate);

            const rateData = {
                currencyPair: CurrencyPair.USD_AED,
                rate: 3.70,
            };

            const result = await service.updateRate(rateData);

            expect(result.rate).toBe(3.70);
            expect(forexRateRepo.save).toHaveBeenCalled();
        });

        it('should create new rate if not exists', async () => {
            const newRate = TestFixtures.createMockForexRate({ rate: 3.70 });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(null);
            (forexRateRepo.create as jest.Mock).mockReturnValue(newRate);
            (forexRateRepo.save as jest.Mock).mockResolvedValue(newRate);

            const rateData = {
                currencyPair: CurrencyPair.USD_AED,
                rate: 3.70,
            };

            const result = await service.updateRate(rateData);

            expect(forexRateRepo.create).toHaveBeenCalled();
            expect(forexRateRepo.save).toHaveBeenCalled();
        });
    });

    describe('getHistoricalRates', () => {
        it('should return rates within date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const mockRates = [
                TestFixtures.createMockForexRate({ createdAt: new Date('2024-01-15') }),
                TestFixtures.createMockForexRate({ createdAt: new Date('2024-01-20') }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockRates),
            };

            (forexRateRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getHistoricalRates('USD', 'AED', startDate, endDate);

            expect(result).toEqual(mockRates);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
        });
    });

    describe('calculateHedgeRequirements', () => {
        it('should calculate hedge requirements correctly', async () => {
            const mockRate = TestFixtures.createMockForexRate({ rate: 3.67 });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const result = await service.calculateHedgeRequirements(100000, 'USD', 'AED', 100);

            expect(result.originalAmount).toBe(100000);
            expect(result.hedgeAmount).toBe(100000); // 100% hedge
            expect(result.convertedAmount).toBe(367000); // 100000 * 3.67
        });

        it('should calculate partial hedge', async () => {
            const mockRate = TestFixtures.createMockForexRate({ rate: 3.67 });

            (forexRateRepo.findOne as jest.Mock).mockResolvedValue(mockRate);

            const result = await service.calculateHedgeRequirements(100000, 'USD', 'AED', 50);

            expect(result.hedgeAmount).toBe(50000); // 50% hedge
        });
    });

    describe('getFxAnalytics', () => {
        it('should return FX analytics for date range', async () => {
            const mockRates = [
                TestFixtures.createMockForexRate({ rate: 3.65 }),
                TestFixtures.createMockForexRate({ rate: 3.67 }),
                TestFixtures.createMockForexRate({ rate: 3.70 }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockRates),
            };

            (forexRateRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getFxAnalytics();

            expect(result).toBeDefined();
            expect(result.totalRates).toBe(3);
        });
    });

    describe('cleanupExpiredLocks', () => {
        it('should remove expired locked rates', async () => {
            const mockQueryBuilder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 5 }),
            };

            (forexRateRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.cleanupExpiredLocks();

            expect(result).toBe(5);
            expect(mockQueryBuilder.execute).toHaveBeenCalled();
        });
    });
});
