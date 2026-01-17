import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { IsEnum, IsBoolean, IsObject, ValidateNested, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported accounting systems
 */
export enum AccountingSystem {
    TALLY = 'tally',
    ZOHO = 'zoho',
    QUICKBOOKS = 'quickbooks',
    BUSY = 'busy',
    MARG = 'marg',
}

/**
 * Sync direction configuration
 */
export enum SyncDirection {
    PULL = 'pull',       // Import from accounting to platform
    PUSH = 'push',       // Export from platform to accounting
    BIDIRECTIONAL = 'bidirectional', // Both ways
}

/**
 * Sync frequency options
 */
export enum SyncFrequency {
    REAL_TIME = 'real_time',
    HOURLY = 'hourly',
    DAILY = 'daily',
    MANUAL = 'manual',
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
    PLATFORM_WINS = 'platform_wins',
    ACCOUNTING_WINS = 'accounting_wins',
    MANUAL = 'manual',
    NEWEST_WINS = 'newest_wins',
}

/**
 * Configuration status
 */
export enum ConfigStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    ERROR = 'error',
    INACTIVE = 'inactive',
}

/**
 * Connection configuration for Tally
 */
export interface TallyConnectionConfig {
    server_url: string;
    company_name: string;
    port?: number;
    use_odbc?: boolean;
    odbc_dsn?: string;
    username?: string;
    password?: string; // Encrypted
}

/**
 * Connection configuration for Zoho/QuickBooks (OAuth)
 */
export interface OAuthConnectionConfig {
    client_id: string;
    client_secret: string; // Encrypted
    redirect_uri: string;
    refresh_token?: string; // Encrypted
    access_token?: string; // Encrypted - short-lived
    token_expires_at?: Date;
    organization_id?: string;
    realm_id?: string; // QuickBooks specific
}

/**
 * Connection configuration for Busy/Marg (API)
 */
export interface ApiConnectionConfig {
    api_url: string;
    api_key: string; // Encrypted
    api_secret?: string; // Encrypted
    database_path?: string;
    company_code?: string;
}

/**
 * Union type for all connection configs
 */
export type ConnectionConfig = TallyConnectionConfig | OAuthConnectionConfig | ApiConnectionConfig;

/**
 * Entities to sync configuration
 */
export interface EntitiesToSync {
    customers: boolean;
    invoices: boolean;
    payments: boolean;
    gl_accounts: boolean;
    journal_entries: boolean;
    bank_entries: boolean;
    products?: boolean;
    vendors?: boolean;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
    sync_direction: SyncDirection;
    sync_frequency: SyncFrequency;
    auto_sync_enabled: boolean;
    entities_to_sync: EntitiesToSync;
    conflict_resolution: ConflictResolution;
    batch_size?: number;
    sync_window_start?: string; // HH:mm format
    sync_window_end?: string;
}

/**
 * Field mappings for custom field matching
 */
export interface FieldMappings {
    customer_mappings?: Record<string, string>;
    invoice_mappings?: Record<string, string>;
    payment_mappings?: Record<string, string>;
    gl_mappings?: Record<string, string>;
}

/**
 * Accounting system configuration entity
 * 
 * Stores connection details and sync configuration for each accounting system
 * integrated with a tenant. Credentials are encrypted at rest.
 * 
 * @example
 * ```typescript
 * const config = new AccountingConfig();
 * config.tenant_id = 'tenant-123';
 * config.system = AccountingSystem.TALLY;
 * config.is_enabled = true;
 * config.connection_config = {
 *   server_url: 'http://localhost:9000',
 *   company_name: 'My Company'
 * };
 * ```
 */
@Entity('accounting_configs')
@Index(['tenant_id', 'system'], { unique: true })
@Index(['tenant_id', 'is_enabled'])
@Index(['status'])
export class AccountingConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    tenant_id: string;

    @Column({
        type: 'enum',
        enum: AccountingSystem,
    })
    @IsEnum(AccountingSystem)
    system: AccountingSystem;

    @Column({ type: 'boolean', default: true })
    @IsBoolean()
    is_enabled: boolean;

    /**
     * Connection configuration (stored encrypted)
     * Structure depends on the accounting system type
     */
    @Column({ type: 'jsonb' })
    @IsObject()
    connection_config: ConnectionConfig;

    /**
     * Sync behavior configuration
     */
    @Column({ type: 'jsonb' })
    @IsObject()
    @ValidateNested()
    @Type(() => Object)
    sync_config: SyncConfig;

    /**
     * Custom field mappings (optional)
     * Maps platform fields to accounting system fields
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    field_mappings?: FieldMappings;

    /**
     * Last successful sync timestamp
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    last_sync_at?: Date;

    /**
     * Last sync error message (if any)
     */
    @Column({ type: 'text', nullable: true })
    @IsOptional()
    last_sync_error?: string;

    /**
     * Configuration status
     */
    @Column({
        type: 'enum',
        enum: ConfigStatus,
        default: ConfigStatus.ACTIVE,
    })
    @IsEnum(ConfigStatus)
    status: ConfigStatus;

    /**
     * Number of consecutive sync failures
     * Auto-disabled after configurable threshold
     */
    @Column({ type: 'int', default: 0 })
    consecutive_failures: number;

    /**
     * Connection test results (JSON)
     * Stores last connection test details
     */
    @Column({ type: 'jsonb', nullable: true })
    @IsObject()
    @IsOptional()
    last_connection_test?: {
        tested_at: Date;
        success: boolean;
        latency_ms?: number;
        error?: string;
        version?: string; // Accounting software version
    };

    /**
     * Additional metadata (extensible)
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
     * Soft delete timestamp
     */
    @Column({ type: 'timestamp', nullable: true })
    @IsDate()
    @IsOptional()
    deleted_at?: Date;

    /**
     * User who created this configuration
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsOptional()
    created_by?: string;

    /**
     * User who last modified this configuration
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @IsOptional()
    updated_by?: string;
}
