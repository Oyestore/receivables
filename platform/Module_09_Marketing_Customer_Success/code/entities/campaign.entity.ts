import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CampaignType {
    EMAIL = 'email',
    SMS = 'sms',
    WHATSAPP = 'whatsapp',
    MULTI_CHANNEL = 'multi_channel',
}

export enum CampaignStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('campaigns')
@Index(['tenantId'])
@Index(['status'])
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    tenantId: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: CampaignType,
    })
    type: CampaignType;

    @Column({
        type: 'enum',
        enum: CampaignStatus,
        default: CampaignStatus.DRAFT,
    })
    status: CampaignStatus;

    @Column({ type: 'jsonb', nullable: true })
    targetAudience: Record<string, any>;

    @Column({ type: 'jsonb' })
    content: Record<string, any>;

    @Column({ nullable: true })
    scheduledAt: Date;

    @Column({ nullable: true })
    startedAt: Date;

    @Column({ nullable: true })
    completedAt: Date;

    @Column({ type: 'int', default: 0 })
    totalSent: number;

    @Column({ type: 'int', default: 0 })
    totalOpened: number;

    @Column({ type: 'int', default: 0 })
    totalClicked: number;

    @Column({ type: 'int', default: 0 })
    totalConverted: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
