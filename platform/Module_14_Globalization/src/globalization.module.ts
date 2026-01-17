import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    CurrencyExchangeRateEntity,
    LocalizationSettingsEntity,
    TranslationEntity,
} from './entities/globalization.entity';
import {
    LanguageMetadataEntity,
    CulturalNormEntity,
    RegionalPresetEntity
} from './entities/enhanced-globalization.entity';
import {
    PaymentRouteEntity,
    ComplianceRuleEntity,
    TranslationMemoryEntity
} from './entities/intelligence.entity';
import { RegionConfigEntity } from './entities/region-config.entity';
import { GlobalizationService } from './services/globalization.service';
import { CurrencyService } from './services/currency.service';
import { I18nService } from './services/i18n.service';
import { PaymentIntelligenceService } from './services/payment-intelligence.service';
import { CulturalIntelligenceService } from './services/cultural-intelligence.service';
import { ComplianceIntelligenceService } from './services/compliance-intelligence.service';
// Additional Intelligence Services
import { AdvancedMultiLanguageSupportService } from './services/advanced-multi-language-support.service';
import { CulturalAdaptationService } from './services/cultural-adaptation.service';
import { CurrencyIntelligenceService } from './services/currency-intelligence.service';
import { IntelligenceService } from './services/intelligence.service';
import { PaymentRouteIntelligenceService } from './services/payment-route-intelligence.service';
import { CulturalIntelligenceNewService } from './services/cultural-intelligence-new.service';
import { RegionalIntelligenceService } from './services/regional-intelligence.service';
import { GlobalizationController } from './controllers/globalization.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            // Core Entities
            CurrencyExchangeRateEntity,
            LocalizationSettingsEntity,
            TranslationEntity,
            // Enhanced Entities
            LanguageMetadataEntity,
            CulturalNormEntity,
            RegionalPresetEntity,
            RegionConfigEntity,
            // Intelligence Entities
            PaymentRouteEntity,
            ComplianceRuleEntity,
            TranslationMemoryEntity
        ]),
    ],
    controllers: [GlobalizationController],
    providers: [
        // Core Services (Original 6)
        GlobalizationService,
        CurrencyService,
        I18nService,
        PaymentIntelligenceService,
        CulturalIntelligenceService,
        ComplianceIntelligenceService,
        // Advanced Intelligence Services (Added 7)
        AdvancedMultiLanguageSupportService,
        CulturalAdaptationService,
        CurrencyIntelligenceService,
        IntelligenceService,
        PaymentRouteIntelligenceService,
        CulturalIntelligenceNewService,
        RegionalIntelligenceService,
    ],
    exports: [
        // Export all services for cross-module usage
        GlobalizationService,
        CurrencyService,
        I18nService,
        PaymentIntelligenceService,
        CulturalIntelligenceService,
        ComplianceIntelligenceService,
        AdvancedMultiLanguageSupportService,
        CulturalAdaptationService,
        CurrencyIntelligenceService,
        IntelligenceService,
        PaymentRouteIntelligenceService,
        CulturalIntelligenceNewService,
        RegionalIntelligenceService,
    ],
})
export class GlobalizationModule { }
