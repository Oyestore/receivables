import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { IsEnum, IsString, IsObject, IsDate, IsOptional, IsNumber, IsBoolean } from 'class-validator';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    LOW = 'low',           // Informational, auto-retry likely to succeed
    MEDIUM = 'medium',     // Requires attention, may auto-resolve
    HIGH = 'high',         // Requires manual intervention
    CRITICAL = 'critical', // System-level issue, immediate action needed
}

/**
 * Error category for classification
 */
export enum ErrorCategory {
    CONNECTION = 'connection',             // Network/connection errors
    AUTHENTICATION = 'authentication',     // Auth/credential errors
    AUTHORIZATION = 'authorization',       // Permission errors
    VALIDATION = 'validation',             // Data validation errors
    MAPPING = 'mapping',                   // Field mapping errors
    CONFLICT = 'conflict',                 // Data conflict errors
    TIMEOUT = 'timeout',                   // Operation timeout
    RATE_LIMIT = 'rate_limit',            // API rate limiting
    SYSTEM = 'system',                     // System/server errors
    DATA_INTEGRITY = 'data_integrity',     // Data consistency errors
    UNKNOWN = 'unknown',                   // Unclassified errors
}

/**
 * Error resolution status
 */
export enum ErrorResolutionStatus {
    UNRESOLVED = 'unresolved',
    AUTO_RESOLVED = 'auto_resolved',
    MANUALLY_RESOLVED = 'manually_resolved',
    IGNORED = 'ignored',
    ESCALATED = 'escalated',
}

/**
 * Accounting sync error entity
 * 
 * Stores detailed error information for failed sync operations
 * Enables error tracking, analysis, and resolution
 * 
 * @example
 * ```typescript
 * const error = new AccountingSyncError();
 * error.tenant_id = 'tenant-123';
 * error.accounting_system = 'tally';
 * error.severity = ErrorSeverity.HIGH;
 * error.category = ErrorCategory.AUTHENTICATION;
 * error.error_message = 'Invalid credentials';
 * ```
 */
@Entity('accounting_sync_errors')
@Index(['tenant_id', 'accounting_system'])
@Index(['severity', 'resolution_status'])
@Index(['category', 'created_at'])
@Index(['sync_log_id'])
@Index(['is_retryable', 'retry_count'])
export class AccountingSyncError {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    @IsString()
    @Index()
    tenant_id: string;

    @Column({ type: 'varchar', length: 50 })
    @IsString()
    accounting_system: string;

    /**
     * Reference to the sync log that failed
     */
    @Column({ type: 'uuid', nullable: true })
    @IsString()
    @IsOptional()
    sync_log_id?: string;

    @Column({
        type: 'enum',
        enum: ErrorSeverity,
    })
    @IsEnum(ErrorSeverity)
    severity: ErrorSeverity;

    @Column({
        type: 'enum',
        enum: ErrorCategory,
    })
    @IsEnum(ErrorCategory)
    category: ErrorCategory;

    /**
     * Human-readable error message
     */
    @Column({ type: 'text' })
    @IsString()
    error_message: string;

    /**
     * Error code (if available from accounting system)
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    @IsString()
    @IsOptional()
    error_code?: string;

    /**
     * Stack trace for debugging (truncated if too long)
     */
    @Column({ type: 'text', nullable: true })
    @IsString()
    @IsOptional()
    stack_trace?: string;

    /**
     * Detailed error context
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    error_context?: {
        entity_type?: string;
        entity_id?: string;
        operation?: string;
        endpoint?: string;
        http_status?: number;
        request_id?: string;
        raw_error?: any; // Original error from accounting system
        affected_fields?: string[];
    };

    /**
     * Whether this error is automatically retryable
     */
    @Column({ type: 'boolean', default: false })
    @IsBoolean()
    is_retryable: boolean;

    /**
     * Number of retry attempts made
     */
    @Column({ type: 'int', default: 0 })
    @IsNumber()
    retry_count: number;

    /**
     * Maximum retries allowed
     */
    @Column({ type: 'int', default: 3 })
    @IsNumber()
    max_retries: number;

    /**
     * Next retry scheduled time
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    next_retry_at?: Date;

    /**
     * Last retry attempt time
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    last_retry_at?: Date;

    /**
     * Resolution status
     */
    @Column({
        type: 'enum',
        enum: ErrorResolutionStatus,
        default: ErrorResolutionStatus.UNRESOLVED,
    })
    @IsEnum(ErrorResolutionStatus)
    resolution_status: ErrorResolutionStatus;

    /**
     * Resolution notes (how it was resolved)
     */
    @Column({ type: 'text', nullable: true })
    @IsString()
    @IsOptional()
    resolution_notes?: string;

    /**
     * User who resolved the error
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsString()
    @IsOptional()
    resolved_by?: string;

    /**
     * When the error was resolved
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    resolved_at?: Date;

    /**
     * Whether admin has been notified
     */
    @Column({ type: 'boolean', default: false })
    @IsBoolean()
    admin_notified: boolean;

    /**
     * Notification sent timestamp
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    notified_at?: Date;

    /**
     * Suggested fix/action
     */
    @Column({ type: 'text', nullable: true })
    @IsString()
    @IsOptional()
    suggested_fix?: string;

    /**
     * Additional metadata
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    /**
     * TTL - errors older than this will be archived
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    expires_at?: Date;
}
