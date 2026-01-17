import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { AccountingConfig } from './entities/accounting-config.entity';
import { AccountingSyncLog } from './entities/accounting-sync-log.entity';
import { AccountingSyncError } from './entities/accounting-sync-error.entity';

// Services
import { AccountingHubService } from './accounting-hub.service';
import { CredentialManagerService } from './shared/credential-manager.service';
import { ConnectionPoolService } from './shared/connection-pool.service';
import { RetryService } from './shared/retry.service';
import { ErrorHandlerService } from './shared/error-handler.service';
import { AuditLoggerService } from './shared/audit-logger.service';
import { SyncQueueService } from './shared/sync-queue.service';

/**
 * Accounting Integration Hub Module
 * 
 * Provides centralized accounting system integration for the platform
 * 
 * Used by:
 * - Module 01: Customer and invoice import/export
 * - Module 03: Payment and refund export
 * - Module 17: GL and reconciliation
 * - Module 09: Customer events
 * 
 * Features:
 * - 5 accounting system connectors (Tally, Zoho, QuickBooks, Busy, Marg)
 * - Bidirectional sync
 * - Async queue processing
 * - Comprehensive error handling
 * - Audit logging for compliance
 * - Credential encryption
 * - Connection pooling
 * - Retry logic with exponential backoff
 */
@Module({
    imports: [
        // TypeORM entities
        TypeOrmModule.forFeature([
            AccountingConfig,
            AccountingSyncLog,
            AccountingSyncError,
        ]),

        // Bull queue for async processing
        BullModule.registerQueueAsync({
            name: 'accounting-sync',
            useFactory: () => ({
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                    password: process.env.REDIS_PASSWORD,
                },
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: false,
                },
            }),
        }),

        // Event emitter for cross-module communication
        EventEmitterModule.forRoot(),
    ],

    providers: [
        // Core services
        AccountingHubService,
        CredentialManagerService,
        ConnectionPoolService,
        RetryService,
        ErrorHandlerService,
        AuditLoggerService,
        SyncQueueService,

        // Connectors will be added as they're implemented
        // TallyConnectorService,
        // ZohoConnectorService,
        // QuickBooksConnectorService,
        // BusyConnectorService,
        // MargConnectorService,
    ],

    exports: [
        // Export main hub service for other modules to use
        AccountingHubService,

        // Export utility services that might be needed
        CredentialManagerService,
        AuditLoggerService,
        SyncQueueService,
    ],
})
export class AccountingIntegrationHubModule { }
