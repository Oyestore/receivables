import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyService } from '../services/currency.service';
import { CurrencyIntelligenceService } from '../services/currency-intelligence.service';
import { CurrencyExchangeRateEntity } from '../entities/globalization.entity';
import { PaymentRouteEntity } from '../entities/intelligence.entity';

describe('Currency Intelligence Service', () => {
    let service: CurrencyService;
    let intelligenceService: CurrencyIntelligenceService;
    let rateRepo: jest.Mocked<Repository<CurrencyExchangeRateEntity>>;

    const mockRateRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrencyService,
                CurrencyIntelligenceService,
                {
                    provide: getRepositoryToken(CurrencyExchangeRateEntity),
                    useValue: mockRateRepo,
                },
                {
                    provide: getRepositoryToken(PaymentRouteEntity),
                    useValue: {},
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<CurrencyService>(CurrencyService);
        intelligenceService = module.get<CurrencyIntelligenceService>(CurrencyIntelligenceService);
        rateRepo = module.get(getRepositoryToken(CurrencyExchangeRateEntity));
    });

    it('should provide enhanced rate with intelligence predictions', async () => {
        // Mock database lookup to return null (force intelligence service)
        rateRepo.findOne.mockResolvedValue(null);

        const result = await service.getEnhancedRate('USD', 'EUR');

        expect(result).toBeDefined();
        expect(result.currentRate).toBeGreaterThan(0);
        expect(result.prediction).toBeDefined();
        expect(result.prediction.recommendation).toMatch(/buy_now|wait|hold/);
        expect(result.prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(result.prediction.confidence).toBeLessThanOrEqual(1);
        expect(result.volatilityAnalysis).toBeDefined();
        expect(result.optimalTiming).toBeDefined();
        expect(result.sources).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.tenantId).toBe('system');
    });

    it('should provide optimal timing recommendation', async () => {
        // Mock database lookup to return null
        rateRepo.findOne.mockResolvedValue(null);

        const recommendation = await service.getOptimalTimingRecommendation('USD', 'EUR');

        expect(recommendation).toBeDefined();
        expect(recommendation.recommendation).toMatch(/buy_now|wait|hold/);
        expect(recommendation.expectedSavings).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence).toBeLessThanOrEqual(1);
        expect(recommendation.bestTimeToConvert).toBeDefined();
        expect(recommendation.riskLevel).toMatch(/low|medium|high/);
    });

    it('should optimize batch conversions', async () => {
        // Mock database lookup to return null
        rateRepo.findOne.mockResolvedValue(null);

        const requests = [
            { from: 'USD', to: 'EUR', amount: 1000 },
            { from: 'GBP', to: 'USD', amount: 500 },
            { from: 'EUR', to: 'JPY', amount: 2000 },
        ];

        const results = await service.optimizeBatchConversions(requests);

        expect(results).toHaveLength(3);
        expect(results[0].pair).toBe('USD-EUR');
        expect(results[0].currentRate).toBeGreaterThan(0);
        expect(results[0].recommendation).toMatch(/buy_now|wait|hold/);
        expect(results[0].expectedSavings).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to database when available', async () => {
        // Mock database to return a rate
        const mockRate = {
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            rate: 0.85,
            rateDate: new Date(),
            source: 'manual',
            isActive: true,
        };
        rateRepo.findOne.mockResolvedValue(mockRate);

        const result = await service.getRate('USD', 'EUR');

        expect(result).toBe(0.85);
        expect(rateRepo.findOne).toHaveBeenCalledWith({
            where: {
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                isActive: true,
            },
            order: { rateDate: 'DESC' }
        });
    });

    it('should handle reverse lookup', async () => {
        // Mock direct lookup to return null, reverse to return rate
        rateRepo.findOne
            .mockResolvedValueOnce(null) // Direct lookup
            .mockResolvedValueOnce({ // Reverse lookup
                fromCurrency: 'EUR',
                toCurrency: 'USD',
                rate: 1.176,
                rateDate: new Date(),
                source: 'manual',
                isActive: true,
            });

        const result = await service.getRate('USD', 'EUR');

        expect(result).toBeCloseTo(0.85034, 5); // 1 / 1.176
    });

    it('should cache rates for performance', async () => {
        // Mock database lookup
        const mockRate = {
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            rate: 0.85,
            rateDate: new Date(),
            source: 'manual',
            isActive: true,
        };
        rateRepo.findOne.mockResolvedValue(mockRate);

        // First call should hit database
        const result1 = await service.getRate('USD', 'EUR');
        expect(rateRepo.findOne).toHaveBeenCalled();

        // Second call should use cache (no additional calls)
        const result2 = await service.getRate('USD', 'EUR');
        
        expect(result1).toBe(result2);
        expect(result1).toBe(0.85);
    });
});
