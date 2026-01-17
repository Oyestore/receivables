import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountingConfig, AccountingSystem } from './entities/accounting-config.entity';
import { CredentialManagerService } from './shared/credential-manager.service';
import { ConnectionPoolService } from './shared/connection-pool.service';
import { RetryService } from './shared/retry.service';
import { ErrorHandlerService, ErrorContext } from './shared/error-handler.service';
import { AuditLoggerService } from './shared/audit-logger.service';
import { SyncQueueService } from './shared/sync-queue.service';
import {
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

/**
 * Connector registry interface
 */
interface ConnectorRegistry {
    [key: string]: BaseAccountingConnector;
}

/**
 * Accounting Integration Hub Service
 * 
 * Main orchestrator for all accounting system integrations
 * Coordinates between connectors, queue, error handling, and audit logging
 * 
 * Used by:
 * - Module 01 (Invoicing): import/export customers and invoices
 * - Module 03 (Payments): export payment receipts and refunds
 * - Module 17 (GL/Reconciliation): import chart of accounts, sync journal entries
 * - Module 09 (Marketing): receives customer events
 * 
 * @example
 * ```typescript
 * // Import customers from Tally
 * const customers = await accountingHub.importCustomers({
 *   tenantId: 'tenant-123',
 *   accountingSystem: 'tally',
 * });
 * 
 * // Sync invoice to accounting system
 * await accountingHub.syncInvoiceCreated(invoice);
 * ```
 */
@Injectable()
export class AccountingHubService implements OnModuleInit {
    private readonly logger = new Logger(AccountingHubService.name);
    private readonly connectors: ConnectorRegistry = {};

    constructor(
        @InjectRepository(AccountingConfig)
        private readonly configRepo: Repository<AccountingConfig>,
        private readonly credentialManager: CredentialManagerService,
        private readonly connectionPool: ConnectionPoolService,
        private readonly retryService: RetryService,
        private readonly errorHandler: ErrorHandlerService,
        private readonly auditLogger: AuditLoggerService,
        private readonly syncQueue: SyncQueueService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async onModuleInit() {
        // Register connectors
        await this.registerConnectors();
        this.logger.log('Accounting Integration Hub initialized');
    }

    // ==========================================
    // CUSTOMER OPERATIONS (Module 01)
    // ==========================================

    /**
     * Import customers from accounting system
     * 
     * @param params - Import parameters
     * @returns Array of customers
     */
    async importCustomers(params: {
        tenantId: string;
        accountingSystem?: string;
        filters?: any;
    }): Promise<Customer[]> {
        const startTime = Date.now();
        const { tenantId, accountingSystem, filters } = params;

        try {
            // Get enabled configs
            const configs = await this.getEnabledConfigs(tenantId, accountingSystem);

            if (configs.length === 0) {
                this.logger.warn(`No enabled accounting configs found for tenant ${tenantId}`);
                return [];
            }

            const allCustomers: Customer[] = [];

            // Import from each enabled system
            for (const config of configs) {
                try {
                    await this.auditLogger.logSyncStart({
                        tenantId,
                        accountingSystem: config.system,
                        entityType: 'customer',
                        syncType: 'import',
                    });

                    const connector = await this.getConnector(config);
                    const customers = await this.retryService.executeWithRetryOrThrow(
                        () => connector.importCustomers({ tenantId, filters }),
                        {
                            maxAttempts: 3,
                            onRetry: (attempt, error, delay) => {
                                this.logger.warn(
                                    `Customer import retry ${attempt} for ${config.system} - ` +
                                    `retrying in ${delay}ms: ${error.message}`
                                );
                            },
                        }
                    );

                    allCustomers.push(...customers);

                    await this.auditLogger.logSyncComplete({
                        tenantId,
                        accountingSystem: config.system,
                        entityType: 'customer',
                        syncType: 'import',
                        recordsProcessed: customers.length,
                        recordsSucceeded: customers.length,
                        recordsFailed: 0,
                        durationMs: Date.now() - startTime,
                    });

                    // Update last sync timestamp
                    await this.updateLastSync(config.id);

                } catch (error) {
                    await this.handleSyncError(error, {
                        tenantId,
                        accountingSystem: config.system,
                        operation: 'import_customers',
                        entityType: 'customer',
                    });
                }
            }

            this.logger.log(`Imported ${allCustomers.length} customers for tenant ${tenantId}`);
            return allCustomers;

        } catch (error) {
            this.logger.error(`Failed to import customers: ${error.message}`, error.stack);
            throw error;
        }
    }

    // ==========================================
    // INVOICE OPERATIONS (Module 01)
    // ==========================================

    /**
     * Sync newly created invoice to accounting systems
     * 
     * @param invoice - Invoice data
     * @returns Sync results
     */
    async syncInvoiceCreated(invoice: Invoice & { tenantId: string }): Promise<SyncResult[]> {
        const { tenantId } = invoice;
        const configs = await this.getEnabledConfigs(tenantId);
        const results: SyncResult[] = [];

        for (const config of configs) {
            try {
                // Check if this system should export invoices
                if (!config.sync_config.entities_to_sync.invoices) {
                    continue;
                }

                if (config.sync_config.sync_direction === 'pull') {
                    continue; // Only import, don't export
                }

                const connector = await this.getConnector(config);
                const result = await this.retryService.executeWithRetryOrThrow(
                    () => connector.syncInvoice(invoice)
                );

                results.push(result);

                await this.auditLogger.logEvent({
                    tenantId,
                    accountingSystem: config.system,
                    eventType: 'sync',
                    action: 'invoice_synced',
                    entityType: 'invoice',
                    entityId: invoice.id,
                    details: {
                        external_id: result.externalId,
                        invoice_number: invoice.invoice_number,
                    },
                });

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'export_invoice',
                    entityType: 'invoice',
                    entityId: invoice.id,
                });

                results.push({
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }

    /**
     * Import invoices from accounting systems
     */
    async importInvoices(params: {
        tenantId: string;
        accountingSystem?: string;
        filters?: any;
    }): Promise<Invoice[]> {
        const { tenantId, accountingSystem, filters } = params;
        const configs = await this.getEnabledConfigs(tenantId, accountingSystem);
        const allInvoices: Invoice[] = [];

        for (const config of configs) {
            try {
                if (!config.sync_config.entities_to_sync.invoices) {
                    continue;
                }

                const connector = await this.getConnector(config);
                const invoices = await this.retryService.executeWithRetryOrThrow(
                    () => connector.importInvoices({ tenantId, filters })
                );

                allInvoices.push(...invoices);

                await this.auditLogger.logSyncComplete({
                    tenantId,
                    accountingSystem: config.system,
                    entityType: 'invoice',
                    syncType: 'import',
                    recordsProcessed: invoices.length,
                    recordsSucceeded: invoices.length,
                    recordsFailed: 0,
                    durationMs: 0,
                });

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'import_invoices',
                    entityType: 'invoice',
                });
            }
        }

        return allInvoices;
    }

    // ==========================================
    // PAYMENT OPERATIONS (Module 03)
    // ==========================================

    /**
     * Sync payment received to accounting systems
     * 
     * @param payment - Payment data with tenant context
     */
    async syncPaymentReceived(payment: {
        tenantId: string;
        invoice: { id: string; external_id?: string };
        amount: number;
        method: string;
        transactionId: string;
        timestamp: Date;
    }): Promise<SyncResult[]> {
        const { tenantId } = payment;
        const configs = await this.getEnabledConfigs(tenantId);
        const results: SyncResult[] = [];

        for (const config of configs) {
            try {
                if (!config.sync_config.entities_to_sync.payments) {
                    continue;
                }

                const connector = await this.getConnector(config);
                const result = await this.retryService.executeWithRetryOrThrow(
                    () => connector.syncPayment({
                        invoice_id: payment.invoice.id,
                        invoice_external_id: payment.invoice.external_id,
                        amount: payment.amount,
                        payment_date: payment.timestamp,
                        payment_method: payment.method,
                        reference_number: payment.transactionId,
                    })
                );

                results.push(result);

                await this.auditLogger.logEvent({
                    tenantId,
                    accountingSystem: config.system,
                    eventType: 'sync',
                    action: 'payment_synced',
                    entityType: 'payment',
                    details: {
                        external_id: result.externalId,
                        amount: payment.amount,
                        transaction_id: payment.transactionId,
                    },
                });

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'export_payment',
                    entityType: 'payment',
                });

                results.push({
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }

    /**
     * Sync refund to accounting systems
     */
    async syncRefund(refund: Refund & { tenantId: string }): Promise<SyncResult[]> {
        const { tenantId } = refund;
        const configs = await this.getEnabledConfigs(tenantId);
        const results: SyncResult[] = [];

        for (const config of configs) {
            try {
                if (!config.sync_config.entities_to_sync.payments) {
                    continue;
                }

                const connector = await this.getConnector(config);
                const result = await this.retryService.executeWithRetryOrThrow(
                    () => connector.syncRefund(refund)
                );

                results.push(result);

                await this.auditLogger.logEvent({
                    tenantId,
                    accountingSystem: config.system,
                    eventType: 'sync',
                    action: 'refund_synced',
                    entityType: 'refund',
                    details: {
                        external_id: result.externalId,
                        amount: refund.amount,
                    },
                });

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'export_refund',
                    entityType: 'refund',
                });

                results.push({
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }

    // ==========================================
    // GL & RECONCILIATION (Module 17)
    // ==========================================

    /**
     * Import chart of accounts
     */
    async importChartOfAccounts(params: {
        tenantId: string;
        accountingSystem?: string;
    }): Promise<ChartOfAccount[]> {
        const { tenantId, accountingSystem } = params;
        const configs = await this.getEnabledConfigs(tenantId, accountingSystem);
        const allAccounts: ChartOfAccount[] = [];

        for (const config of configs) {
            try {
                if (!config.sync_config.entities_to_sync.gl_accounts) {
                    continue;
                }

                const connector = await this.getConnector(config);
                const accounts = await this.retryService.executeWithRetryOrThrow(
                    () => connector.importChartOfAccounts()
                );

                allAccounts.push(...accounts);

                await this.auditLogger.logSyncComplete({
                    tenantId,
                    accountingSystem: config.system,
                    entityType: 'chart_of_accounts',
                    syncType: 'import',
                    recordsProcessed: accounts.length,
                    recordsSucceeded: accounts.length,
                    recordsFailed: 0,
                    durationMs: 0,
                });

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'import_chart_of_accounts',
                    entityType: 'chart_of_accounts',
                });
            }
        }

        return allAccounts;
    }

    /**
     * Sync journal entry to accounting system
     */
    async syncJournalEntry(entry: JournalEntry & { tenantId: string }): Promise<SyncResult[]> {
        const { tenantId } = entry;
        const configs = await this.getEnabledConfigs(tenantId);
        const results: SyncResult[] = [];

        for (const config of configs) {
            try {
                if (!config.sync_config.entities_to_sync.journal_entries) {
                    continue;
                }

                const connector = await this.getConnector(config);
                const result = await this.retryService.executeWithRetryOrThrow(
                    () => connector.syncJournalEntry(entry)
                );

                results.push(result);

            } catch (error) {
                await this.handleSyncError(error, {
                    tenantId,
                    accountingSystem: config.system,
                    operation: 'export_journal_entry',
                    entityType: 'journal_entry',
                    entityId: entry.id,
                });

                results.push({
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Get enabled accounting systems for a tenant
     */
    async getEnabledSystems(tenantId: string): Promise<string[]> {
        const configs = await this.getEnabledConfigs(tenantId);
        return configs.map(c => c.system);
    }

    /**
     * Test connection to accounting system
     */
    async testConnection(configId: string): Promise<{
        success: boolean;
        latency_ms?: number;
        error?: string;
        version?: string;
    }> {
        try {
            const config = await this.configRepo.findOne({ where: { id: configId } });

            if (!config) {
                throw new Error(`Config ${configId} not found`);
            }

            const connector = await this.getConnector(config);
            const result = await connector.testConnection();

            // Update config with test result
            await this.configRepo.update(configId, {
                last_connection_test: {
                    tested_at: new Date(),
                    success: result.success,
                    latency_ms: result.latency_ms,
                    error: result.error,
                    version: result.version,
                },
            });

            return result;

        } catch (error) {
            this.logger.error(`Connection test failed for config ${configId}: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Register all accounting connectors
     */
    private async registerConnectors(): Promise<void> {
        // Connectors would be injected or imported
        // For now, this is a placeholder
        this.logger.log('Connector registration ready');
    }

    /**
     * Get enabled configs for tenant
     */
    private async getEnabledConfigs(
        tenantId: string,
        system?: string
    ): Promise<AccountingConfig[]> {
        const where: any = {
            tenant_id: tenantId,
            is_enabled: true,
            deleted_at: null,
        };

        if (system) {
            where.system = system;
        }

        return this.configRepo.find({ where });
    }

    /**
     * Get connector for config
     */
    private async getConnector(config: AccountingConfig): Promise<BaseAccountingConnector> {
        // Get or create connector from registry
        const key = `${config.tenant_id}:${config.system}`;

        if (this.connectors[key]) {
            return this.connectors[key];
        }

        // Create new connector (system-specific)
        // This would be implemented based on the system type
        throw new Error(`Connector not implemented for ${config.system}`);
    }

    /**
     * Handle sync error
     */
    private async handleSyncError(error: Error, context: ErrorContext): Promise<void> {
        const result = await this.errorHandler.handleError(error, context);

        if (result.shouldNotifyAdmin) {
            // Emit event for admin notification
            this.eventEmitter.emit('accounting.sync.error', {
                errorId: result.errorId,
                tenantId: context.tenantId,
                system: context.accountingSystem,
                severity: result.severity,
                category: result.category,
            });
        }
    }

    /**
     * Update last sync timestamp
     */
    private async updateLastSync(configId: string): Promise<void> {
        await this.configRepo.update(configId, {
            last_sync_at: new Date(),
            consecutive_failures: 0,
        });
    }
}
