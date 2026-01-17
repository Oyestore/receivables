import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Language Metadata Entity
 * Contains metadata about supported languages including RTL direction
 */
@Entity('language_metadata')
export class LanguageMetadataEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 10 })
    @Index()
    code: string; // en_US, ar_SA, he_IL, etc.

    @Column()
    name: string; // English (US), العربية, עברית

    @Column()
    nativeName: string; // English, العربية, עברית

    @Column({ type: 'enum', enum: ['ltr', 'rtl'], default: 'ltr' })
    direction: 'ltr' | 'rtl';

    @Column({ type: 'enum', enum: ['latin', 'arabic', 'hebrew', 'devanagari', 'chinese', 'japanese'], default: 'latin' })
    scriptType: 'latin' | 'arabic' | 'hebrew' | 'devanagari' | 'chinese' | 'japanese';

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'json', nullable: true })
    pluralRules?: {
        zero?: boolean;
        one: boolean;
        two?: boolean;
        few?: boolean;
        many?: boolean;
        other: boolean;
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * Cultural NormsEntity
 * Business culture and payment norms by country
 */
@Entity('cultural_norms')
export class CulturalNormEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 2 })
    @Index()
    countryCode: string; // US, IN, JP, etc.

    @Column()
    countryName: string;

    @Column({ type: 'jsonb' })
    paymentBehavior: {
        contractTerms: number;        // Standard payment terms (days)
        actualPayment: number;        // Actual average payment (days)
        acceptableDelay: number;      // Days considered "normal delay"
        lateThreshold: number;        // Days before truly concerning
    };

    @Column({ type: 'jsonb' })
    communicationPreferences: {
        formality: 'high' | 'medium' | 'low';
        directness: 'blunt' | 'balanced' | 'indirect';
        preferredChannels: string[]; // ['email', 'whatsapp', 'phone']
        businessHours: { start: string; end: string };
        avoidDays: string[];         // Fridays in UAE, etc.
    };

    @Column({ type: 'jsonb' })
    businessCulture: {
        relationshipImportance: number;  // 0-10 scale
        directnessLevel: number;         // 0-10 scale
        negotiationStyle: string;
        decisionSpeed: 'fast' | 'medium' | 'slow';
    };

    @Column({ type: 'jsonb', nullable: true })
    reminderStrategy: {
        firstReminderDays: number;     // Days after due date
        escalationInterval: number;    // Days between reminders
        maxReminders: number;
        recommendedTone: 'firm' | 'neutral' | 'gentle';
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * Regional Preset Entity
 * Pre-configured settings for quick regional setup
 */
@Entity('regional_presets')
export class RegionalPresetEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 2 })
    @Index()
    countryCode: string;

    @Column()
    name: string; // United Arab Emirates, India, USA

    @Column({ name: 'language_code', length: 10 })
    languageCode: string; // Primary language for country

    @Column({ name: 'fallback_language', length: 10, default: 'en_US' })
    fallbackLanguage: string;

    @Column({ name: 'currency_code', length: 3 })
    currencyCode: string;

    @Column()
    timezone: string;

    @Column({ name: 'date_format' })
    dateFormat: string;

    @Column({ name: 'time_format' })
    timeFormat: string;

    @Column({ type: 'jsonb' })
    numberFormat: {
        decimalSeparator: string;
        thousandsSeparator: string;
        decimalPlaces: number;
    };

    @Column({ type: 'jsonb' })
    compliance: {
        taxSystem: 'VAT' | 'GST' | 'Sales-Tax' | 'None';
        taxRate: number;
        taxIdRequired: boolean;
        taxIdFormat?: string; // Regex as string
    };

    @Column({ type: 'simple-array' })
    paymentMethods: string[]; // ['bank_transfer', 'upi', 'credit_card']

    @Column({ name: 'invoice_template', default: 'standard' })
    invoiceTemplate: string;

    @Column({ type: 'simple-array' })
    workingDays: number[]; // [0,1,2,3,4,5,6] where 0=Sunday

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
