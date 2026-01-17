import { Test, TestingModule } from '@nestjs/testing';
import { GlobalizationService } from './globalization.service';
import { CurrencyService } from './currency.service';
import { I18nService } from './i18n.service';
import { PaymentIntelligenceService } from './payment-intelligence.service';
import { CulturalIntelligenceService } from './cultural-intelligence.service';
import { ComplianceIntelligenceService } from './compliance-intelligence.service';
import { TestFixtures } from '../../tests/fixtures';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    CurrencyExchangeRateEntity,
    LocalizationSettingsEntity,
    TranslationEntity,
} from '../entities/globalization.entity';

describe('GlobalizationService', () => {
    let service: GlobalizationService;
    let currencyService: Partial<CurrencyService>;
    let i18nService: Partial<I18nService>;
    let paymentIntelligence: Partial<PaymentIntelligenceService>;
    let culturalIntelligence: Partial<CulturalIntelligenceService>;
    let complianceIntelligence: Partial<ComplianceIntelligenceService>;

    beforeEach(async () => {
        // Mock all service dependencies
        currencyService = {
            getExchangeRate: jest.fn(),
            convertCurrency: jest.fn(),
        };

        i18nService = {
            translate: jest.fn(),
            getTranslations: jest.fn(),
        };

        paymentIntelligence = {
            getOptimalPaymentRoute: jest.fn(),
        };

        culturalIntelligence = {
            getCulturalNorms: jest.fn(),
        };

        complianceIntelligence = {
            checkCompliance: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GlobalizationService,
                { provide: CurrencyService, useValue: currencyService },
                { provide: I18nService, useValue: i18nService },
                { provide: PaymentIntelligenceService, useValue: paymentIntelligence },
                { provide: CulturalIntelligenceService, useValue: culturalIntelligence },
                { provide: ComplianceIntelligenceService, useValue: complianceIntelligence },
            ],
        }).compile();

        service = module.get<GlobalizationService>(GlobalizationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have all service dependencies injected', () => {
            expect(service['currencyService']).toBeDefined();
            expect(service['i18nService']).toBeDefined();
            expect(service['paymentIntelligenceService']).toBeDefined();
            expect(service['culturalIntelligenceService']).toBeDefined();
            expect(service['complianceIntelligenceService']).toBeDefined();
        });
    });

    describe('localizeContent', () => {
        it('should localize content for target locale', async () => {
            const content = {
                title: 'common.welcome',
                description: 'common.description',
            };

            (i18nService.translate as jest.Mock)
                .mockResolvedValueOnce('Welcome')
                .mockResolvedValueOnce('Description text');

            const result = await service.localizeContent(content, 'en-US');

            expect(result.title).toBe('Welcome');
            expect(result.description).toBe('Description text');
            expect(i18nService.translate).toHaveBeenCalledTimes(2);
        });

        it('should handle translation errors gracefully', async () => {
            const content = { title: 'invalid.key' };

            (i18nService.translate as jest.Mock).mockRejectedValue(new Error('Translation not found'));

            await expect(service.localizeContent(content, 'en-US')).rejects.toThrow();
        });
    });

    describe('getGlobalizedTransaction', () => {
        it('should return globalized transaction data', async () => {
            const transaction = {
                amount: 1000,
                currency: 'USD',
                fromCountry: 'US',
                toCountry: 'UK',
            };

            (currencyService.convertCurrency as jest.fn).mockResolvedValue({
                fromCurrency: 'USD',
                toCurrency: 'GBP',
                originalAmount: 1000,
                convertedAmount: 800,
                rate: 0.8,
            });

            (paymentIntelligence.getOptimalPaymentRoute as jest.fn).mockResolvedValue({
                paymentMethod: 'SWIFT',
                estimatedDays: 3,
                estimatedCost: 25,
            });

            (complianceIntelligence.checkCompliance as jest.fn).mockResolvedValue({
                compliant: true,
                rules: [],
            });

            const result = await service.getGlobalizedTransaction(transaction);

            expect(result).toBeDefined();
            expect(result.conversion).toBeDefined();
            expect(result.paymentRoute).toBeDefined();
            expect(result.compliance).toBeDefined();
        });
    });

    describe('adaptCulturalContext', () => {
        it('should adapt content for cultural context', async () => {
            const content = {
                greeting: 'Hello',
                formality: 'casual',
            };

            (culturalIntelligence.getCulturalNorms as jest.fn).mockResolvedValue({
                formalGreeting: 'Good morning, Mr./Ms.',
                informalGreeting: 'Hi',
            });

            const result = await service.adaptCulturalContext(content, 'US', 'formal');

            expect(result).toBeDefined();
            expect(culturalIntelligence.getCulturalNorms).toHaveBeenCalledWith('US');
        });
    });

    describe('validateRegionalSettings', () => {
        it('should validate regional settings', () => {
            const settings = {
                locale: 'en-US',
                currency: 'USD',
                timezone: 'America/New_York',
            };

            const result = service.validateRegionalSettings(settings);

            expect(result.isValid).toBe(true);
        });

        it('should reject invalid locale format', () => {
            const settings = {
                locale: 'invalid',
                currency: 'USD',
                timezone: 'America/New_York',
            };

            const result = service.validateRegionalSettings(settings);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid locale format');
        });
    });

    describe('getCurrencyForRegion', () => {
        it('should return correct currency for region', () => {
            expect(service.getCurrencyForRegion('US')).toBe('USD');
            expect(service.getCurrencyForRegion('GB')).toBe('GBP');
            expect(service.getCurrencyForRegion('EU')).toBe('EUR');
            expect(service.getCurrencyForRegion('JP')).toBe('JPY');
        });

        it('should return USD as default for unknown regions', () => {
            expect(service.getCurrencyForRegion('UNKNOWN')).toBe('USD');
        });
    });

    describe('formatDateForLocale', () => {
        it('should format date according to locale', () => {
            const date = new Date('2024-06-15');

            expect(service.formatDateForLocale(date, 'en-US')).toMatch(/6\/15\/2024|06\/15\/2024/);
            expect(service.formatDateForLocale(date, 'en-GB')).toMatch(/15\/06\/2024/);
        });
    });

    describe('formatCurrencyForLocale', () => {
        it('should format currency according to locale', () => {
            expect(service.formatCurrencyForLocale(1234.56, 'USD', 'en-US')).toMatch(/\$1,234\.56/);
            expect(service.formatCurrencyForLocale(1234.56, 'EUR', 'de-DE')).toMatch(/1\.234,56/);
        });
    });
});
