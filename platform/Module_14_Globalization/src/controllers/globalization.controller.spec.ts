import { Test, TestingModule } from '@nestjs/testing';
import { GlobalizationController } from './globalization.controller';
import { GlobalizationService } from '../services/globalization.service';
import { CurrencyService } from '../services/currency.service';
import { I18nService } from '../services/i18n.service';
import { TestFixtures } from '../../tests/fixtures';

describe('GlobalizationController', () => {
    let controller: GlobalizationController;
    let globalizationService: Partial<GlobalizationService>;
    let currencyService: Partial<CurrencyService>;
    let i18nService: Partial<I18nService>;

    beforeEach(async () => {
        globalizationService = {
            localizeContent: jest.fn(),
            getGlobalizedTransaction: jest.fn(),
            getCurrencyForRegion: jest.fn(),
            validateRegionalSettings: jest.fn(),
        };

        currencyService = {
            getExchangeRate: jest.fn(),
            convertCurrency: jest.fn(),
            getSupportedCurrencies: jest.fn(),
        };

        i18nService = {
            translate: jest.fn(),
            getTranslations: jest.fn(),
            getSupportedLocales: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GlobalizationController],
            providers: [
                { provide: GlobalizationService, useValue: globalizationService },
                { provide: CurrencyService, useValue: currencyService },
                { provide: I18nService, useValue: i18nService },
            ],
        }).compile();

        controller = module.get<GlobalizationController>(GlobalizationController);
    });

    describe('POST /globalization/localize', () => {
        it('should localize content', async () => {
            const request = {
                content: { title: 'common.welcome' },
                locale: 'en-US',
            };

            (globalizationService.localizeContent as jest.Mock).mockResolvedValue({
                title: 'Welcome',
            });

            const result = await controller.localizeContent(request);

            expect(result.title).toBe('Welcome');
            expect(globalizationService.localizeContent).toHaveBeenCalledWith(
                request.content,
                request.locale
            );
        });
    });

    describe('POST /globalization/convert-currency', () => {
        it('should convert currency', async () => {
            const request = {
                amount: 1000,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
            };

            (currencyService.convertCurrency as jest.Mock).mockResolvedValue({
                originalAmount: 1000,
                convertedAmount: 920,
                rate: 0.92,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
            });

            const result = await controller.convertCurrency(request);

            expect(result.convertedAmount).toBe(920);
            expect(result.rate).toBe(0.92);
        });
    });

    describe('GET /globalization/exchange-rate/:from/:to', () => {
        it('should get exchange rate', async () => {
            const mockRate = TestFixtures.createMockCurrencyRate({
                fromCurrency: 'USD',
                toCurrency: 'GBP',
                rate: 0.8,
            });

            (currencyService.getExchangeRate as jest.Mock).mockResolvedValue(mockRate);

            const result = await controller.getExchangeRate('USD', 'GBP');

            expect(result.rate).toBe(0.8);
            expect(result.fromCurrency).toBe('USD');
            expect(result.toCurrency).toBe('GBP');
        });
    });

    describe('GET /globalization/supported-currencies', () => {
        it('should get supported currencies', async () => {
            (currencyService.getSupportedCurrencies as jest.Mock).mockResolvedValue([
                'USD', 'EUR', 'GBP', 'JPY', 'AED',
            ]);

            const result = await controller.getSupportedCurrencies();

            expect(result).toHaveLength(5);
            expect(result).toContain('USD');
            expect(result).toContain('AED');
        });
    });

    describe('POST /globalization/translate', () => {
        it('should translate text', async () => {
            const request = {
                key: 'common.welcome',
                locale: 'es',
            };

            (i18nService.translate as jest.Mock).mockResolvedValue('Bienvenido');

            const result = await controller.translate(request);

            expect(result.translation).toBe('Bienvenido');
            expect(i18nService.translate).toHaveBeenCalledWith(request.key, request.locale);
        });
    });

    describe('GET /globalization/translations/:locale', () => {
        it('should get all translations for locale', async () => {
            const mockTranslations = [
                TestFixtures.createMockTranslation({ key: 'common.welcome', value: 'Welcome' }),
                TestFixtures.createMockTranslation({ key: 'common.goodbye', value: 'Goodbye' }),
            ];

            (i18nService.getTranslations as jest.Mock).mockResolvedValue(mockTranslations);

            const result = await controller.getTranslations('en-US');

            expect(result).toHaveLength(2);
            expect(result[0].key).toBe('common.welcome');
        });
    });

    describe('GET /globalization/supported-locales', () => {
        it('should get supported locales', async () => {
            (i18nService.getSupportedLocales as jest.Mock).mockResolvedValue([
                'en-US', 'es-ES', 'fr-FR', 'de-DE', 'ar-AE',
            ]);

            const result = await controller.getSupportedLocales();

            expect(result).toHaveLength(5);
            expect(result).toContain('en-US');
            expect(result).toContain('ar-AE');
        });
    });

    describe('POST /globalization/globalize-transaction', () => {
        it('should globalize transaction', async () => {
            const transaction = {
                amount: 1000,
                currency: 'USD',
                fromCountry: 'US',
                toCountry: 'UK',
            };

            (globalizationService.getGlobalizedTransaction as jest.Mock).mockResolvedValue({
                ...transaction,
                conversion: { convertedAmount: 800, rate: 0.8 },
                paymentRoute: { method: 'SWIFT', days: 3 },
                compliance: { compliant: true },
            });

            const result = await controller.globalizeTransaction(transaction);

            expect(result.conversion).toBeDefined();
            expect(result.paymentRoute).toBeDefined();
            expect(result.compliance).toBeDefined();
        });
    });

    describe('GET /globalization/currency-for-region/:region', () => {
        it('should get currency for region', async () => {
            (globalizationService.getCurrencyForRegion as jest.Mock).mockReturnValue('GBP');

            const result = await controller.getCurrencyForRegion('GB');

            expect(result.currency).toBe('GBP');
            expect(result.region).toBe('GB');
        });
    });

    describe('POST /globalization/validate-settings', () => {
        it('should validate regional settings', async () => {
            const settings = {
                locale: 'en-US',
                currency: 'USD',
                timezone: 'America/New_York',
            };

            (globalizationService.validateRegionalSettings as jest.Mock).mockReturnValue({
                isValid: true,
                errors: [],
            });

            const result = await controller.validateSettings(settings);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
