import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum DisputeStatus {
    DRAFT = 'draft',
    FILED = 'filed',
    UNDER_REVIEW = 'under_review',
    MEDIATION = 'mediation',
    ARBITRATION = 'arbitration',
    LEGAL_NOTICE_SENT = 'legal_notice_sent',
    COURT_PROCEEDINGS = 'court_proceedings',
    RESOLVED = 'resolved',
    CLOSED = 'closed'
}

export enum DisputeType {
    NON_PAYMENT = 'non_payment',
    PARTIAL_PAYMENT = 'partial_payment',
    DELAYED_PAYMENT = 'delayed_payment',
    QUALITY_DISPUTE = 'quality_dispute',
    QUANTITY_DISPUTE = 'quantity_dispute',
    CONTRACT_BREACH = 'contract_breach',
    OTHER = 'other'
}

export enum DisputePriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
}

@Entity('dispute_cases')
@Index(['status'])
@Index(['priority'])
@Index(['tenantId'])
export class DisputeCase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId: string;

    @Column({ type: 'varchar', length: 50, unique: true, name: 'case_number' })
    caseNumber: string;

    @Column({ type: 'uuid', name: 'invoice_id' })
    invoiceId: string;

    @Column({ type: 'uuid', name: 'customer_id' })
    customerId: string;

    @Column({ type: 'varchar', length: 200, name: 'customer_name' })
    customerName: string;

    @Column({
        type: 'enum',
        enum: DisputeType,
        default: DisputeType.NON_PAYMENT
    })
    type: DisputeType;

    @Column({
        type: 'enum',
        enum: DisputeStatus,
        default: DisputeStatus.DRAFT
    })
    status: DisputeStatus;

    @Column({
        type: 'enum',
        enum: DisputePriority,
        default: DisputePriority.MEDIUM
    })
    priority: DisputePriority;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'disputed_amount' })
    disputedAmount: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    evidence: {
        documents: Array<{
            id: string;
            name: string;
            url: string;
            type: string;
            uploadedAt: Date;
        }>;
        communications: Array<{
            id: string;
            type: string;
            date: Date;
            summary: string;
        }>;
    } | null;

    @Column({ type: 'uuid', nullable: true, name: 'assigned_legal_provider_id' })
    assignedLegalProviderId: string | null;

    @Column({ type: 'jsonb', nullable: true })
    timeline: Array<{
        date: Date;
        event: string;
        description: string;
        performedBy: string;
    }> | null;

    @Column({ type: 'jsonb', nullable: true })
    resolution: {
        type: string;
        amount: number;
        terms: string;
        agreedDate: Date;
    } | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'filed_at' })
    filedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
    resolvedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'varchar', length: 100, name: 'created_by' })
    createdBy: string;
}
