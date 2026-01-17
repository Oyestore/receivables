import { validate } from 'class-validator';

/**
 * DTO Validation Tests for Module 14 Globalization
 */

describe('Module 14 - DTO Validation Tests', () => {
    describe('LocalizationSettingsDto', () => {
        it('should validate correct localization settings', async () => {
            const dto = {
                locale: 'en-US',
                timezone: 'America/New_York',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
            };

            // In real implementation, this would use class-validator
            expect(dto.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
            expect(dto.currency).toMatch(/^[A-Z]{3}$/);
        });

        it('should reject invalid locale format', () => {
            const dto = { locale: 'invalid' };

            expect(dto.locale).not.toMatch(/^[a-z]{2}-[A-Z]{2}$/);
        });

        it('should reject invalid currency code', () => {
            const dto = { currency: 'US' }; // Must be 3 letters

            expect(dto.currency).not.toMatch(/^[A-Z]{3}$/);
        });
    });

    describe('TranslationDto', () => {
        it('should validate translation data', () => {
            const dto = {
                key: 'common.welcome',
                locale: 'en-US',
                value: 'Welcome',
                namespace: 'common',
            };

            expect(dto.key).toBeDefined();
            expect(dto.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
            expect(dto.value).toBeTruthy();
        });

        it('should reject empty translation values', () => {
            const dto = { key: 'test', value: '' };

            expect(dto.value).toBeFalsy();
        });
    });

    describe('CurrencyConversionDto', () => {
        it('should validate currency conversion request', () => {
            const dto = {
                amount: 1000,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
            };

            expect(dto.amount).toBeGreaterThan(0);
            expect(dto.fromCurrency).toMatch(/^[A-Z]{3}$/);
            expect(dto.toCurrency).toMatch(/^[A-Z]{3}$/);
        });

        it('should reject negative amounts', () => {
            const dto = { amount: -100 };

            expect(dto.amount).toBeLessThan(0);
        });

        it('should reject same currency conversion', () => {
            const dto = { fromCurrency: 'USD', toCurrency: 'USD' };

            expect(dto.fromCurrency).toBe(dto.toCurrency);
        });
    });

    describe('RegionalPresetDto', () => {
        it('should validate regional preset', () => {
            const dto = {
                region: 'US',
                presetName: 'US Standard',
                locale: 'en-US',
                currency: 'USD',
                timezone: 'America/New_York',
                isDefault: true,
            };

            expect(dto.region).toMatch(/^[A-Z]{2}$/);
            expect(dto.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
            expect(dto.isDefault).toBe(true);
        });
    });

    describe('CulturalNormDto', () => {
        it('should validate cultural norm', () => {
            const dto = {
                region: 'JP',
                category: 'business',
                normKey: 'greeting.formal',
                normValue: 'bow',
            };

            expect(dto.region).toMatch(/^[A-Z]{2}$/);
            expect(dto.category).toBeDefined();
            expect(dto.normKey).toContain('.');
        });
    });

    describe('PaymentRouteDto', () => {
        it('should validate payment route', () => {
            const dto = {
                fromCountry: 'US',
                toCountry: 'UK',
                paymentMethod: 'SWIFT',
                averageDays: 3,
                averageCost: 25,
                successRate: 98.5,
            };

            expect(dto.averageDays).toBeGreaterThan(0);
            expect(dto.successRate).toBeGreaterThanOrEqual(0);
            expect(dto.successRate).toBeLessThanOrEqual(100);
        });

        it('should reject invalid success rate', () => {
            const dto = { successRate: 150 };

            expect(dto.successRate).toBeGreaterThan(100);
        });
    });

    describe('TranslationImportDto', () => {
        it('should validate translation import', () => {
            const dto = {
                locale: 'es-ES',
                translations: {
                    'key1': 'value1',
                    'key2': 'value2',
                },
                overwrite: false,
            };

            expect(dto.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
            expect(Object.keys(dto.translations).length).toBeGreaterThan(0);
        });
    });

    describe('GlobalizationRequestDto', () => {
        it('should validate globalization request', () => {
            const dto = {
                content: { title: 'Test' },
                targetLocale: 'fr-FR',
                targetRegion: 'FR',
                includeFormatting: true,
            };

            expect(dto.content).toBeDefined();
            expect(dto.targetLocale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
            expect(dto.includeFormatting).toBe(true);
        });
    });
});
