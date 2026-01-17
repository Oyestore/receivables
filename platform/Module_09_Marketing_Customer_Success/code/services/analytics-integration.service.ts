import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsIntegrationService {
    private readonly logger = new Logger(AnalyticsIntegrationService.name);

    constructor(private readonly eventEmitter: EventEmitter2) { }

    async trackCampaignMetrics(campaignId: string, metrics: {
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
    }): Promise<void> {
        const event = {
            eventType: 'campaign_metrics',
            entityId: campaignId,
            entityType: 'campaign',
            metrics: {
                total_sent: metrics.sent,
                total_opened: metrics.opened,
                total_clicked: metrics.clicked,
                total_converted: metrics.converted,
                open_rate: metrics.sent > 0 ? metrics.opened / metrics.sent : 0,
                click_rate: metrics.sent > 0 ? metrics.clicked / metrics.sent : 0,
                conversion_rate: metrics.sent > 0 ? metrics.converted / metrics.sent : 0,
            },
            dimensions: {},
            timestamp: new Date(),
        };

        this.logger.log(`Tracking campaign metrics for ${campaignId}`);
        this.eventEmitter.emit('marketing.campaign.metrics', event);
    }

    async trackHealthScore(customerId: string, score: number, riskFactors: string[]): Promise<void> {
        const event = {
            eventType: 'customer_health_score',
            entityId: customerId,
            entityType: 'customer',
            metrics: {
                overall_score: score,
                risk_factor_count: riskFactors.length,
            },
            dimensions: {
                risk_factors: riskFactors.join(','),
            },
            timestamp: new Date(),
        };

        this.logger.log(`Tracking health score for customer ${customerId}: ${score}`);
        this.eventEmitter.emit('customer.health.score', event);
    }

    async trackLeadConversion(leadId: string, fromStatus: string, toStatus: string): Promise<void> {
        const event = {
            eventType: 'lead_status_change',
            entityId: leadId,
            entityType: 'lead',
            metrics: {
                conversion_step: this.getConversionStep(toStatus),
            },
            dimensions: {
                from_status: fromStatus,
                to_status: toStatus,
            },
            timestamp: new Date(),
        };

        this.logger.log(`Tracking lead conversion: ${leadId} from ${fromStatus} to ${toStatus}`);
        this.eventEmitter.emit('lead.status.change', event);
    }

    private getConversionStep(status: string): number {
        const steps = {
            'NEW': 1,
            'CONTACTED': 2,
            'QUALIFIED': 3,
            'CONVERTED': 4,
        };
        return steps[status] || 0;
    }
}
