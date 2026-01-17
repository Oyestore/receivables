import { Injectable, Logger } from '@nestjs/common';
import {
    In

jectRepository
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Refund } from '../entities/refund.entity';
import { AccountingHubService } from '@accounting-integration-hub';

/**
 * Module 11 Accounting Integration Service for Module 03
 * 
 * Handles seamless integration between Payment Module (M03) and
 * Accounting Integration Hub (M11) for:
 * - Payment sync to accounting systems
 * - Refund sync
 * - Real-time event-driven updates
 * - Automatic retry on failure
 * 
 * Replaces all direct accounting integrations in M03
 */
@Injectable()
export class AccountingIntegrationService {
    private readonly logger = new Logger(AccountingIntegrationService.name);

    constructor(
        @InjectRepository(PaymentTransaction)
        private readonly paymentRepo: Repository<PaymentTransaction>,
        @InjectRepository(Refund)
        private readonly refundRepo: Repository<Refund>,
        private readonly accountingHub: AccountingHubService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Sync payment to accounting systems via M11 hub
     */
    async syncPaymentReceived(params: {
        paymentId: string;
        tenantId: string;
    }): Promise<void> {
        try {
            const payment = await this.paymentRepo.findOne({
                where: { id: params.paymentId },
                relations: ['invoice'],
            });

            if (!payment) {
                throw new Error(`Payment ${params.paymentId} not found`);
            }

            // Call M11 Accounting Hub
            await this.accountingHub.syncPaymentReceived({
                tenantId: params.tenantId,
                invoice: {
                    id: payment.invoice?.id,
                    external_id: payment.invoice?.external_id,
                },
                amount: payment.amount,
                method: payment.payment_method,
                transactionId: payment.transaction_id,
                timestamp: payment.created_at,
                metadata: {
                    gateway: payment.gateway,
                    status: payment.status,
                    currency: payment.currency,
                },
            });

            this.logger.log(`Payment ${params.paymentId} synced to accounting systems`);
        } catch (error) {
            this.logger.error(`Failed to sync payment ${params.paymentId}: ${error.message}`);

            // Emit error event for retry handling
            this.eventEmitter.emit('accounting.sync.failed', {
                entityType: 'payment',
                entityId: params.paymentId,
                tenantId: params.tenantId,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Sync refund to accounting systems via M11 hub
     */
    async syncRefund(params: {
        refundId: string;
        tenantId: string;
    }): Promise<void> {
        try {
            const refund = await this.refundRepo.findOne({
                where: { id: params.refundId },
                relations: ['payment', 'payment.invoice'],
            });

            if (!refund) {
                throw new Error(`Refund ${params.refundId} not found`);
            }

            // Call M11 Accounting Hub
            await this.accountingHub.syncRefund({
                tenantId: params.tenantId,
                id: refund.id,
                payment_id: refund.payment_id,
                payment_external_id: refund.payment?.external_id,
                invoice_id: refund.payment?.invoice?.id,
                amount: refund.amount,
                reason: refund.reason,
                refund_date: refund.created_at,
                status: refund.status,
                metadata: {
                    gateway: refund.payment?.gateway,
                    refund_transaction_id: refund.refund_transaction_id,
                },
            });

            this.logger.log(`Refund ${params.refundId} synced to accounting systems`);
        } catch (error) {
            this.logger.error(`Failed to sync refund ${params.refundId}: ${error.message}`);

            this.eventEmitter.emit('accounting.sync.failed', {
                entityType: 'refund',
                entityId: params.refundId,
                tenantId: params.tenantId,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Event handler: Auto-sync on payment completion
     */
    @OnEvent('payment.completed')
    async handlePaymentCompleted(event: {
        paymentId: string;
        tenantId: string;
    }): Promise<void> {
        try {
            await this.syncPaymentReceived(event);
        } catch (error) {
            // Error already logged, will be retried
        }
    }

    /**
     * Event handler: Auto-sync on refund processed
     */
    @OnEvent('refund.processed')
    async handleRefundProcessed(event: {
        refundId: string;
        tenantId: string;
    }): Promise<void> {
        try {
            await this.syncRefund(event);
        } catch (error) {
            // Error already logged, will be retried
        }
    }

    /**
     * Retry failed accounting syncs
     */
    @OnEvent('accounting.sync.retry')
    async retryFailedSync(event: {
        entityType: 'payment' | 'refund';
        entityId: string;
        tenantId: string;
    }): Promise<void> {
        try {
            if (event.entityType === 'payment') {
                await this.syncPaymentReceived({
                    paymentId: event.entityId,
                    tenantId: event.tenantId,
                });
            } else {
                await this.syncRefund({
                    refundId: event.entityId,
                    tenantId: event.tenantId,
                });
            }

            this.logger.log(`Retry succeeded for ${event.entityType} ${event.entityId}`);
        } catch (error) {
            this.logger.error(`Retry failed for ${event.entityType} ${event.entityId}: ${error.message}`);
        }
    }
}
