import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

/**
 * Payment Route Entity
 * Tracks optimal payment corridors between countries
 */
@Entity('payment_routes')
@Unique(['fromCountry', 'toCountry'])
export class PaymentRouteEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'from_country', length: 2 })
    @Index()
    fromCountry: string; // IN, US, etc.

    @Column({ name: 'to_country', length: 2 })
    @Index()
    toCountry: string;

    @Column({ name: 'from_currency', length: 3 })
    fromCurrency: string;

    @Column({ name: 'to_currency', length: 3 })
    toCurrency: string;

    @Column({ type: 'jsonb' })
    routeOptions: {
        provider: string;
        intermediaryCurrencies: string[];
        avgCostPercentage: number;
        avgTimeHours: number;
        reliability: number; // 0-100
    }[];

    @Column({ name: 'recommended_provider' })
    recommendedProvider: string; // wise, revolut, paypal, swift

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    avgSavingsPercentage: number;

    @Column({ type: 'int', default: 0 })
    usageCount: number; // Track how often this route is used

    @UpdateDateColumn({ name: 'last_analyzed' })
    lastAnalyzed: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * Compliance Rules Entity
 * Country-specific invoice and tax compliance requirements
 */
@Entity('compliance_rules')
export class ComplianceRuleEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'country_code', unique: true, length: 2 })
    @Index()
    countryCode: string;

    @Column({ name: 'country_name' })
    countryName: string;

    @Column({ type: 'jsonb' })
    invoiceRequirements: {
        mandatoryFields: string[];
        fieldValidations: Record<string, string>; // field -> regex
        numberingFormat: string;
        maxInvoiceAge: number; // days before must be issued
    };

    @Column({ type: 'jsonb' })
    taxRules: {
        type: 'VAT' | 'GST' | 'Sales-Tax' | 'None';
        standardRate: number;
        specialRates: { category: string; rate: number }[];
        taxIdFormat: string; // Regex
        taxIdLabel: string; // VAT Number, GSTIN, EIN, etc.
        reverseCharge: boolean;
    };

    @Column({ type: 'jsonb' })
    legalRequirements: {
        requiredStatements: string[];
        disclaimers: string[];
        invoiceCopies: number;
        retentionPeriod: number; // years
    };

    @Column({ type: 'jsonb' })
    documentRequirements: {
        name: string;
        required: boolean;
        template: string;
    }[];

    @Column({ type: 'text', nullable: true })
    regulationNotes?: string;

    @Column({ name: 'last_verified', type: 'date' })
    lastVerified: Date; // When regulation was last checked

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * Translation Memory Entity
 * For reusing similar translations
 */
@Entity('translation_memory')
@Index(['sourceText'], { fulltext: true })
export class TranslationMemoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'source_language', length: 10 })
    sourceLanguage: string;

    @Column({ name: 'target_language', length: 10 })
    targetLanguage: string;

    @Column({ type: 'text' })
    sourceText: string;

    @Column({ type: 'text' })
    targetText: string;

    @Column({ type: 'enum', enum: ['human', 'machine', 'mixed'], default: 'human' })
    source: 'human' | 'machine' | 'mixed';

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.00 })
    confidence: number; // 0-1

    @Column({ type: 'int', default: 0 })
    usageCount: number;

    @Column({ nullable: true })
    domain?: string; // finance, legal, marketing

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
