/**
 * Accounting Integration Hub - Public API
 * 
 * Main entry point for all accounting integrations
 */

// Main service
export { AccountingHubService } from './accounting-hub.service';

// Module
export { AccountingIntegrationHubModule } from './accounting-integration-hub.module';

// Entities
export { AccountingConfig, AccountingSystem, SyncDirection, SyncFrequency } from './entities/accounting-config.entity';
export { AccountingSyncLog, SyncType, EntityType, SyncStatus } from './entities/accounting-sync-log.entity';
export { AccountingSyncError, ErrorSeverity, ErrorCategory, ErrorResolutionStatus } from './entities/accounting-sync-error.entity';

// Shared services (for advanced usage)
export { CredentialManagerService, EncryptedCredential } from './shared/credential-manager.service';
export { AuditLoggerService, AuditEvent } from './shared/audit-logger.service';
export { SyncQueueService, SyncJobData, SyncJobResult } from './shared/sync-queue.service';

// Base connector (for implementing new connectors)
export {
    BaseAccountingConnector,
    Customer,
    Invoice,
    Payment,
    Refund,
    ChartOfAccount,
    JournalEntry,
    ImportParams,
    SyncResult,
} from './connectors/base/base-accounting-connector';
