import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountingHubService } from '../../Module_11_Common/src/accounting-integration-hub';
import { Customer } from '../entities/customer.entity';

/**
 * Customer import configuration
 */
interface ImportConfig {
    enabled: boolean;
    autoImport: boolean;
    scheduleExpression: string;
    lastImportAt?: Date;
    importOnStartup: boolean;
}

/**
 * Import statistics
 */
export interface ImportStats {
    totalImported: number;
    newCustomers: number;
    updatedCustomers: number;
    skippedCustomers: number;
    errors: number;
    duration: number;
}

/**
 * Customer Import Service for Module 01
 * 
 * Handles automated importing of customers from accounting systems via the Accounting Hub
 * 
 * Features:
 * - Scheduled periodic imports (cron)
 * - Manual import trigger
 * - Duplicate detection and merging
 * - Event emission for downstream modules (M09)
 * - Import statistics tracking
 * 
 * @example
 * ```typescript
 * // Manual import
 * const stats = await customerImportService.importCustomersFromAccounting('tenant-123');
 * 
 * // Subscribe to events in M09
 * @OnEvent('customer.created')
 * handleCustomerCreated(event) { ... }
 * ```
 */
@Injectable()
export class CustomerImportService {
    private readonly logger = new Logger(CustomerImportService.name);

