import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class PrometheusMetricsService {
    private readonly registry: Registry;

    // Counters
    private readonly distributionsSentTotal: Counter;
    private readonly distributionsDeliveredTotal: Counter;
    private readonly distributionsFailedTotal: Counter;
    private readonly followUpsSentTotal: Counter;
    private readonly templatesRenderedTotal: Counter;
    private readonly eventsProcessedTotal: Counter;

    // Histograms
    private readonly ruleEvaluationDuration: Histogram;
    private readonly templateRenderDuration: Histogram;
    private readonly distributionDuration: Histogram;
    private readonly followUpProcessingDuration: Histogram;

    constructor() {
        this.registry = new Registry();

        // Initialize counters
        this.distributionsSentTotal = new Counter({
            name: 'distributions_sent_total',
            help: 'Total number of distributions sent',
            labelNames: ['channel', 'tenant_id'],
            registers: [this.registry],
        });

        this.distributionsDeliveredTotal = new Counter({
            name: 'distributions_delivered_total',
            help: 'Total number of distributions delivered successfully',
            labelNames: ['channel', 'tenant_id'],
            registers: [this.registry],
        });

        this.distributionsFailedTotal = new Counter({
            name: 'distributions_failed_total',
            help: 'Total number of failed distributions',
            labelNames: ['channel', 'tenant_id', 'error_type'],
            registers: [this.registry],
        });

        this.followUpsSentTotal = new Counter({
            name: 'followups_sent_total',
            help: 'Total number of follow-ups sent',
            labelNames: ['sequence_id', 'tenant_id'],
            registers: [this.registry],
        });

        this.templatesRenderedTotal = new Counter({
            name: 'templates_rendered_total',
            help: 'Total number of templates rendered',
            labelNames: ['template_id', 'channel', 'success'],
            registers: [this.registry],
        });

        this.eventsProcessedTotal = new Counter({
            name: 'events_processed_total',
            help: 'Total number of events processed',
            labelNames: ['event_type', 'source_module'],
            registers: [this.registry],
        });

        // Initialize histograms
        this.ruleEvaluationDuration = new Histogram({
            name: 'rule_evaluation_duration_seconds',
            help: 'Duration of rule evaluation in seconds',
            labelNames: ['rule_type', 'tenant_id'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });

        this.templateRenderDuration = new Histogram({
            name: 'template_render_duration_seconds',
            help: 'Duration of template rendering in seconds',
            labelNames: ['template_id', 'channel'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1],
            registers: [this.registry],
        });

        this.distributionDuration = new Histogram({
            name: 'distribution_duration_seconds',
            help: 'Duration of distribution send in seconds',
            labelNames: ['channel', 'provider'],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });

        this.followUpProcessingDuration = new Histogram({
            name: 'followup_processing_duration_seconds',
            help: 'Duration of follow-up processing in seconds',
            buckets: [0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });
    }

    // Counter methods
    recordDistributionSent(channel: string, tenantId: string): void {
        this.distributionsSentTotal.inc({ channel, tenant_id: tenantId });
    }

    recordDistributionDelivered(channel: string, tenantId: string): void {
        this.distributionsDeliveredTotal.inc({ channel, tenant_id: tenantId });
    }

    recordDistributionFailed(channel: string, tenantId: string, errorType: string): void {
        this.distributionsFailedTotal.inc({ channel, tenant_id: tenantId, error_type: errorType });
    }

    recordFollowUpSent(sequenceId: string, tenantId: string): void {
        this.followUpsSentTotal.inc({ sequence_id: sequenceId, tenant_id: tenantId });
    }

    recordTemplateRendered(templateId: string, channel: string, success: boolean): void {
        this.templatesRenderedTotal.inc({
            template_id: templateId,
            channel,
            success: success.toString(),
        });
    }

    recordEventProcessed(eventType: string, sourceModule: string): void {
        this.eventsProcessedTotal.inc({ event_type: eventType, source_module: sourceModule });
    }

    // Histogram methods
    observeRuleEvaluation(ruleType: string, tenantId: string, durationSeconds: number): void {
        this.ruleEvaluationDuration.observe({ rule_type: ruleType, tenant_id: tenantId }, durationSeconds);
    }

    observeTemplateRender(templateId: string, channel: string, durationSeconds: number): void {
        this.templateRenderDuration.observe({ template_id: templateId, channel }, durationSeconds);
    }

    observeDistribution(channel: string, provider: string, durationSeconds: number): void {
        this.distributionDuration.observe({ channel, provider }, durationSeconds);
    }

    observeFollowUpProcessing(durationSeconds: number): void {
        this.followUpProcessingDuration.observe({}, durationSeconds);
    }

    // Get metrics for export
    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    // Get content type
    getContentType(): string {
        return this.registry.contentType;
    }
}
