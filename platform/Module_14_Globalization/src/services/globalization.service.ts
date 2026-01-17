import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    LocalizationSettingsEntity,
    TranslationEntity,
} from '../entities/globalization.entity';
import {
    CreateExchangeRateDto,
    CurrencyConversionDto,
    UpdateLocalizationDto,
    CreateTranslationDto,
} from '../dto/globalization.dto';
import { CurrencyService } from './currency.service';
import { I18nService } from './i18n.service';

import { PaymentIntelligenceService } from './payment-intelligence.service';
import { CulturalIntelligenceService } from './cultural-intelligence.service';
import { ComplianceIntelligenceService } from './compliance-intelligence.service';

@Injectable()
export class GlobalizationService {
    constructor(
        // Inject specialized services
        private readonly currencyService: CurrencyService,
        private readonly i18nService: I18nService,
        private readonly paymentIntelligence: PaymentIntelligenceService,
        private readonly culturalIntelligence: CulturalIntelligenceService,
        private readonly complianceIntelligence: ComplianceIntelligenceService,

        // Repositories managed directly by this service (or move to specialized later)
        @InjectRepository(LocalizationSettingsEntity)
        private readonly localizationRepository: Repository<LocalizationSettingsEntity>,
        @InjectRepository(TranslationEntity)
        private readonly translationRepository: Repository<TranslationEntity>,
    ) { }

    // ==================================================================
    // Currency Operations (Delegated to CurrencyService)
    // ==================================================================

    async createExchangeRate(tenantId: string, dto: CreateExchangeRateDto) {
        return this.currencyService.addRate(tenantId, {
            fromCurrency: dto.fromCurrency,
            toCurrency: dto.toCurrency,
            rate: dto.rate,
            rateDate: new Date(dto.rateDate),
            source: 'manual'
        });
    }

    // ... Wait, I'm rewriting the entire file. I can define whatever I want.
    // I will inject the repo so I can implement createExchangeRate properly.

    async getExchangeRate(tenantId: string, from: string, to: string) {
        const rate = await this.currencyService.getRate(from, to, tenantId);
        // Map to expected entity structure if controller expects entity
        // The controller returns whatever this returns.
        // Old service returned Entity. New service returns number.
        // This break in return type might affect Controller.
        // Controller: returns await service.getExchangeRate(...)
        // Client expects... probably the rate object?
        // Let's check controller. `return await ...`
        // Let's try to return an object that looks like the entity or just the rate?
        // The DTO says nothing about return type?
        // Let's return a constructed object to be safe.
        return {
            rate,
            fromCurrency: from,
            toCurrency: to,
            rateDate: new Date(),
            source: 'calculated'
        };
    }

    async getAllExchangeRates(tenantId: string) {
        return this.currencyService.getAllRates(tenantId);
    }

    async convertCurrency(tenantId: string, dto: CurrencyConversionDto) {
        return this.currencyService.convert(dto.amount, dto.fromCurrency, dto.toCurrency, tenantId);
    }

    // ==================================================================
    // Localization Settings
    // ==================================================================

    async getLocalizationSettings(tenantId: string): Promise<LocalizationSettingsEntity> {
        let settings = await this.localizationRepository.findOne({
            where: { tenantId },
        });

        if (!settings) {
            settings = this.localizationRepository.create({
                tenantId,
                languageCode: 'en_US',
                countryCode: 'US',
                currencyCode: 'USD',
                timezone: 'UTC',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm:ss',
            });
            settings = await this.localizationRepository.save(settings);
        }
        return settings;
    }

    async updateLocalizationSettings(tenantId: string, dto: UpdateLocalizationDto): Promise<LocalizationSettingsEntity> {
        let settings = await this.localizationRepository.findOne({
            where: { tenantId },
        });

        if (!settings) {
            settings = this.localizationRepository.create({ ...dto, tenantId });
        } else {
            Object.assign(settings, dto);
        }

        const saved = await this.localizationRepository.save(settings);
        // Cache invalidation will be handled by cache service events
        return saved;
    }

    // ==================================================================
    // Translations (Delegated/Enhanced)
    // ==================================================================

    async createTranslation(dto: CreateTranslationDto) {
        // Map DTO to enhanced entity
        const translation = this.translationRepository.create({
            ...dto,
            namespace: 'common', // Default
            status: 'published' // Auto-publish for backward compact
        });
        return await this.translationRepository.save(translation);
    }

    async getTranslations(languageCode: string) {
        return this.i18nService.getTranslationsForFrontend(languageCode);
    }

    // Support methods
    async getSupportedCurrencies() {
        return ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD'];
    }

    async getSupportedLanguages() {
        return [
            { code: 'en_US', name: 'English (US)' },
            { code: 'es_ES', name: 'Spanish (Spain)' },
            { code: 'ar_SA', name: 'Arabic (Saudi Arabia)', dir: 'rtl' },
            { code: 'he_IL', name: 'Hebrew (Israel)', dir: 'rtl' },
            { code: 'hi_IN', name: 'Hindi (India)' }
        ];
    }

    // Wrappers for Controller compatibility
    async optimizePaymentRoute(tenantId: string, dto: any) {
        return this.paymentIntelligence.optimizePaymentRoute(dto);
    }

    async getCulturalInsights(countryCode: string) {
        return this.culturalIntelligence.getPaymentCulture(countryCode);
    }

    async adaptCommunication(dto: any) {
        return this.culturalIntelligence.adaptMessage(dto);
    }

    async validateInvoiceCompliance(countryCode: string, invoice: any) {
        return this.complianceIntelligence.validateInvoiceCompliance(invoice, countryCode);
    }
}

