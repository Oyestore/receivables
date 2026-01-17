import { Test, TestingModule } from '@nestjs/testing';
import { ForexController } from '../controllers/forex.controller';
import { ForexService } from '../services/forex.service';
import { TestFixtures } from '../../test/fixtures';

describe('ForexController', () => {
    let controller: ForexController;
    let forexService: Partial<ForexService>;

    beforeEach(async () => {
        forexService = {
            convertCurrency: jest.fn(),
            lockRate: jest.fn(),
            getCurrentRate: jest.fn(),
            getAvailableCurrencies: jest.fn(),
            calculateHedgeRequirements: jest.fn(),
            getFxAnalytics: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ForexController],
            providers: [
                {
                    provide: ForexService,
                    useValue: forexService,
                },
            ],
        }).compile();

        controller = module.get<ForexController>(ForexController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /forex/convert', () => {
        it('should convert currency successfully', async () => {
            const request = TestFixtures.createMockConversionRequest();
            const mockResult = {
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: 1000,
                convertedAmount: 3670,
                rate: 3.67,
                timestamp: new Date(),
                currencyPair: 'USD/AED',
            };

            (forexService.convertCurrency as jest.Mock).mockResolvedValue(mockResult);

            const result = await controller.convertCurrency(request);

            expect(result.convertedAmount).toBe(3670);
            expect(forexService.convertCurrency).toHaveBeenCalledWith(request);
        });

        it('should handle validation errors', async () => {
            const invalidRequest = { fromCurrency: '', toCurrency: 'AED', amount: 1000 };

            await expect(controller.convertCurrency(invalidRequest as any)).rejects.toThrow();
        });
    });

    describe('POST /forex/lock-rate', () => {
        it('should lock rate successfully', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                lockedRate: 3.67,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            });

            (forexService.lockRate as jest.Mock).mockResolvedValue(mockRate);

            const result = await controller.lockRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                durationMinutes: 30,
            });

            expect(result.lockedRate).toBe(3.67);
            expect(result.lockedUntil).toBeDefined();
        });
    });

    describe('GET /forex/rate/:from/:to', () => {
        it('should return current rate', async () => {
            const mockRate = TestFixtures.createMockForexRate({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                rate: 3.67,
            });

            (forexService.getCurrentRate as jest.Mock).mockResolvedValue(mockRate);

            const result = await controller.getCurrentRate('USD', 'AED');

            expect(result.rate).toBe(3.67);
        });
    });

    describe('GET /forex/currencies', () => {
        it('should return available currencies', async () => {
            (forexService.getAvailableCurrencies as jest.Mock).mockResolvedValue(['USD', 'AED', 'EUR']);

            const result = await controller.getAvailableCurrencies();

            expect(result).toContain('USD');
            expect(result).toContain('AED');
            expect(result).toHaveLength(3);
        });
    });

    describe('POST /forex/hedge-calculate', () => {
        it('should calculate hedge requirements', async () => {
            const mockHedge = {
                originalAmount: 100000,
                hedgeAmount: 100000,
                convertedAmount: 367000,
                recommendedStrategy: 'full_hedge',
            };

            (forexService.calculateHedgeRequirements as jest.Mock).mockResolvedValue(mockHedge);

            const result = await controller.calculateHedge({
                amount: 100000,
                fromCurrency: 'USD',
                toCurrency: 'AED',
                hedgePercentage: 100,
            });

            expect(result.hedgeAmount).toBe(100000);
        });
    });

    describe('GET /forex/analytics', () => {
        it('should return FX analytics', async () => {
            const mockAnalytics = {
                totalRates: 100,
                averageSpread: 0.01,
                mostTradedPairs: ['USD/AED', 'EUR/USD'],
            };

            (forexService.getFxAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await controller.getFxAnalytics();

            expect(result.totalRates).toBe(100);
        });
    });
});
