import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DisputeCase } from './dispute-case.entity';

export enum CollectionStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    PAUSED = 'paused',
    NEGOTIATING = 'negotiating',
    LEGAL_NOTICE_SENT = 'legal_notice_sent',
    SETTLED = 'settled',
    PAID = 'paid',
    WRITTEN_OFF = 'written_off',
    CANCELLED = 'cancelled'
}

export enum CollectionStrategy {
    FRIENDLY_REMINDER = 'friendly_reminder',
    FORMAL_NOTICE = 'formal_notice',
    LEGAL_ACTION = 'legal_action',
    NEGOTIATION = 'negotiation',
    SETTLEMENT = 'settlement',
    WRITE_OFF = 'write_off'
}

@Entity('collection_cases')
@Index(['status'])
@Index(['tenantId'])
@Index(['disputeId'])
@Index(['createdAt'])
export class CollectionCase {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', nullable: true, name: 'dispute_id' })
    disputeId!: string | null;

    @ManyToOne(() => DisputeCase, { eager: false, nullable: true })
    @JoinColumn({ name: 'dispute_id' })
    dispute!: DisputeCase | null;

    @Column({ type: 'varchar', length: 50, unique: true, name: 'case_number' })
    caseNumber!: string;

    @Column({ type: 'uuid', name: 'customer_id' })
    customerId!: string;

    @Column({ type: 'varchar', length: 200, name: 'customer_name' })
    customerName!: string;

    @Column({ type: 'uuid', name: 'invoice_id' })
    invoiceId!: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'outstanding_amount' })
    outstandingAmount!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'original_amount' })
    originalAmount!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'recovered_amount' })
    recoveredAmount!: number;

    @Column({
        type: 'enum',
        enum: CollectionStatus,
        default: CollectionStatus.PENDING
    })
    status!: CollectionStatus;

    @Column({
        type: 'enum',
        enum: CollectionStrategy
    })
    strategy!: CollectionStrategy;

    @Column({ type: 'int', default: 0, name: 'days_overdue' })
    daysOverdue!: number;

    @Column({ type: 'uuid', nullable: true, name: 'assigned_collector_id' })
    assignedCollectorId!: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true, name: 'assigned_collector_name' })
    assignedCollectorName!: string | null;

    @Column({ type: 'uuid', nullable: true, name: 'legal_provider_id' })
    legalProviderId!: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'last_contact_date' })
    lastContactDate!: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'next_follow_up_date' })
    nextFollowUpDate!: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    communications!: Array<{
        id: string;
        type: 'email' | 'sms' | 'call' | 'whatsapp' | 'letter';
        date: Date;
        content: string;
        sentBy: string;
        status: 'sent' | 'delivered' | 'read' | 'bounced';
    }> | null;

    @Column({ type: 'jsonb', nullable: true, name: 'payment_plan' })
    paymentPlan!: {
        installments: number;
        frequency: 'weekly' | 'biweekly' | 'monthly';
        amountPerInstallment: number;
        startDate: Date;
        endDate: Date;
        paidInstallments: number;
    } | null;

    @Column({ type: 'jsonb', nullable: true })
    settlement!: {
        proposedAmount: number;
        agreedAmount: number;
        discount: number;
        terms: string;
        agreedDate: Date;
        paymentDeadline: Date;
    } | null;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'closed_at' })
    closedAt!: Date | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'closed_reason' })
    closedReason!: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @Column({ type: 'varchar', length: 100, name: 'created_by' })
    createdBy!: string;
}

@Entity('collection_sequences')
@Index(['collectionCaseId'])
@Index(['tenantId'])
@Index(['status'])
export class CollectionSequence {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', name: 'collection_case_id' })
    collectionCaseId!: string;

    @ManyToOne(() => CollectionCase, { eager: false })
    @JoinColumn({ name: 'collection_case_id' })
    collectionCase!: CollectionCase;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'jsonb' })
    steps!: Array<{
        sequence: number;
        type: 'email' | 'sms' | 'call' | 'whatsapp' | 'legal_notice';
        templateId: string;
        delayDays: number;
        status: 'pending' | 'sent' | 'skipped' | 'failed';
        scheduledAt: Date | null;
        executedAt: Date | null;
        metadata: Record<string, any>;
    }>;

    @Column({ type: 'varchar', length: 50, default: 'active' })
    status!: 'active' | 'paused' | 'completed' | 'cancelled';

    @Column({ type: 'int', default: 0, name: 'current_step' })
    currentStep!: number;

    @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
    startedAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
    completedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
