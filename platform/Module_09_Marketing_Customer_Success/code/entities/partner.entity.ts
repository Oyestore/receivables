import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PartnerType {
    CHANNEL = 'channel',
    AFFILIATE = 'affiliate',
    INTEGRATION = 'integration',
    STRATEGIC = 'strategic',
}

export enum PartnerStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    TERMINATED = 'terminated',
}

@Entity('partners')
export class Partner {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 50, default: PartnerType.CHANNEL })
    type: PartnerType;

    @Column({ type: 'varchar', length: 50, default: PartnerStatus.PENDING })
    status: PartnerStatus;

    @Column({ type: 'json' })
    primaryContact: {
        name: string;
        email: string;
        phone?: string;
    };

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    commissionRate: number;

    @Column({ type: 'varchar', length: 20, default: 'bronze' })
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';

    @Column({ type: 'int', default: 0 })
    totalReferrals: number;

    @Column({ type: 'int', default: 0 })
    activeCustomers: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalRevenue: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    lifetimeCommissions: number;

    @CreateDateColumn()
    joinedAt: Date;

    @UpdateDateColumn()
    lastActivityAt: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    apiKey: string;

    @Column({ type: 'int', default: 0 })
    apiKeysGenerated: number;
}
