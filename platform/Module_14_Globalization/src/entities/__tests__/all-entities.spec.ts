import {
    CurrencyExchangeRateEntity,
    LocalizationSettingsEntity,
    TranslationEntity,
} from '../globalization.entity';
import {
    PaymentRouteEntity,
    ComplianceRuleEntity,
    TranslationMemoryEntity,
} from '../intelligence.entity';
import {
    RegionConfig,
    PublicHoliday,
} from '../region-config.entity';
import {
    LanguageMetadataEntity,
    CulturalNormEntity,
    RegionalPresetEntity,
} from '../enhanced-globalization.entity';

describe('Module 14 Entity Tests - All Entities', () => {
    describe('CurrencyExchangeRateEntity', () => {
        it('should create currency exchange rate', () => {
            const rate = new CurrencyExchangeRateEntity();
            rate.tenantId = 'tenant-1';
            rate.fromCurrency = 'USD';
            rate.toCurrency = 'INR';
            rate.rate = 83.45;
            rate.rateDate = new Date();
            rate.source = 'api';

            expect(rate.fromCurrency).toBe('USD');
            expect(rate.rate).toBe(83.45);
        });

        it('should support different rate sources', () => {
            const sources: ('manual' | 'api' | 'bank')[] = ['manual', 'api', 'bank'];
            sources.forEach(source => {
                const rate = new CurrencyExchangeRateEntity();
                rate.source = source;
                expect(rate.source).toBe(source);
            });
        });
    });

    describe('LocalizationSettingsEntity', () => {
        it('should create localization settings', () => {
            const settings = new Localization SettingsEntity();
            settings.tenantId = 'tenant-1';
            settings.languageCode = 'hi_IN';
            settings.countryCode = 'IN';
            settings.currencyCode = 'INR';
            settings.timezone = 'Asia/Kolkata';

            expect(settings.languageCode).toBe('hi_IN');
            expect(settings.timezone).toBe('Asia/Kolkata');
        });

        it('should handle number formats', () => {
            const settings = new LocalizationSettingsEntity();
            settings.numberFormat = {
                decimalSeparator: '.',
                thousandsSeparator: ',',
                decimalPlaces: 2,
            };

            expect(settings.numberFormat.decimalSeparator).toBe('.');
        });
    });

    describe('TranslationEntity', () => {
        it('should create simple translation', () => {
            const translation = new TranslationEntity();
            translation.languageCode = 'ar_SA';
            translation.namespace = 'common';
            translation.translationKey = 'hello';
            translation.translatedText = 'مرحبا';

            expect(translation.translatedText).toBe('مرحبا');
        });

        it('should support pluralization', () => {
            const translation = new TranslationEntity();
            translation.translatedText = {
                one: '1 item',
                other: '{count} items',
            };

            expect(typeof translation.translatedText).toBe('object');
        });

        it('should track translation status', () => {
            const translation = new TranslationEntity();
            translation.status = 'approved';
            translation.isVerified = true;

            expect(translation.status).toBe('approved');
            expect(translation.isVerified).toBe(true);
        });
    });

    describe('PaymentRouteEntity', () => {
        it('should create payment route', () => {
            const route = new PaymentRouteEntity();
            route.fromCountry = 'US';
            route.toCountry = 'IN';
            route.fromCurrency = 'USD';
            route.toCurrency = 'INR';
            route.recommendedProvider = 'wise';
            route.avgSavingsPercentage = 2.5;

            expect(route.recommendedProvider).toBe('wise');
        });

        it('should store route options', () => {
            const route = new PaymentRouteEntity();
            route.routeOptions = [
                {
                    provider: 'wise',
                    intermediaryCurrencies: ['EUR'],
                    avgCostPercentage: 1.5,
                    avgTimeHours: 24,
                    reliability: 95,
                },
            ];

            expect(route.routeOptions[0].reliability).toBe(95);
        });
    });

    describe('ComplianceRuleEntity', () => {
        it('should create compliance rule for country', () => {
            const rule = new ComplianceRuleEntity();
            rule.countryCode = 'AE';
            rule.countryName = 'United Arab Emirates';
            rule.taxRules = {
                type: 'VAT',
                standardRate: 5,
                specialRates: [],
                taxIdFormat: '^[0-9]{15}$',
                taxIdLabel: 'TRN',
                reverseCharge: false,
            };

            expect(rule.taxRules.type).toBe('VAT');
            expect(rule.taxRules.standardRate).toBe(5);
        });

        it('should define invoice requirements', () => {
            const rule = new ComplianceRuleEntity();
            rule.invoiceRequirements = {
                mandatoryFields: ['taxId', 'customerAddress'],
                fieldValidations: {},
                numberingFormat: 'INV-{year}-{sequence}',
                maxInvoiceAge: 30,
            };

            expect(rule.invoiceRequirements.mandatoryFields).toContain('taxId');
        });
    });

    describe('TranslationMemoryEntity', () => {
        it('should create translation memory entry', () => {
            const memory = new TranslationMemoryEntity();
            memory.sourceLanguage = 'en_US';
            memory.targetLanguage = 'ar_SA';
            memory.sourceText = 'Payment received';
            memory.targetText = 'تم استلام الدفع';
            memory.source = 'human';
            memory.confidence = 1.0;

            expect(memory.confidence).toBe(1.0);
        });

        it('should track usage count', () => {
            const memory = new TranslationMemoryEntity();
            memory.usageCount = 5;

            expect(memory.usageCount).toBe(5);
        });
    });

    describe('RegionConfig', () => {
        it('should create region configuration', () => {
            const config = new RegionConfig();
            config.tenantId = 'tenant-1';
            config.locale = 'ar-AE';
            config.timezone = 'Asia/Dubai';
            config.dateFormat = 'DD/MM/YYYY';
            config.workingDays = [0, 1, 2, 3, 4]; //' Sun-Thu

            expect(config.workingDays).toHaveLength(5);
        });
    });

    describe('PublicHoliday', () => {
        it('should create public holiday', () => {
            const holiday = new PublicHoliday();
            holiday.tenantId = 'tenant-1';
            holiday.name = 'Eid Al Fitr';
            holiday.date = new Date('2024-04-10');
            holiday.isRecurring = true;

            expect(holiday.name).toBe('Eid Al Fitr');
        });
    });

    describe('LanguageMetadataEntity', () => {
        it('should create language metadata', () => {
            const metadata = new LanguageMetadataEntity();
            metadata.code = 'ar_SA';
            metadata.name = 'Arabic (Saudi Arabia)';
            metadata.nativeName = 'العربية';
            metadata.direction = 'rtl';
            metadata.scriptType = 'arabic';

            expect(metadata.direction).toBe('rtl');
        });

        it('should define plural rules', () => {
            const metadata = new LanguageMetadataEntity();
            metadata.pluralRules = {
                zero: true,
                one: true,
                two: true,
                few: true,
                many: true,
                other: true,
            };

            expect(metadata.pluralRules.zero).toBe(true);
        });
    });

    describe('CulturalNormEntity', () => {
        it('should create cultural norms', () => {
            const norms = new CulturalNormEntity();
            norms.countryCode = 'JP';
            norms.countryName = 'Japan';
            norms.paymentBehavior = {
                contractTerms: 30,
                actualPayment: 45,
                acceptableDelay: 10,
                lateThreshold: 20,
            };

            expect(norms.paymentBehavior.contractTerms).toBe(30);
        });

        it('should define communication preferences', () => {
            const norms = new CulturalNormEntity();
            norms.communicationPreferences = {
                formality: 'high',
                directness: 'indirect',
                preferredChannels: ['email', 'phone'],
                businessHours: { start: '09:00', end: '18:00' },
                avoidDays: ['Saturday', 'Sunday'],
            };

            expect(norms.communicationPreferences.formality).toBe('high');
        });
    });

    describe('RegionalPresetEntity', () => {
        it('should create regional preset', () => {
            const preset = new RegionalPresetEntity();
            preset.countryCode = 'AE';
            preset.name = 'United Arab Emirates';
            preset.languageCode = 'ar_AE';
            preset.currencyCode = 'AED';
            preset.timezone = 'Asia/Dubai';

            expect(preset.currencyCode).toBe('AED');
        });

        it('should define compliance settings', () => {
            const preset = new RegionalPresetEntity();
            preset.compliance = {
                taxSystem: 'VAT',
                taxRate: 5,
                taxIdRequired: true,
                taxIdFormat: '^[0-9]{15}$',
            };

            expect(preset.compliance.taxRate).toBe(5);
        });

        it('should list payment methods', () => {
            const preset = new RegionalPresetEntity();
            preset.paymentMethods = ['bank_transfer', 'credit_card', 'upi'];

            expect(preset.paymentMethods).toContain('upi');
        });
    });
});