    private readonly config: ImportConfig = {
        enabled: process.env.CUSTOMER_IMPORT_ENABLED !== 'false',
        autoImport: process.env.CUSTOMER_AUTO_IMPORT !== 'false',
        scheduleExpression: process.env.CUSTOMER_IMPORT_SCHEDULE || '0 0 * * *', // Daily at midnight
        importOnStartup: process.env.CUSTOMER_IMPORT_ON_STARTUP === 'true',
    };

    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        private readonly accountingHub: AccountingHubService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        if (this.config.importOnStartup) {
            this.importAllTenants().catch(error => {
                this.logger.error('Startup import failed:', error.message);
            });
        }
    }

    /**
     * Scheduled customer import (runs daily by default)
     * Can be configured via CUSTOMER_IMPORT_SCHEDULE env variable
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async scheduledImport(): Promise<void> {
        if (!this.config.enabled || !this.config.autoImport) {
            this.logger.debug('Scheduled customer import is disabled');
            return;
        }

        this.logger.log('Starting scheduled customer import');

        try {
            await this.importAllTenants();
            this.logger.log('Scheduled customer import completed successfully');
        } catch (error) {
            this.logger.error('Scheduled customer import failed:', error.stack);
        }
    }

    /**
     * Import customers for a specific tenant
     * 
     * @param tenantId - Tenant ID
     * @param accountingSystem - Optional specific system to import from
     * @returns Import statistics
     */
    async importCustomersFromAccounting(
        tenantId: string,
        accountingSystem?: string
    ): Promise<ImportStats> {
        const startTime = Date.now();

        const stats: ImportStats = {
            totalImported: 0,
            newCustomers: 0,
            updatedCustomers: 0,
            skippedCustomers: 0,
            errors: 0,
            duration: 0,
        };

        try {
            this.logger.log(`Starting customer import for tenant ${tenantId}`);

            // Import from accounting hub
            const importedCustomers = await this.accountingHub.importCustomers({
                tenantId,
                accountingSystem,
            });

            stats.totalImported = importedCustomers.length;

            // Process each customer
            for (const importedCustomer of importedCustomers) {
                try {
                    const result = await this.processImportedCustomer(tenantId, importedCustomer);

                    if (result.action === 'created') {
                        stats.newCustomers++;

                        // Emit event for M09 (Marketing & Customer Success)
                        this.eventEmitter.emit('customer.created', {
                            customer: result.customer,
                            source: 'accounting_import',
                            tenantId,
                            accountingSystem: importedCustomer.external_id ? accountingSystem : undefined,
                        });
                    } else if (result.action === 'updated') {
                        stats.updatedCustomers++;

                        this.eventEmitter.emit('customer.updated', {
                            customer: result.customer,
                            source: 'accounting_import',
                            tenantId,
                        });
                    } else {
                        stats.skippedCustomers++;
                    }
                } catch (error) {
                    stats.errors++;
                    this.logger.error(
                        `Failed to process customer ${importedCustomer.name}: ${error.message}`
                    );
                }
            }

            stats.duration = Date.now() - startTime;

            this.logger.log(
                `Customer import completed for tenant ${tenantId} - ` +
                `New: ${stats.newCustomers}, Updated: ${stats.updatedCustomers}, ` +
                `Skipped: ${stats.skippedCustomers}, Errors: ${stats.errors}, ` +
                `Duration: ${stats.duration}ms`
            );

            // Emit import completion event
            this.eventEmitter.emit('customer.import.completed', {
                tenantId,
                stats,
            });

            return stats;
        } catch (error) {
            stats.duration = Date.now() - startTime;
            this.logger.error(`Customer import failed for tenant ${tenantId}:`, error.stack);

            this.eventEmitter.emit('customer.import.failed', {
                tenantId,
                error: error.message,
                stats,
            });

            throw error;
        }
    }

    /**
     * Import customers for all active tenants
     */
    async importAllTenants(): Promise<Map<string, ImportStats>> {
        const results = new Map<string, ImportStats>();

        try {
            // Get list of tenants with enabled accounting integrations
            const tenants = await this.getTenantsWithAccountingEnabled();

            this.logger.log(`Importing customers for ${tenants.length} tenants`);

            for (const tenantId of tenants) {
                try {
                    const stats = await this.importCustomersFromAccounting(tenantId);
                    results.set(tenantId, stats);
                } catch (error) {
                    this.logger.error(`Import failed for tenant ${tenantId}:`, error.message);
                    results.set(tenantId, {
                        totalImported: 0,
                        newCustomers: 0,
                        updatedCustomers: 0,
                        skippedCustomers: 0,
                        errors: 1,
                        duration: 0,
                    });
                }
            }

            return results;
        } catch (error) {
            this.logger.error('Failed to import customers for all tenants:', error.stack);
            throw error;
        }
    }

    /**
     * Manually trigger import (for admin use)
     */
    async triggerManualImport(params: {
        tenantId?: string;
        accountingSystem?: string;
    }): Promise<ImportStats | Map<string, ImportStats>> {
        if (params.tenantId) {
            return this.importCustomersFromAccounting(params.tenantId, params.accountingSystem);
        } else {
            return this.importAllTenants();
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Process a single imported customer
     */
    private async processImportedCustomer(
        tenantId: string,
        importedCustomer: any
    ): Promise<{ action: 'created' | 'updated' | 'skipped'; customer: Customer }> {
        // Check if customer already exists
        const existing = await this.findExistingCustomer(tenantId, importedCustomer);

        if (existing) {
            // Check if update is needed
            if (this.shouldUpdateCustomer(existing, importedCustomer)) {
                const updated = await this.updateExistingCustomer(existing, importedCustomer);
                return { action: 'updated', customer: updated };
            } else {
                return { action: 'skipped', customer: existing };
            }
        } else {
            const created = await this.createNewCustomer(tenantId, importedCustomer);
            return { action: 'created', customer: created };
        }
    }

    /**
     * Find existing customer by external ID or email
     */
    private async findExistingCustomer(
        tenantId: string,
        importedCustomer: any
    ): Promise<Customer | null> {
        // Try to find by external ID first
        if (importedCustomer.external_id) {
            const byExternalId = await this.customerRepo.findOne({
                where: {
                    tenant_id: tenantId,
                    external_id: importedCustomer.external_id,
                },
            });

            if (byExternalId) {
                return byExternalId;
            }
        }

        // Try to find by email
        if (importedCustomer.email) {
            const byEmail = await this.customerRepo.findOne({
                where: {
                    tenant_id: tenantId,
                    email: importedCustomer.email,
                },
            });

            if (byEmail) {
                return byEmail;
            }
        }

        // Try to find by name (exact match)
        const byName = await this.customerRepo.findOne({
            where: {
                tenant_id: tenantId,
                name: importedCustomer.name,
            },
        });

        return byName;
    }

    /**
     * Check if customer should be updated
     */
    private shouldUpdateCustomer(existing: Customer, imported: any): boolean {
        // Update if any key fields have changed
        return (
            existing.email !== imported.email ||
            existing.phone !== imported.phone ||
            existing.company_name !== imported.company_name ||
            existing.tax_id !== imported.tax_id ||
            JSON.stringify(existing.billing_address) !== JSON.stringify(imported.billing_address)
        );
    }

    /**
     * Create new customer
     */
    private async createNewCustomer(tenantId: string, imported: any): Promise<Customer> {
        const customer = this.customerRepo.create({
            tenant_id: tenantId,
            external_id: imported.external_id,
            name: imported.name,
            email: imported.email,
            phone: imported.phone,
            company_name: imported.company_name,
            billing_address: imported.billing_address,
            shipping_address: imported.shipping_address,
            tax_id: imported.tax_id,
            credit_limit: imported.credit_limit,
            payment_terms: imported.payment_terms,
            currency: imported.currency || 'INR',
            metadata: {
                imported_from_accounting: true,
                import_date: new Date(),
                ...imported.metadata,
            },
        });

        return this.customerRepo.save(customer);
    }

    /**
     * Update existing customer
     */
    private async updateExistingCustomer(
        existing: Customer,
        imported: any
    ): Promise<Customer> {
        existing.external_id = imported.external_id || existing.external_id;
        existing.email = imported.email || existing.email;
        existing.phone = imported.phone || existing.phone;
        existing.company_name = imported.company_name || existing.company_name;
        existing.billing_address = imported.billing_address || existing.billing_address;
        existing.shipping_address = imported.shipping_address || existing.shipping_address;
        existing.tax_id = imported.tax_id || existing.tax_id;
        existing.credit_limit = imported.credit_limit ?? existing.credit_limit;
        existing.payment_terms = imported.payment_terms || existing.payment_terms;

        existing.metadata = {
            ...existing.metadata,
            last_import_update: new Date(),
            ...imported.metadata,
        };

        return this.customerRepo.save(existing);
    }

    /**
     * Get list of tenants with enabled accounting integrations
     */
    private async getTenantsWithAccountingEnabled(): Promise<string[]> {
        // This would query the accounting configs from Module 11
        // For now, returning empty array as placeholder
        // In production, this would be:
        // return this.accountingHub.getTenantsWithEnabledSystems();
        return [];
    }
}
