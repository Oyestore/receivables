import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CurrencyExchangeRateEntity } from '../entities/globalization.entity';
import { PaymentRouteEntity } from '../entities/intelligence.entity';
import { CurrencyIntelligenceService } from './currency-intelligence.service';
import { ConfigService } from '@nestjs/config';

describe('CurrencyService (Unit)', () => {
    let service: CurrencyService;
    let rateRepoMock: any;
    let routeRepoMock: any;

    beforeEach(async () => {
        rateRepoMock = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn()
        };
        routeRepoMock = {
            findOne: jest.fn(),
            save: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrencyService,
                CurrencyIntelligenceService,
                { provide: getRepositoryToken(CurrencyExchangeRateEntity), useValue: rateRepoMock },
                { provide: getRepositoryToken(PaymentRouteEntity), useValue: routeRepoMock },
                { provide: ConfigService, useValue: { get: () => 'test' } },
            ],
        }).compile();

        service = module.get<CurrencyService>(CurrencyService);
    });

    describe('getRate', () => {
        it('should return 1 for same currency', async () => {
            expect(await service.getRate('USD', 'USD')).toBe(1);
        });

        it('should return direct rate from DB', async () => {
            rateRepoMock.findOne.mockResolvedValue({ rate: 0.85, fromCurrency: 'USD', toCurrency: 'EUR' });
            const rate = await service.getRate('USD', 'EUR');
            expect(rate).toBe(0.85);
            expect(rateRepoMock.findOne).toHaveBeenCalledWith({
                where: { fromCurrency: 'USD', toCurrency: 'EUR', isActive: true },
                order: { rateDate: 'DESC' }
            });
        });

        it('should calculate reverse rate', async () => {
            rateRepoMock.findOne
                .mockResolvedValueOnce(null) // Direct lookup fail
                .mockResolvedValueOnce({ rate: 0.5, fromCurrency: 'EUR', toCurrency: 'USD' }); // Reverse lookup success

            const rate = await service.getRate('USD', 'EUR');
            expect(rate).toBe(2); // 1 / 0.5
        });
    });

    describe('convert', () => {
        it('should convert correctly', async () => {
            // Mock internal getRate
            jest.spyOn(service, 'getRate').mockResolvedValue(1.5);
            const result = await service.convert(100, 'USD', 'CAD');
            expect(result.convertedAmount).toBe(150);
            expect(result.rate).toBe(1.5);
        });
    });
});
