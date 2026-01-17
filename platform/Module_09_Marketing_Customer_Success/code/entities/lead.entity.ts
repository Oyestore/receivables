import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
    NEW = 'NEW',
    CONTACTED = 'CONTACTED',
    QUALIFIED = 'QUALIFIED',
    CONVERTED = 'CONVERTED',
    LOST = 'LOST',
}

export enum LeadSource {
    WEBSITE = 'WEBSITE',
    REFERRAL = 'REFERRAL',
    PARTNER = 'PARTNER',
    CAMPAIGN = 'CAMPAIGN',
    OTHER = 'OTHER',
}

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    companyName: string;

    @Column({
        type: 'enum',
        enum: LeadSource,
        default: LeadSource.WEBSITE,
    })
    source: LeadSource;

    @Column({
        type: 'enum',
        enum: LeadStatus,
        default: LeadStatus.NEW,
    })
    status: LeadStatus;

    @Column({ type: 'float', default: 0 })
    score: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    assignedTo: string; // User ID of the sales rep

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
