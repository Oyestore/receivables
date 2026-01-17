import {
    CurrencyExchangeRateEntity,
    LocalizationSettingsEntity,
    TranslationEntity,
} from '../src/entities/globalization.entity';
import {
    LanguageMetadataEntity,
    CulturalNormEntity,
    RegionalPresetEntity,
} from '../src/entities/enhanced-globalization.entity';
import {
    PaymentRouteEntity,
    ComplianceRuleEntity,
    TranslationMemoryEntity,
} from '../src/entities/intelligence.entity';

/**
 * Test fixtures and mock data for Module 14 Globalization
 */

export class TestFixtures {
    /**
     * Create mock CurrencyExchangeRate
     */
    static createMockCurrencyRate(overrides?: Partial<CurrencyExchangeRateEntity>): CurrencyExchangeRateEntity {
        const rate = new CurrencyExchangeRateEntity();
        rate.id = overrides?.id || '1';
        rate.fromCurrency = overrides?.fromCurrency || 'USD';
        rate.toCurrency = overrides?.toCurrency || 'EUR';
        rate.rate = overrides?.rate || 0.92;
        rate.source = overrides?.source || 'ECB';
        rate.validFrom = overrides?.validFrom || new Date();
        rate.validTo = overrides?.validTo || new Date(Date.now() + 24 * 60 * 60 * 1000);
        rate.createdAt = overrides?.createdAt || new Date();
        rate.updatedAt = overrides?.updatedAt || new Date();
        return rate;
    }

    /**
     * Create mock LocalizationSettings
     */
    static createMockLocalizationSettings(overrides?: Partial<LocalizationSettingsEntity>): LocalizationSettingsEntity {
        const settings = new LocalizationSettingsEntity();
        settings.id = overrides?.id || '1';
        settings.tenantId = overrides?.tenantId || 'tenant-1';
        settings.locale = overrides?.locale || 'en-US';
        settings.timezone = overrides?.timezone || 'America/New_York';
        settings.dateFormat = overrides?.dateFormat || 'MM/DD/YYYY';
        settings.timeFormat = overrides?.timeFormat || '12h';
        settings.currency = overrides?.currency || 'USD';
        settings.numberFormat = overrides?.numberFormat || '1,234.56';
        settings.firstDayOfWeek = overrides?.firstDayOfWeek || 0;
        settings.createdAt = overrides?.createdAt || new Date();
        settings.updatedAt = overrides?.updatedAt || new Date();
        return settings;
    }

    /**
     * Create mock Translation
     */
    static createMockTranslation(overrides?: Partial<TranslationEntity>): TranslationEntity {
        const translation = new TranslationEntity();
        translation.id = overrides?.id || '1';
        translation.key = overrides?.key || 'common.welcome';
        translation.locale = overrides?.locale || 'en-US';
        translation.value = overrides?.value || 'Welcome';
        translation.namespace = overrides?.namespace || 'common';
        translation.createdAt = overrides?.createdAt || new Date();
        translation.updatedAt = overrides?.updatedAt || new Date();
        return translation;
    }

    /**
     * Create mock LanguageMetadata
     */
    static createMockLanguageMetadata(overrides?: Partial<LanguageMetadataEntity>): LanguageMetadataEntity {
        const metadata = new LanguageMetadataEntity();
        metadata.id = overrides?.id || '1';
        metadata.languageCode = overrides?.languageCode || 'en';
        metadata.languageName = overrides?.languageName || 'English';
        metadata.nativeName = overrides?.nativeName || 'English';
        metadata.isRTL = overrides?.isRTL || false;
        metadata.isActive = overrides?.isActive ?? true;
        metadata.completionPercentage = overrides?.completionPercentage || 100;
        metadata.createdAt = overrides?.createdAt || new Date();
        metadata.updatedAt = overrides?.updatedAt || new Date();
        return metadata;
    }

