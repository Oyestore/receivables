import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('currency_exchange_rates')
export class CurrencyExchangeRateEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'from_currency', length: 3 })
    fromCurrency: string; // USD, EUR, INR, etc.

    @Column({ name: 'to_currency', length: 3 })
    toCurrency: string;

    @Column({ type: 'decimal', precision: 15, scale: 6 })
    rate: number;

    @Column({ name: 'rate_date', type: 'date' })
    rateDate: Date;

    @Column({ default: 'manual' })
    source: 'manual' | 'api' | 'bank';

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('localization_settings')
export class LocalizationSettingsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'language_code', length: 10, default: 'en_US' })
    languageCode: string; // en_US, hi_IN, es_ES, etc.

    @Column({ name: 'country_code', length: 2 })
    countryCode: string; // IN, US, GB, etc.

    @Column({ name: 'currency_code', length: 3 })
    currencyCode: string; // INR, USD, EUR, etc.

    @Column({ name: 'timezone', default: 'UTC' })
    timezone: string;

    @Column({ name: 'date_format', default: 'YYYY-MM-DD' })
    dateFormat: string;

    @Column({ name: 'time_format', default: 'HH:mm:ss' })
    timeFormat: string;

    @Column({ name: 'number_format', type: 'jsonb', nullable: true })
    numberFormat?: {
        decimalSeparator: string;
        thousandsSeparator: string;
        decimalPlaces: number;
    };

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('translations')
export class TranslationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'language_code', length: 10 })
    languageCode: string;

    @Column({ length: 50, default: 'common' })
    namespace: string; // common, invoices, payments, etc.

    @Column({ name: 'translation_key' })
    translationKey: string; // title, submit_button, etc.

    @Column({ type: 'jsonb' })
    translatedText: string | {
        zero?: string;
        one: string;
        two?: string;
        few?: string;
        many?: string;
        other: string;
    }; // Support CLDR pluralization

    @Column({ nullable: true })
    context?: string; // Additional context for translators

    @Column({ type: 'enum', enum: ['draft', 'in_review', 'approved', 'published'], default: 'draft' })
    status: 'draft' | 'in_review' | 'approved' | 'published';

    @Column({ default: false })
    isVerified: boolean;

    @Column({ name: 'translator_id', nullable: true })
    translatorId?: string;

    @Column({ name: 'reviewer_id', nullable: true })
    reviewerId?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
