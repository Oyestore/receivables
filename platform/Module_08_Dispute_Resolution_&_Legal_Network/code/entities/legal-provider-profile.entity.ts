import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ProviderType {
    LAW_FIRM = 'law_firm',
    INDIVIDUAL_LAWYER = 'individual_lawyer',
    LEGAL_CONSULTANT = 'legal_consultant',
    ARBITRATOR = 'arbitrator',
    MEDIATOR = 'mediator'
}

export enum ProviderStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING_VERIFICATION = 'pending_verification'
}

export enum Specialization {
    COMMERCIAL_LAW = 'commercial_law',
    DEBT_RECOVERY = 'debt_recovery',
    CONTRACT_LAW = 'contract_law',
    MSME_LAW = 'msme_law',
    ARBITRATION = 'arbitration',
    MEDIATION = 'mediation',
    GENERAL_PRACTICE = 'general_practice'
}

@Entity('legal_provider_profiles')
@Index(['status'])
@Index(['providerType'])
export class LegalProviderProfile {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'varchar', length: 200, name: 'firm_name' })
    firmName!: string;

    @Column({
        type: 'enum',
        enum: ProviderType,
        name: 'provider_type'
    })
    providerType!: ProviderType;

    @Column({
        type: 'enum',
        enum: ProviderStatus,
        default: ProviderStatus.PENDING_VERIFICATION
    })
    status!: ProviderStatus;

    // Helper computed properties
    get isActive(): boolean {
        return this.status === ProviderStatus.ACTIVE;
    }

    get isVerified(): boolean {
        return this.status !== ProviderStatus.PENDING_VERIFICATION;
    }

    @Column({ type: 'simple-array' })
    specializations!: Specialization[];

    @Column({ type: 'varchar', length: 100, name: 'bar_council_number' })
    barCouncilNumber!: string;

    @Column({ type: 'int', name: 'years_of_experience' })
    yearsOfExperience!: number;

    @Column({ type: 'jsonb' })
    contactInfo!: {
        email: string;
        phone: string;
        address: {
            street: string;
            city: string;
            state: string;
            pincode: string;
        };
    };

    @Column({ type: 'jsonb', nullable: true })
    pricing!: {
        consultationFee: number;
        hourlyRate: number;
        legalNoticeFee: number;
        courtRepresentationFee: number;
        successFeePercentage: number;
    } | null;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    rating!: number;

    @Column({ type: 'int', default: 0, name: 'total_cases_handled' })
    totalCasesHandled!: number;

    @Column({ type: 'int', default: 0, name: 'successful_resolutions' })
    successfulResolutions!: number;

    @Column({ type: 'int', default: 0, name: 'active_cases' })
    activeCases!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'average_resolution_days' })
    averageResolutionDays!: number;

    // Computed success rate
    get successRate(): number {
        if (this.totalCasesHandled === 0) return 0;
        return (this.successfulResolutions / this.totalCasesHandled) * 100;
    }

    @Column({ type: 'jsonb', nullable: true })
    languages!: string[] | null;

    @Column({ type: 'jsonb', nullable: true })
    certifications!: Array<{
        name: string;
        issuedBy: string;
        issuedDate: Date;
    }> | null;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;

    @Column({ type: 'boolean', default: true, name: 'accepts_new_cases' })
    acceptsNewCases!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