    /**
     * Create mock CulturalNorm
     */
    static createMockCulturalNorm(overrides?: Partial<CulturalNormEntity>): CulturalNormEntity {
        const norm = new CulturalNormEntity();
        norm.id = overrides?.id || '1';
        norm.region = overrides?.region || 'US';
        norm.category = overrides?.category || 'communication';
        norm.normKey = overrides?.normKey || 'greeting.formal';
        norm.normValue = overrides?.normValue || 'Mr./Ms.';
        norm.description = overrides?.description || 'Formal greeting prefix';
        norm.createdAt = overrides?.createdAt || new Date();
        norm.updatedAt = overrides?.updatedAt || new Date();
        return norm;
    }

    /**
     * Create mock RegionalPreset
     */
    static createMockRegionalPreset(overrides?: Partial<RegionalPresetEntity>): RegionalPresetEntity {
        const preset = new RegionalPresetEntity();
        preset.id = overrides?.id || '1';
        preset.region = overrides?.region || 'US';
        preset.presetName = overrides?.presetName || 'US Standard';
        preset.locale = overrides?.locale || 'en-US';
        preset.currency = overrides?.currency || 'USD';
        preset.timezone = overrides?.timezone || 'America/New_York';
        preset.dateFormat = overrides?.dateFormat || 'MM/DD/YYYY';
        preset.isDefault = overrides?.isDefault ?? true;
        preset.createdAt = overrides?.createdAt || new Date();
        preset.updatedAt = overrides?.updatedAt || new Date();
        return preset;
    }

    /**
     * Create mock PaymentRoute
     */
    static createMockPaymentRoute(overrides?: Partial<PaymentRouteEntity>): PaymentRouteEntity {
        const route = new PaymentRouteEntity();
        route.id = overrides?.id || '1';
        route.fromCountry = overrides?.fromCountry || 'US';
        route.toCountry = overrides?.toCountry || 'UK';
        route.paymentMethod = overrides?.paymentMethod || 'SWIFT';
        route.averageDays = overrides?.averageDays || 3;
        route.averageCost = overrides?.averageCost || 25.00;
        route.successRate = overrides?.successRate || 98.5;
        route.isRecommended = overrides?.isRecommended ?? true;
        route.createdAt = overrides?.createdAt || new Date();
        route.updatedAt = overrides?.updatedAt || new Date();
        return route;
    }

    /**
     * Create mock ComplianceRule
     */
    static createMockComplianceRule(overrides?: Partial<ComplianceRuleEntity>): ComplianceRuleEntity {
        const rule = new ComplianceRuleEntity();
        rule.id = overrides?.id || '1';
        rule.region = overrides?.region || 'EU';
        rule.ruleCode = overrides?.ruleCode || 'GDPR-001';
        rule.ruleCategory = overrides?.ruleCategory || 'data_privacy';
        rule.ruleDescription = overrides?.ruleDescription || 'Data retention limits';
        rule.severity = overrides?.severity || 'high';
        rule.isActive = overrides?.isActive ?? true;
        rule.createdAt = overrides?.createdAt || new Date();
        rule.updatedAt = overrides?.updatedAt || new Date();
        return rule;
    }

    /**
     * Create mock TranslationMemory
     */
    static createMockTranslationMemory(overrides?: Partial<TranslationMemoryEntity>): TranslationMemoryEntity {
        const memory = new TranslationMemoryEntity();
        memory.id = overrides?.id || '1';
        memory.sourceText = overrides?.sourceText || 'Hello';
        memory.targetText = overrides?.targetText || 'Hola';
        memory.sourceLocale = overrides?.sourceLocale || 'en';
        memory.targetLocale = overrides?.targetLocale || 'es';
        memory.context = overrides?.context || 'greeting';
        memory.usageCount = overrides?.usageCount || 10;
        memory.createdAt = overrides?.createdAt || new Date();
        memory.updatedAt = overrides?.updatedAt || new Date();
        return memory;
    }
}
