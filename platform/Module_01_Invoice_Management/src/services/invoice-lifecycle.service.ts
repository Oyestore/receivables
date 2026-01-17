import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceLifecycleEvent } from '../entities/invoice-lifecycle-event.entity';
import { Invoice } from '../entities/invoice.entity';

export interface LifecycleMetrics {
    days_in_draft: number;
    days_to_first_view: number;
    days_to_payment: number;
    total_reminders_sent: number;
    views_count: number;
    payment_link_clicks: number;
}

export interface LifecycleJourney {
    invoice: Invoice;
    events: InvoiceLifecycleEvent[];
    metrics: LifecycleMetrics;
    bottlenecks: string[];
    current_stage: string;
    next_expected_action: string;
}

@Injectable()
export class InvoiceLifecycleService {
    constructor(
        @InjectRepository(InvoiceLifecycleEvent)
        private lifecycleRepo: Repository<InvoiceLifecycleEvent>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // Record lifecycle event
    async recordEvent(
        invoiceId: string,
        eventType: string,
        metadata?: any,
        tenantId?: string,
    ): Promise<InvoiceLifecycleEvent> {
        const event = this.lifecycleRepo.create({
            invoice_id: invoiceId,
            event_type: eventType as any,
            metadata: metadata || {},
            tenant_id: tenantId,
            occurred_at: new Date(),
        });

        return this.lifecycleRepo.save(event);
    }

    // Get complete invoice journey
    async getInvoiceJourney(
        invoiceId: string,
        tenantId: string,
    ): Promise<LifecycleJourney> {
        // Load invoice
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        // Load all lifecycle events
        const events = await this.lifecycleRepo.find({
            where: { invoice_id: invoiceId, tenant_id: tenantId },
            order: { occurred_at: 'ASC' },
        });

        // Calculate metrics
        const metrics = this.calculateMetrics(events);

        // Identify bottlenecks
        const bottlenecks = this.identifyBottlenecks(events, invoice);

        // Determine current stage and next action
        const currentStage = this.getCurrentStage(invoice, events);
        const nextExpectedAction = this.getNextExpectedAction(invoice, events);

        return {
            invoice,
            events,
            metrics,
            bottlenecks,
            current_stage: currentStage,
            next_expected_action: nextExpectedAction,
        };
    }

    // Calculate lifecycle metrics
    private calculateMetrics(events: InvoiceLifecycleEvent[]): LifecycleMetrics {
        const createdEvent = events.find(e => e.event_type === 'created');
        const sentEvent = events.find(e => e.event_type === 'sent');
        const firstViewEvent = events.find(e => e.event_type === 'viewed');
        const paidEvent = events.find(e => e.event_type === 'fully_paid');

        const now = new Date();

        return {
            days_in_draft: this.daysBetween(
                createdEvent?.occurred_at,
                sentEvent?.occurred_at || now,
            ),
            days_to_first_view: this.daysBetween(
                sentEvent?.occurred_at,
                firstViewEvent?.occurred_at || now,
            ),
            days_to_payment: this.daysBetween(
                sentEvent?.occurred_at,
                paidEvent?.occurred_at || now,
            ),
            total_reminders_sent: events.filter(e => e.event_type === 'reminder_sent').length,
            views_count: events.filter(e => e.event_type === 'viewed').length,
            payment_link_clicks: events.filter(e => e.event_type === 'payment_link_clicked').length,
        };
    }

    // Identify bottlenecks
    private identifyBottlenecks(
        events: InvoiceLifecycleEvent[],
        invoice: Invoice,
    ): string[] {
        const bottlenecks: string[] = [];
        const sentEvent = events.find(e => e.event_type === 'sent');
        const viewEvent = events.find(e => e.event_type === 'viewed');
        const paidEvent = events.find(e => e.event_type === 'fully_paid');

        // Stuck in draft too long
        if (!sentEvent && this.daysBetween(invoice.created_at, new Date()) > 7) {
            bottlenecks.push('Invoice in draft for over 7 days');
        }

        // Not viewed after sending
        if (sentEvent && !viewEvent && this.daysBetween(sentEvent.occurred_at, new Date()) > 3) {
            bottlenecks.push('Not viewed by customer after 3 days');
        }

        // Viewed but not paid
        if (viewEvent && !paidEvent && this.daysBetween(viewEvent.occurred_at, new Date()) > 7) {
            bottlenecks.push('Customer viewed but hasn\'t paid in 7 days');
        }

        // Overdue
        if (invoice.due_date < new Date() && invoice.status !== 'paid') {
            bottlenecks.push(`Overdue by ${this.daysBetween(invoice.due_date, new Date())} days`);
        }

        return bottlenecks;
    }

    // Get current stage
    private getCurrentStage(invoice: Invoice, events: InvoiceLifecycleEvent[]): string {
        if (invoice.status === 'paid') return 'Completed';
        if (invoice.status === 'cancelled') return 'Cancelled';
        if (invoice.status === 'disputed') return 'In Dispute';

        const lastEvent = events[events.length - 1];
        if (!lastEvent) return 'Created';

        const stageMap: { [key: string]: string } = {
            created: 'Draft',
            draft_saved: 'Draft',
            sent: 'Sent',
            viewed: 'Awaiting Payment',
            payment_link_clicked: 'Payment in Progress',
            partially_paid: 'Partially Paid',
            overdue: 'Overdue',
        };

        return stageMap[lastEvent.event_type] || 'Active';
    }

    // Get next expected action
    private getNextExpectedAction(invoice: Invoice, events: InvoiceLifecycleEvent[]): string {
        if (invoice.status === 'paid') return 'None - Invoice fully paid';
        if (invoice.status === 'cancelled') return 'None - Invoice cancelled';

        const sentEvent = events.find(e => e.event_type === 'sent');
        const viewEvent = events.find(e => e.event_type === 'viewed');

        if (!sentEvent) return 'Send invoice to customer';
        if (!viewEvent) return 'Wait for customer to view';

        const daysOverdue = this.daysBetween(invoice.due_date, new Date());
        if (daysOverdue > 0) {
            return `Send payment reminder (${daysOverdue} days overdue)`;
        }

        return 'Wait for payment or follow up with customer';
    }

    // Helper: Calculate days between dates
    private daysBetween(start: Date | undefined, end: Date): number {
        if (!start) return 0;
        const diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Get aggregate lifecycle analytics
    async getLifecycleAnalytics(
        tenantId: string,
        period: 'week' | 'month' | 'quarter' = 'month',
    ): Promise<{
        avg_days_to_payment: number;
        avg_days_draft_to_sent: number;
        avg_days_sent_to_viewed: number;
        avg_days_viewed_to_paid: number;
        bottleneck_stage: string;
        total_invoices_analyzed: number;
    }> {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        if (period === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
        else startDate.setMonth(startDate.getMonth() - 3);

        // Get all invoices in period
        const invoices = await this.invoiceRepo.find({
            where: { tenant_id: tenantId },
        });

        let totalDaysToPayment = 0;
        let totalDaysDraftToSent = 0;
        let totalDaysSentToViewed = 0;
        let totalDaysViewedToPaid = 0;
        let paidCount = 0;
        let sentCount = 0;
        let viewedCount = 0;

        // Analyze each invoice
        for (const invoice of invoices) {
            const events = await this.lifecycleRepo.find({
                where: { invoice_id: invoice.id },
                order: { occurred_at: 'ASC' },
            });

            const created = events.find(e => e.event_type === 'created');
            const sent = events.find(e => e.event_type === 'sent');
            const viewed = events.find(e => e.event_type === 'viewed');
            const paid = events.find(e => e.event_type === 'fully_paid');

            if (created && sent) {
                totalDaysDraftToSent += this.daysBetween(created.occurred_at, sent.occurred_at);
                sentCount++;
            }

            if (sent && viewed) {
                totalDaysSentToViewed += this.daysBetween(sent.occurred_at, viewed.occurred_at);
                viewedCount++;
            }

            if (viewed && paid) {
                totalDaysViewedToPaid += this.daysBetween(viewed.occurred_at, paid.occurred_at);
            }

            if (sent && paid) {
                totalDaysToPayment += this.daysBetween(sent.occurred_at, paid.occurred_at);
                paidCount++;
            }
        }

        // Calculate averages
        const avgDraftToSent = sentCount > 0 ? totalDaysDraftToSent / sentCount : 0;
        const avgSentToViewed = viewedCount > 0 ? totalDaysSentToViewed / viewedCount : 0;
        const avgViewedToPaid = paidCount > 0 ? totalDaysViewedToPaid / paidCount : 0;

        // Identify bottleneck stage
        let bottleneckStage = 'None';
        const maxDelay = Math.max(avgDraftToSent, avgSentToViewed, avgViewedToPaid);
        if (maxDelay === avgDraftToSent) bottleneckStage = 'Draft to Sent';
        else if (maxDelay === avgSentToViewed) bottleneckStage = 'Sent to Viewed';
        else if (maxDelay === avgViewedToPaid) bottleneckStage = 'Viewed to Paid';

        return {
            avg_days_to_payment: paidCount > 0 ? totalDaysToPayment / paidCount : 0,
            avg_days_draft_to_sent: avgDraftToSent,
            avg_days_sent_to_viewed: avgSentToViewed,
            avg_days_viewed_to_paid: avgViewedToPaid,
            bottleneck_stage: bottleneckStage,
            total_invoices_analyzed: invoices.length,
        };
    }

    // Record invoice creation
    async recordInvoiceCreated(invoice: Invoice): Promise<void> {
        await this.recordEvent(invoice.id, 'created', {
            amount: invoice.grand_total,
            currency: invoice.currency,
        }, invoice.tenant_id);
    }

    // Record invoice sent
    async recordInvoiceSent(invoice: Invoice, channel: string): Promise<void> {
        await this.recordEvent(invoice.id, 'sent', {
            channel,
            amount: invoice.grand_total,
            previous_status: 'draft',
            new_status: 'sent',
        }, invoice.tenant_id);
    }

    // Record invoice viewed (called by distribution module)
    async recordInvoiceViewed(
        invoiceId: string,
        ipAddress: string,
        userAgent: string,
        tenantId: string,
    ): Promise<void> {
        await this.recordEvent(invoiceId, 'viewed', {
            ip_address: ipAddress,
            user_agent: userAgent,
        }, tenantId);
    }

    // Record payment
    async recordPayment(invoice: Invoice, amount: number, partial: boolean = false): Promise<void> {
        await this.recordEvent(
            invoice.id,
            partial ? 'partially_paid' : 'fully_paid',
            {
                amount,
                previous_status: invoice.status,
                new_status: partial ? 'partially_paid' : 'paid',
            },
            invoice.tenant_id,
        );
    }
}
