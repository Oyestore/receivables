import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';
import { IsEnum, IsUUID, IsString, IsObject, IsDate, IsOptional, IsNumber } from 'class-validator';

/**
 * Sync operation type
 */
export enum SyncType {
    IMPORT = 'import',
    EXPORT = 'export',
}

/**
 * Entity type being synced
 */
export enum EntityType {
    CUSTOMER = 'customer',
    INVOICE = 'invoice',
    PAYMENT = 'payment',
    REFUND = 'refund',
    GL_ENTRY = 'gl_entry',
    JOURNAL_ENTRY = 'journal_entry',
    BANK_ENTRY = 'bank_entry',
    CHART_OF_ACCOUNTS = 'chart_of_accounts',
    TRIAL_BALANCE = 'trial_balance',
    PRODUCT = 'product',
    VENDOR = 'vendor',
}

/**
 * Sync operation status
 */
export enum SyncStatus {
    SUCCESS = 'success',
    FAILED = 'failed',
    PARTIAL = 'partial',
    PENDING = 'pending',
    RETRYING = 'retrying',
}

/**
 * Accounting sync log entity
 * 
 * Records all sync operations between platform and accounting systems
 * for audit trail, debugging, and compliance purposes.
 * 
 * @example
 * ```typescript
 * const log = new AccountingSyncLog();
 * log.tenant_id = 'tenant-123';
 * log.accounting_system = 'tally';
 * log.sync_type = SyncType.IMPORT;
 * log.entity_type = EntityType.CUSTOMER;
 * log.status = SyncStatus.SUCCESS;
 * log.records_processed = 100;
 * ```
 */
@Entity('accounting_sync_logs')
@Index(['tenant_id', 'accounting_system'])
@Index(['tenant_id', 'entity_type', 'synced_at'])
@Index(['status', 'synced_at'])
@Index(['entity_id'])
@Index(['external_id'])
export class AccountingSyncLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    @IsString()
    @Index()
    tenant_id: string;

    @Column({ type: 'varchar', length: 50 })
    @IsString()
    accounting_system: string;

    @Column({
        type: 'enum',
        enum: SyncType,
    })
    @IsEnum(SyncType)
    sync_type: SyncType;

    @Column({
        type: 'enum',
        enum: EntityType,
    })
    @IsEnum(EntityType)
    entity_type: EntityType;

    /**
     * Platform entity ID (if applicable)
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsUUID()
    @IsOptional()
    entity_id?: string;

    /**
     * External accounting system ID
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsString()
    @IsOptional()
    external_id?: string;

    @Column({
        type: 'enum',
        enum: SyncStatus,
    })
    @IsEnum(SyncStatus)
    status: SyncStatus;

    /**
     * Number of records processed in this sync operation
     */
    @Column({ type: 'int', default: 1 })
    @IsNumber()
    records_processed: number;

    /**
     * Number of records that succeeded
     */
    @Column({ type: 'int', default: 0 })
    @IsNumber()
    records_succeeded: number;

    /**
     * Number of records that failed
     */
    @Column({ type: 'int', default: 0 })
    @IsNumber()
    records_failed: number;

    /**
     * Sync operation data (for debugging)
     * Limited to prevent database bloat
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    sync_data?: {
        request?: any; // Limited to essential fields
        response?: any; // Limited to essential fields
        changes?: string[]; // List of fields changed
        warnings?: string[]; // Non-critical warnings
    };

    /**
     * Error details if sync failed
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    error_details?: {
        message: string;
        code?: string;
        retry_count: number;
        stack?: string; // Optional, for debugging
        accounting_system_error?: any; // Raw error from accounting system
    };

    /**
     * Duration of sync operation in milliseconds
     */
    @Column({ type: 'int', nullable: true })
    @IsNumber()
    @IsOptional()
    duration_ms?: number;

    /**
     * Timestamp when sync occurred
     */
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @IsDate()
    synced_at: Date;

    /**
     * Batch ID if this sync is part of a batch operation
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsUUID()
    @IsOptional()
    batch_id?: string;

    /**
     * Job ID from the queue system
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsString()
    @IsOptional()
    job_id?: string;

    /**
     * User or system that initiated the sync
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsString()
    @IsOptional()
    initiated_by?: string;

    /**
     * Additional metadata (extensible)
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    /**
     * TTL - logs older than this will be archived/deleted
     * Based on data retention policy
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    expires_at?: Date;
}
