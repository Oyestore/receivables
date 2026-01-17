import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkOperation } from '../entities/bulk-operation.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceService } from './invoice.service';

@Injectable()
export class BulkOperationsService {
    private readonly logger = new Logger(BulkOperationsService.name);

    constructor(
        @InjectRepository(BulkOperation)
        private bulkOpRepo: Repository<BulkOperation>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
        private invoiceService: InvoiceService,
    ) { }

    // Queue bulk operation
    async queueBulkOperation(
        type: string,
        parameters: any,
        userId: string,
        tenantId: string,
    ): Promise<BulkOperation> {
        const totalItems = parameters.invoice_ids?.length || 0;

        const operation = this.bulkOpRepo.create({
            operation_type: type as any,
            parameters,
            status: 'queued',
            total_items: totalItems,
            initiated_by: userId,
            tenant_id: tenantId,
        });

        const saved = await this.bulkOpRepo.save(operation);

        // Start processing immediately (in production, use job queue)
        this.processBulkOperation(saved.id).catch((error) => {
            this.logger.error(`Bulk operation ${saved.id} failed:`, error);
        });

        return saved;
    }

    // Process bulk operation
    async processBulkOperation(operationId: string): Promise<void> {
        const operation = await this.bulkOpRepo.findOne({ where: { id: operationId } });
        if (!operation) return;

        // Update status
        await this.bulkOpRepo.update(operationId, {
            status: 'processing',
            started_at: new Date(),
        });

        try {
            switch (operation.operation_type) {
                case 'bulk_update':
                    await this.processBulkUpdate(operation);
                    break;
                case 'bulk_delete':
                    await this.processBulkDelete(operation);
                    break;
                case 'bulk_send':
                    await this.processBulkSend(operation);
                    break;
                default:
                    throw new Error(`Unknown operation type: ${operation.operation_type}`);
            }

            // Mark as completed
            await this.bulkOpRepo.update(operationId, {
                status: 'completed',
                completed_at: new Date(),
            });

            this.logger.log(`Bulk operation ${operationId} completed successfully`);
        } catch (error) {
            this.logger.error(`Bulk operation ${operationId} failed:`, error);
            await this.bulkOpRepo.update(operationId, {
                status: 'failed',
                completed_at: new Date(),
            });
        }
    }

    // Process bulk update
    private async processBulkUpdate(operation: BulkOperation): Promise<void> {
        const { invoice_ids, updates } = operation.parameters;

        for (const invoiceId of invoice_ids) {
            try {
                await this.invoiceService.update(invoiceId, updates, operation.tenant_id);

                await this.incrementSuccess(operation.id);
            } catch (error) {
                await this.recordError(operation.id, invoiceId, error.message);
            }
        }
    }

    // Process bulk delete
    private async processBulkDelete(operation: BulkOperation): Promise<void> {
        const { invoice_ids } = operation.parameters;

        for (const invoiceId of invoice_ids) {
            try {
                await this.invoiceService.remove(invoiceId, operation.tenant_id);
                await this.incrementSuccess(operation.id);
            } catch (error) {
                await this.recordError(operation.id, invoiceId, error.message);
            }
        }
    }

    // Process bulk send
    private async processBulkSend(operation: BulkOperation): Promise<void> {
        const { invoice_ids } = operation.parameters;

        for (const invoiceId of invoice_ids) {
            try {
                await this.invoiceService.update(invoiceId, { status: 'sent' } as any, operation.tenant_id);
                await this.incrementSuccess(operation.id);
            } catch (error) {
                await this.recordError(operation.id, invoiceId, error.message);
            }
        }
    }

    // Increment success counter
    private async incrementSuccess(operationId: string): Promise<void> {
        await this.bulkOpRepo.increment(
            { id: operation Id },
            'processed_items',
            1,
        );
        await this.bulkOpRepo.increment(
            { id: operationId },
            'success_count',
            1,
        );
    }

    // Record error
    private async recordError(
        operationId: string,
        invoiceId: string,
        error: string,
    ): Promise<void> {
        const operation = await this.bulkOpRepo.findOne({ where: { id: operationId } });
        if (!operation) return;

        const errors = operation.errors || [];
        errors.push({ invoice_id: invoiceId, error });

        await this.bulkOpRepo.update(operationId, {
            errors,
            processed_items: operation.processed_items + 1,
            failure_count: operation.failure_count + 1,
        });
    }

    // Get operation status
    async getOperationStatus(operationId: string): Promise<BulkOperation> {
        return this.bulkOpRepo.findOne({ where: { id: operationId } });
    }

    // Cancel operation
    async cancelOperation(operationId: string): Promise<void> {
        await this.bulkOpRepo.update(operationId, {
            status: 'cancelled',
            completed_at: new Date(),
        });
    }

    // Retry failed items
    async retryFailedItems(operationId: string): Promise<BulkOperation> {
        const operation = await this.bulkOpRepo.findOne({ where: { id: operationId } });
        if (!operation || !operation.errors?.length) {
            return operation;
        }

        const failedIds = operation.errors.map((e) => e.invoice_id);

        return this.queueBulkOperation(
            operation.operation_type,
            { invoice_ids: failedIds, ...operation.parameters.updates && { updates: operation.parameters.updates } },
            operation.initiated_by,
            operation.tenant_id,
        );
    }

    // List operations
    async listOperations(tenantId: string, status?: string): Promise<BulkOperation[]> {
        const where: any = { tenant_id: tenantId };
        if (status) where.status = status;

        return this.bulkOpRepo.find({
            where,
            order: { created_at: 'DESC' },
            take: 50,
        });
    }
}
