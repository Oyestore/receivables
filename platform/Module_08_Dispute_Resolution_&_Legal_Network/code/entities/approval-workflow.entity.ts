import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DisputeCase } from './dispute-case.entity';

export enum ApprovalStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    DELEGATED = 'delegated',
    EXPIRED = 'expired'
}

export enum ApprovalLevel {
    L1_MANAGER = 'l1_manager',
    L2_DIRECTOR = 'l2_director',
    L3_LEGAL = 'l3_legal',
    L4_CFO = 'l4_cfo',
    L5_CEO = 'l5_ceo'
}

export enum ApprovalDecision {
    APPROVE = 'approve',
    REJECT = 'reject',
    REQUEST_INFO = 'request_info',
    DELEGATE = 'delegate'
}

@Entity('approval_workflows')
@Index(['disputeId'])
@Index(['status'])
@Index(['tenantId'])
@Index(['createdAt'])
export class ApprovalWorkflow {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', name: 'dispute_id' })
    disputeId!: string;

    @ManyToOne(() => DisputeCase, { eager: false })
    @JoinColumn({ name: 'dispute_id' })
    dispute!: DisputeCase;

    @Column({
        type: 'enum',
        enum: ApprovalLevel
    })
    level!: ApprovalLevel;

    @Column({
        type: 'enum',
        enum: ApprovalStatus,
        default: ApprovalStatus.PENDING
    })
    status!: ApprovalStatus;

    @Column({ type: 'uuid', name: 'approver_id' })
    approverId!: string;

    @Column({ type: 'varchar', length: 200, name: 'approver_name' })
    approverName!: string;

    @Column({ type: 'varchar', length: 100, name: 'approver_email' })
    approverEmail!: string;

    @Column({ type: 'uuid', nullable: true, name: 'delegated_to_id' })
    delegatedToId!: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true, name: 'delegated_to_name' })
    delegatedToName!: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'requested_at' })
    requestedAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
    respondedAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
    expiresAt!: Date | null;

    @Column({ type: 'text', nullable: true })
    comments!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: {
        riskScore?: number;
        autoApproveEligible?: boolean;
        previousApprovals?: string[];
        attachedDocuments?: string[];
    } | null;

    @Column({ type: 'int', default: 0 })
    sequence!: number;

    @Column({ type: 'boolean', default: false, name: 'is_parallel' })
    isParallel!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}

@Entity('approval_history')
@Index(['workflowId'])
@Index(['tenantId'])
@Index(['performedAt'])
export class ApprovalHistory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', name: 'workflow_id' })
    workflowId!: string;

    @ManyToOne(() => ApprovalWorkflow, { eager: false })
    @JoinColumn({ name: 'workflow_id' })
    workflow!: ApprovalWorkflow;

    @Column({ type: 'uuid', name: 'performed_by_id' })
    performedById!: string;

    @Column({ type: 'varchar', length: 200, name: 'performed_by_name' })
    performedByName!: string;

    @Column({
        type: 'enum',
        enum: ApprovalDecision
    })
    decision!: ApprovalDecision;

    @Column({ type: 'text', nullable: true })
    comments!: string | null;

    @Column({ type: 'timestamp', name: 'performed_at' })
    performedAt!: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: {
        ipAddress?: string;
        userAgent?: string;
        location?: string;
    } | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
