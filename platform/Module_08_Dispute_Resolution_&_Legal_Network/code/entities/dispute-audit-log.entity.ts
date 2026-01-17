import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    STATUS_CHANGE = 'status_change',
    ASSIGN = 'assign',
    UNASSIGN = 'unassign',
    APPROVE = 'approve',
    REJECT = 'reject',
    COMMENT = 'comment',
    DOCUMENT_UPLOAD = 'document_upload',
    DOCUMENT_DELETE = 'document_delete',
    WORKFLOW_TRANSITION = 'workflow_transition',
    RESOLUTION_ADDED = 'resolution_added'
}

export enum AuditEntityType {
    DISPUTE_CASE = 'dispute_case',
    COLLECTION_CASE = 'collection_case',
    WORKFLOW = 'workflow',
    APPROVAL = 'approval',
    DOCUMENT = 'document',
    LEGAL_PROVIDER = 'legal_provider'
}

@Entity('dispute_audit_logs')
@Index(['tenantId', 'entityId'])
@Index(['tenantId', 'action'])
@Index(['performedAt'])
@Index(['performedById'])
export class DisputeAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'tenant_id' })
    tenantId!: string;

    @Column({
        type: 'enum',
        enum: AuditEntityType
    })
    entityType!: AuditEntityType;

    @Column({ type: 'uuid', name: 'entity_id' })
    entityId!: string;

    @Column({
        type: 'enum',
        enum: AuditAction
    })
    action!: AuditAction;

    @Column({ type: 'uuid', nullable: true, name: 'performed_by_id' })
    performedById!: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true, name: 'performed_by_name' })
    performedByName!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'performed_by_role' })
    performedByRole!: string | null;

    @Column({ type: 'timestamp', name: 'performed_at' })
    performedAt!: Date;

    @Column({ type: 'jsonb', nullable: true, name: 'changes' })
    changes!: {
        field: string;
        oldValue: any;
        newValue: any;
    }[] | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: {
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
        sessionId?: string;
        reason?: string;
    } | null;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'from_status' })
    fromStatus!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'to_status' })
    toStatus!: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    // Immutable - no UpdateDateColumn
    // Audit logs should never be modified

    // Retention policy metadata
    @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
    expiresAt!: Date | null; // For GDPR/data retention policies

    @Column({ type: 'boolean', default: false, name: 'is_archived' })
    isArchived!: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_sensitive' })
    isSensitive!: boolean; // For PII/sensitive data flagging
}
