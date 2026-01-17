import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface CreditScore {
    customerId: string;
    score: number;
    grade: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    lastUpdated: Date;
}

@Injectable()
export class CreditAdapter {
    private readonly logger = new Logger(CreditAdapter.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get('MODULE_06_URL') || 'http://localhost:3006';
    }

    /**
     * Get customer credit score
     */
    async getCreditScore(customerId: string): Promise<CreditScore | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/credit/score/${customerId}`)
            );
            return response.data.data || response.data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch credit score: ${error.message}`);
            return null;
        }
    }

    /**
     * Report dispute event (impacts credit score)
     */
    async reportDisputeEvent(data: {
        customerId: string;
        disputeId: string;
        amount: number;
        eventType: 'filed' | 'resolved' | 'escalated' | 'written_off';
        tenantId: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/credit/events`, {
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    eventType: 'dispute',
                    eventSubtype: data.eventType,
                    amount: data.amount,
                    impact: this.calculateImpact(data.eventType),
                    metadata: {
                        disputeId: data.disputeId,
                        module: 'dispute_resolution',
                    },
                    timestamp: new Date(),
                })
            );
            this.logger.log(`Dispute event reported to credit module: ${data.eventType}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to report dispute event: ${error.message}`);
            return false;
        }
    }

    /**
     * Report collections activity
     */
    async reportCollectionEvent(data: {
        customerId: string;
        collectionCaseId: string;
        amount: number;
        status: 'new' | 'in_progress' | 'settled' | 'written_off';
        tenantId: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/credit/events`, {
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    eventType: 'collections',
                    eventSubtype: data.status,
                    amount: data.amount,
                    impact: data.status === 'written_off' ? 'negative_high' : 'negative_low',
                    metadata: {
                        collectionCaseId: data.collectionCaseId,
                        module: 'dispute_resolution',
                    },
                })
            );
            this.logger.log(`Collection event reported: ${data.status}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to report collection event: ${error.message}`);
            return false;
        }
    }

    /**
     * Calculate impact based on event type
     */
    private calculateImpact(eventType: string): string {
        switch (eventType) {
            case 'filed':
                return 'negative_medium';
            case 'escalated':
                return 'negative_high';
            case 'written_off':
                return 'negative_critical';
            case 'resolved':
                return 'positive_low';
            default:
                return 'neutral';
        }
    }

    /**
     * Get customer payment behavior score
     */
    async getPaymentBehavior(customerId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/credit/behavior/${customerId}`)
            );
            return response.data.data || response.data;
        } catch (error: any) {
            this.logger.warn(`Failed to get payment behavior: ${error.message}`);
            return null;
        }
    }

    /**
     * Get buyer profile with contact info
     */
    async getBuyerProfile(customerId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/credit/profiles/${customerId}`)
            );
            return response.data.data || response.data;
        } catch (error: any) {
            this.logger.warn(`Failed to fetch buyer profile: ${error.message}`);
            return null;
        }
    }
}
