import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerHealth } from '../entities/customer-health.entity';
import {
    ENGAGEMENT_MULTIPLIER,
    USAGE_MULTIPLIER,
    PAYMENT_PENALTY,
    SUPPORT_PENALTY,
    WEIGHT_ENGAGEMENT,
    WEIGHT_USAGE,
    WEIGHT_PAYMENT,
    WEIGHT_SUPPORT,
    LOW_ENGAGEMENT_THRESHOLD,
    LOW_PAYMENT_HEALTH_THRESHOLD,
    LOW_SUPPORT_HEALTH_THRESHOLD,
    HIGH_OVERALL_SCORE_THRESHOLD,
} from '../shared/constants';

@Injectable()
export class CustomerSuccessService {
    private readonly logger = new Logger(CustomerSuccessService.name);

    constructor(
        @InjectRepository(CustomerHealth)
        private readonly healthRepository: Repository<CustomerHealth>,
    ) { }

    async calculateHealthScore(customerId: string, metrics: {
        loginCount: number;
        invoiceCount: number;
        paymentDelayDays: number;
        supportTickets: number;
    }): Promise<CustomerHealth> {
        let health = await this.healthRepository.findOne({ where: { customerId } });
        if (!health) {
            health = this.healthRepository.create({ customerId });
        }

        // 1. Engagement Score (0-100)
        // More logins = higher score, capped at 100
        health.engagementScore = Math.min(metrics.loginCount * ENGAGEMENT_MULTIPLIER, 100);

        // 2. Product Usage Score (0-100)
        health.productUsageScore = Math.min(metrics.invoiceCount * USAGE_MULTIPLIER, 100);

        // 3. Payment Health Score (0-100)
        // 0 delay = 100, >30 days delay = 0
        health.paymentHealthScore = Math.max(0, 100 - (metrics.paymentDelayDays * PAYMENT_PENALTY));

        // 4. Support Health Score (0-100)
        // Fewer tickets = better score
        health.supportHealthScore = Math.max(0, 100 - (metrics.supportTickets * SUPPORT_PENALTY));

        // Overall Score (Weighted Average)
        health.overallScore = (
            (health.engagementScore * WEIGHT_ENGAGEMENT) +
            (health.productUsageScore * WEIGHT_USAGE) +
            (health.paymentHealthScore * WEIGHT_PAYMENT) +
            (health.supportHealthScore * WEIGHT_SUPPORT)
        );

        health.lastAssessmentDate = new Date();
        health.riskFactors = this.identifyRiskFactors(health);
        health.recommendations = this.generateRecommendations(health);

        return this.healthRepository.save(health);
    }

    async getHealth(customerId: string): Promise<CustomerHealth> {
        return this.healthRepository.findOne({ where: { customerId } });
    }

    private identifyRiskFactors(health: CustomerHealth): string[] {
        const risks = [];
        if (health.engagementScore < LOW_ENGAGEMENT_THRESHOLD) risks.push('Low Engagement');
        if (health.paymentHealthScore < LOW_PAYMENT_HEALTH_THRESHOLD) risks.push('Payment Delays');
        if (health.supportHealthScore < LOW_SUPPORT_HEALTH_THRESHOLD) risks.push('High Support Volume');
        return risks;
    }

    private generateRecommendations(health: CustomerHealth): string[] {
        const recs = [];
        if (health.engagementScore < LOW_ENGAGEMENT_THRESHOLD) recs.push('Schedule check-in call');
        if (health.paymentHealthScore < LOW_PAYMENT_HEALTH_THRESHOLD) recs.push('Review payment terms');
        if (health.overallScore > HIGH_OVERALL_SCORE_THRESHOLD) recs.push('Identify upsell opportunities');
        return recs;
    }
}
