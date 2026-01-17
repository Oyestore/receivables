import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DisputeCase } from './dispute-case.entity';

export enum WorkflowStateType {
    INITIAL = 'initial',
    IN_PROGRESS = 'in_progress',
    WAITING = 'waiting',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum TransitionType {
    AUTOMATIC = 'automatic',
    MANUAL = 'manual',
    CONDITIONAL = 'conditional',
    SCHEDULED = 'scheduled'
}

@Entity('workflow_states')
@Index(['disputeId'])
@Index(['stateType'])
@Index(['tenantId'])
export class WorkflowState {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', name: 'dispute_id' })
    disputeId!: string;

    @ManyToOne(() => DisputeCase, { eager: false })
    @JoinColumn({ name: 'dispute_id' })
    dispute!: DisputeCase;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({
        type: 'enum',
        enum: WorkflowStateType,
        default: WorkflowStateType.IN_PROGRESS
    })
    stateType!: WorkflowStateType;

    @Column({ type: 'jsonb', nullable: true })
    config!: {
        timeout?: number; // milliseconds
        retryCount?: number;
        notifyOnEntry?: boolean;
        notifyOnExit?: boolean;
        requiredApprovals?: number;
        escalationType?: string;
    } | null;

    @Column({ type: 'timestamp', nullable: true, name: 'entered_at' })
    enteredAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'exited_at' })
    exitedAt!: Date | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'entered_by' })
    enteredBy!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'exited_by' })
    exitedBy!: string | null;

    @Column({ type: 'boolean', default: false, name: 'is_current' })
    isCurrent!: boolean;

    @Column({ type: 'int', default: 0 })
    sequence!: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, any> | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}

@Entity('workflow_transitions')
@Index(['fromStateId'])
@Index(['toStateId'])
@Index(['tenantId'])
export class WorkflowTransition {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({ type: 'uuid', name: 'from_state_id' })
    fromStateId!: string;

    @Column({ type: 'uuid', name: 'to_state_id' })
    toStateId!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({
        type: 'enum',
        enum: TransitionType,
        default: TransitionType.MANUAL
    })
    type!: TransitionType;

    @Column({ type: 'jsonb', nullable: true })
    conditions!: {
        field?: string;
        operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
        value?: any;
        expression?: string; // JavaScript expression
    }[] | null;

    @Column({ type: 'jsonb', nullable: true })
    actions!: {
        type: 'notification' | 'email' | 'sms' | 'webhook' | 'function';
        config: Record<string, any>;
    }[] | null;

    @Column({ type: 'int', default: 0 })
    priority!: number;

    @Column({ type: 'boolean', default: true, name: 'is_enabled' })
    isEnabled!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
