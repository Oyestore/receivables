import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsAdapter {
    private readonly logger = new Logger(AnalyticsAdapter.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get('MODULE_04_URL') || 'http://localhost:3004';
    }

    /**
     * Track dispute event
     */
    async trackDisputeEvent(data: {
        tenantId: string;
        eventType: string;
        disputeId: string;
        amount: number;
        metadata?: Record<string, any>;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/analytics/events`, {
                    module: 'dispute_resolution',
                    tenantId: data.tenantId,
                    eventType: data.eventType,
                    eventId: data.disputeId,
                    amount: data.amount,
                    metadata: data.metadata,
                    timestamp: new Date(),
                })
            );
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to track event: ${error.message}`);
            return false;
        }
    }

    /**
     * Send daily dispute metrics
     */
    async sendDailyMetrics(data: {
        tenantId: string;
        date: Date;
        totalDisputes: number;
        resolvedDisputes: number;
        avgResolutionDays: number;
        totalAmount: number;
        recoveryRate: number;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/analytics/metrics`, {
                    module: 'dispute_resolution',
                    type: 'daily_summary',
                    tenantId: data.tenantId,
                    date: data.date,
                    metrics: {
                        totalDisputes: data.totalDisputes,
                        resolvedDisputes: data.resolvedDisputes,
                        avgResolutionDays: data.avgResolutionDays,
                        totalAmount: data.totalAmount,
                        recoveryRate: data.recoveryRate,
                    },
                })
            );
            this.logger.log(`Daily metrics sent for ${data.date.toISOString().split('T')[0]}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send metrics: ${error.message}`);
            return false;
        }
    }

    /**
     * Track collection metrics
     */
    async trackCollectionMetrics(data: {
        tenantId: string;
        totalCases: number;
        activeCases: number;
        recoveredAmount: number;
        outstandingAmount: number;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/analytics/metrics`, {
                    module: 'collections',
                    type: 'summary',
                    tenantId: data.tenantId,
                    metrics: data,
                    timestamp: new Date(),
                })
            );
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to track collection metrics: ${error.message}`);
            return false;
        }
    }
}
