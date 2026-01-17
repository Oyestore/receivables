import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DisputeCreatedEvent } from '../events/dispute-created.event';
import { DisputeResolvedEvent } from '../events/dispute-resolved.event';
import { CollectionStartedEvent } from '../events/collection-started.event';

import { InvoiceAdapter } from '../adapters/invoice.adapter';
import { PaymentAdapter } from '../adapters/payment.adapter';
import { CreditAdapter } from '../adapters/credit.adapter';
import { CommunicationAdapter } from '../adapters/communication.adapter';
import { AnalyticsAdapter } from '../adapters/analytics.adapter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MSMECase } from '../../entities/msme-case.entity';

@Injectable()
export class DisputeEventListener {
    private readonly logger = new Logger(DisputeEventListener.name);

    constructor(
        private readonly invoiceAdapter: InvoiceAdapter,
        private readonly paymentAdapter: PaymentAdapter,
        private readonly creditAdapter: CreditAdapter,
        private readonly communicationAdapter: CommunicationAdapter,
        private readonly analyticsAdapter: AnalyticsAdapter,
        @InjectRepository(MSMECase)
        private readonly msmeCaseRepo: Repository<MSMECase>,
    ) { }

    /**
     * Handle dispute created event
     */
    @OnEvent('dispute.created')
    async handleDisputeCreated(event: DisputeCreatedEvent) {
        this.logger.log(`Processing dispute.created event: ${event.disputeId}`);

        try {
            // 1. Mark invoice as disputed (async, don't block)
            this.invoiceAdapter
                .markAsDisputed(event.invoiceId, event.disputeId, 'system')
                .catch(err => this.logger.warn(`Failed to mark invoice: ${err.message}`));

            // 2. Report to credit module
            this.creditAdapter
                .reportDisputeEvent({
                    customerId: event.customerId,
                    disputeId: event.disputeId,
                    amount: event.amount,
                    eventType: 'filed',
                    tenantId: event.tenantId,
                })
                .catch(err => this.logger.warn(`Failed to report credit event: ${err.message}`));

            // 3. Track analytics
            this.analyticsAdapter
                .trackDisputeEvent({
                    tenantId: event.tenantId,
                    eventType: 'dispute_filed',
                    disputeId: event.disputeId,
                    amount: event.amount,
                    metadata: { type: event.type },
                })
                .catch(err => this.logger.warn(`Failed to track analytics: ${err.message}`));

            // 4. Send notification (fire-and-forget)
            // Fetch real email from Buyer Profile
            let customerEmail = `${event.customerId}@example.context.com`;
            try {
                const buyerProfile = await this.creditAdapter.getBuyerProfile(event.customerId);
                if (buyerProfile && buyerProfile.contactEmail) {
                    customerEmail = buyerProfile.contactEmail;
                }
            } catch (err) {
                this.logger.warn(`Could not fetch buyer email, using fallback.`);
            }

            this.communicationAdapter
                .sendDisputeFiledNotification({
                    customerEmail: customerEmail,
                    customerName: event.customerName,
                    disputeNumber: event.disputeId,
                    amount: event.amount,
                    description: `Dispute of type: ${event.type}`,
                })
                .catch(err => this.logger.warn(`Failed to send notification: ${err.message}`));

            this.logger.log(`Dispute created event processed successfully`);
        } catch (error: any) {
            this.logger.error(`Error processing dispute created event: ${error.message}`);
        }
    }

    /**
     * Handle dispute resolved event
     */
    @OnEvent('dispute.resolved')
    async handleDisputeResolved(event: DisputeResolvedEvent) {
        this.logger.log(`Processing dispute.resolved event: ${event.disputeId}`);

        try {
            // 1. Update invoice status
            const invoiceStatus = event.resolution === 'win' ? 'paid' : 'pending';
            this.invoiceAdapter
                .updateAfterResolution(event.invoiceId, invoiceStatus, 'system', event.disputeId)
                .catch(err => this.logger.warn(`Failed to update invoice: ${err.message}`));

            // 2. Report to credit module
            this.creditAdapter
                .reportDisputeEvent({
                    customerId: event.customerId,
                    disputeId: event.disputeId,
                    amount: event.settledAmount || 0,
                    eventType: 'resolved',
                    tenantId: event.tenantId,
                })
                .catch(err => this.logger.warn(`Failed to report credit: ${err.message}`));

            // 3. Track analytics
            this.analyticsAdapter
                .trackDisputeEvent({
                    tenantId: event.tenantId,
                    eventType: 'dispute_resolved',
                    disputeId: event.disputeId,
                    amount: event.settledAmount || 0,
                    metadata: { resolution: event.resolution },
                })
                .catch(err => this.logger.warn(`Failed to track analytics: ${err.message}`));

            // 4. Send resolution notification
            let customerEmail = `${event.customerId}@example.context.com`;
            try {
                const buyerProfile = await this.creditAdapter.getBuyerProfile(event.customerId);
                if (buyerProfile && buyerProfile.contactEmail) {
                    customerEmail = buyerProfile.contactEmail;
                }
            } catch (err) {
                this.logger.warn(`Could not fetch buyer email for resolution notification.`);
            }

            this.communicationAdapter
                .sendDisputeResolvedNotification({
                    customerEmail: customerEmail,
                    customerName: event.customerId,
                    disputeNumber: event.disputeId,
                    resolution: event.resolution,
                    settledAmount: event.settledAmount,
                })
                .catch(err => this.logger.warn(`Failed to send notification: ${err.message}`));

            this.logger.log(`Dispute resolved event processed successfully`);
        } catch (error: any) {
            this.logger.error(`Error processing dispute resolved event: ${error.message}`);
        }
    }

    /**
     * Handle collection started event
     */
    @OnEvent('collection.started')
    async handleCollectionStarted(event: CollectionStartedEvent) {
        this.logger.log(`Processing collection.started event: ${event.collectionId}`);

        try {
            // 1. Report to credit module
            this.creditAdapter
                .reportCollectionEvent({
                    customerId: event.customerId,
                    collectionCaseId: event.collectionId,
                    amount: event.outstandingAmount,
                    status: 'new',
                    tenantId: event.tenantId,
                })
                .catch(err => this.logger.warn(`Failed to report collection: ${err.message}`));

            // 2. Track analytics
            this.analyticsAdapter
                .trackDisputeEvent({
                    tenantId: event.tenantId,
                    eventType: 'collection_started',
                    disputeId: event.collectionId,
                    amount: event.outstandingAmount,
                    metadata: { strategy: event.strategy },
                })
                .catch(err => this.logger.warn(`Failed to track analytics: ${err.message}`));

            this.logger.log(`Collection started event processed successfully`);
        } catch (error: any) {
            this.logger.error(`Error processing collection started event: ${error.message}`);
        }
    }
}
