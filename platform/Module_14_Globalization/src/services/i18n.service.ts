import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TranslationEntity } from '../entities/globalization.entity';
import { LanguageMetadataEntity } from '../entities/enhanced-globalization.entity';

@Injectable()
export class I18nService implements OnModuleInit {
    private readonly logger = new Logger(I18nService.name);
    // Two-level cache: language -> namespace -> key -> value
    private translationCache = new Map<string, Map<string, any>>();

    constructor(
        @InjectRepository(TranslationEntity)
        private translationRepo: Repository<TranslationEntity>,
        @InjectRepository(LanguageMetadataEntity)
        private langRepo: Repository<LanguageMetadataEntity>
    ) { }

    async onModuleInit() {
        // Build initial cache for common namespace
        await this.reloadCache('en_US', 'common');
    }

    /**
     * Get translation with interpolation and pluralization support
     */
    async translate(
        key: string,
        lang: string,
        params: Record<string, any> = {},
        namespace: string = 'common'
    ): Promise<string> {
        // 1. Check cache
        let nsCache = this.getNamespaceCache(lang, namespace);

        // 2. Fallback to DB if not in cache (lazy load namespace)
        if (!nsCache) {
            nsCache = await this.reloadCache(lang, namespace);
        }

        let text = nsCache?.get(key);

        // 3. Fallback to default language (en_US)
        if (!text && lang !== 'en_US') {
            // Try fetching fallback
            text = await this.translate(key, 'en_US', params, namespace);
            return text; // Fallback already interpolated
        }

        if (!text) return key; // Return key if absolutely nothing found

        // 4. Handle Pluralization
        if (typeof text === 'object' && text !== null) {
            text = this.resolvePlural(text, params.count, lang);
        }

        // 5. Interpolation
        return this.interpolate(text, params);
    }

    /**
     * Get all translations for a language/namespace (for frontend export)
     */
    async getTranslationsForFrontend(lang: string, namespace: string = 'common'): Promise<Record<string, any>> {
        let nsCache = this.getNamespaceCache(lang, namespace);
        if (!nsCache) {
            nsCache = await this.reloadCache(lang, namespace);
        }
        return Object.fromEntries(nsCache || new Map());
    }

    /**
     * Resolve plural form based on simple rules (extensible to full CLDR)
     */
    private resolvePlural(forms: any, count: number | undefined, lang: string): string {
        if (count === undefined) return forms.other || forms.one || '';

        // Simplified CLDR logic (English-like)
        // In production, would use Intl.PluralRules
        if (count === 0 && forms.zero) return forms.zero;
        if (count === 1 && forms.one) return forms.one;
        return forms.other || '';
    }

    private interpolate(text: string, params: Record<string, any>): string {
        if (typeof text !== 'string') return String(text);

        return text.replace(/{{([^}]+)}}/g, (_, key) => {
            const value = params[key.trim()];
            return value !== undefined ? String(value) : `{{${key}}}`;
        });
    }

    /**
     * Load translations from DB to Cache
     */
    private async reloadCache(lang: string, namespace: string): Promise<Map<string, any>> {
        const translations = await this.translationRepo.find({
            where: { languageCode: lang, namespace }
        });

        const map = new Map<string, any>();
        translations.forEach(t => {
            // Handle JSONB or Text content transparency
            map.set(t.translationKey, t.translatedText);
        });

        if (!this.translationCache.has(lang)) {
            this.translationCache.set(lang, new Map());
        }
        this.translationCache.get(lang).set(namespace, map);

        this.logger.debug(`Loaded ${translations.length} keys for ${lang}/${namespace}`);
        return map;
    }

    private getNamespaceCache(lang: string, namespace: string): Map<string, any> | undefined {
        return this.translationCache.get(lang)?.get(namespace);
    }
}
