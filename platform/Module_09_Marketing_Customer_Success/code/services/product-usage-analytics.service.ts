import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Product Usage Analytics Service
 * Tracks and analyzes how customers use platform features
 * 
 * Gap Resolution: Phase 9.2 - Missing product usage analytics
 */

export interface FeatureUsageEvent {
    tenantId: string;
    customerId: string;
    featureName: string;
    moduleId: string;
    action: 'view' | 'create' | 'update' | 'delete' | 'search' | 'export';
    metadata?: Record<string, any>;
    timestamp: Date;
}

export interface UsageMetrics {
    customerId: string;
    features: {
        featureName: string;
        moduleId: string;
        usageCount: number;
        lastUsed: Date;
        adoptionStatus: 'not_adopted' | 'exploring' | 'adopted' | 'power_user';
    }[];
    engagementScore: number;           // 0-100
    sessionStats: {
        avgSessionDuration: number;     // minutes
        sessionsLast30Days: number;
        avgActionsPerSession: number;
    };
    featureAdoptionRate: number;        // % of available features used
    powerUserScore: number;             // 0-100, based on advanced feature usage
}

@Injectable()
export class ProductUsageAnalyticsService {
    private readonly logger = new Logger(ProductUsageAnalyticsService.name);

    constructor() { }

    /**
     * Track feature usage event (called from all modules)
     */
    async trackFeatureUsage(event: FeatureUsageEvent): Promise<void> {
        try {
            // In production: Store in time-series database or analytics platform
            this.logger.debug(
                `Feature usage: ${event.customerId} - ${event.moduleId}.${event.featureName} (${event.action})`,
            );

            // TODO: Integration with Module 04 analytics for storage
            // await this.analyticsService.storeEvent(event);
        } catch (error) {
            this.logger.error(`Failed to track feature usage: ${error.message}`);
        }
    }

    /**
     * Get comprehensive usage metrics for customer
     */
    async getCustomerUsageMetrics(
        tenantId: string,
        customerId: string,
    ): Promise<UsageMetrics> {
        // Mock implementation - integrate with Module 04 analytics
        const features = [
            {
                featureName: 'invoice_creation',
                moduleId: 'module_01',
                usageCount: Math.floor(Math.random() * 100) + 20,
                lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
                adoptionStatus: this.calculateAdoptionStatus(Math.random() * 100),
            },
            {
                featureName: 'payment_tracking',
                moduleId: 'module_03',
                usageCount: Math.floor(Math.random() * 80) + 15,
                lastUsed: new Date(Date.now() - Math.random() * 14 * 24 * 3600000),
                adoptionStatus: this.calculateAdoptionStatus(Math.random() * 100),
            },
            {
                featureName: 'analytics_dashboard',
                moduleId: 'module_04',
                usageCount: Math.floor(Math.random() * 50) + 5,
                lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 3600000),
                adoptionStatus: this.calculateAdoptionStatus(Math.random() * 100),
            },
            {
                featureName: 'dispute_management',
                moduleId: 'module_08',
                usageCount: Math.floor(Math.random() * 20),
                lastUsed: new Date(Date.now() - Math.random() * 60 * 24 * 3600000),
                adoptionStatus: this.calculateAdoptionStatus(Math.random() * 100),
            },
        ];

        const usageCount = features.reduce((sum, f) => sum + f.usageCount, 0);
        const adoptedFeatures = features.filter(f => f.adoptionStatus !== 'not_adopted').length;

        return {
            customerId,
            features,
            engagementScore: this.calculateEngagementScore(features),
            sessionStats: {
                avgSessionDuration: 15 + Math.random() * 30,
                sessionsLast30Days: Math.floor(Math.random() * 60) + 10,
                avgActionsPerSession: 5 + Math.random() * 15,
            },
            featureAdoptionRate: (adoptedFeatures / features.length) * 100,
            powerUserScore: this.calculatePowerUserScore(features),
        };
    }

    /**
     * Identify feature adoption gaps
     */
    async identifyAdoptionGaps(
        tenantId: string,
        customerId: string,
    ): Promise<{
        unutilizedFeatures: string[];
        underutilizedFeatures: string[];
        recommendations: Array<{
            feature: string;
            reason: string;
            expectedBenefit: string;
        }>;
    }> {
        const metrics = await this.getCustomerUsageMetrics(tenantId, customerId);

        const unutilizedFeatures = metrics.features
            .filter(f => f.adoptionStatus === 'not_adopted')
            .map(f => f.featureName);

        const underutilizedFeatures = metrics.features
            .filter(f => f.adoptionStatus === 'exploring')
            .map(f => f.featureName);

        const recommendations = this.generateAdoptionRecommendations(
            unutilizedFeatures,
            underutilizedFeatures,
        );

        return {
            unutilizedFeatures,
            underutilizedFeatures,
            recommendations,
        };
    }

    /**
     * Get cohort usage comparison
     */
    async getCohortUsageComparison(
        tenantId: string,
        customerId: string,
    ): Promise<{
        customerUsage: number;
        cohortAverage: number;
        percentile: number;
        comparison: 'above_average' | 'average' | 'below_average';
    }> {
        const metrics = await this.getCustomerUsageMetrics(tenantId, customerId);

        // Mock cohort data - in production, query from analytics database
        const cohortAverage = 65;
        const percentile = Math.random() * 100;

        return {
            customerUsage: metrics.engagementScore,
            cohortAverage,
            percentile,
            comparison: metrics.engagementScore > cohortAverage + 10
                ? 'above_average'
                : metrics.engagementScore < cohortAverage - 10
                    ? 'below_average'
                    : 'average',
        };
    }

    // Helper methods

    private calculateAdoptionStatus(
        usageScore: number,
    ): 'not_adopted' | 'exploring' | 'adopted' | 'power_user' {
        if (usageScore === 0) return 'not_adopted';
        if (usageScore < 30) return 'exploring';
        if (usageScore < 70) return 'adopted';
        return 'power_user';
    }

    private calculateEngagementScore(features: any[]): number {
        const totalUsage = features.reduce((sum, f) => sum + f.usageCount, 0);
        const recentUsage = features.filter(
            f => (Date.now() - f.lastUsed.getTime()) < 7 * 24 * 3600000,
        ).length;

        // Weighted score based on usage count and recency
        const usageScore = Math.min((totalUsage / 200) * 50, 50);
        const recencyScore = (recentUsage / features.length) * 50;

        return Math.round(usageScore + recencyScore);
    }

    private calculatePowerUserScore(features: any[]): number {
        const powerFeatures = features.filter(
            f => f.adoptionStatus === 'power_user',
        ).length;

        return Math.round((powerFeatures / features.length) * 100);
    }

    private generateAdoptionRecommendations(
        unutilized: string[],
        underutilized: string[],
    ): Array<{
        feature: string;
        reason: string;
        expectedBenefit: string;
    }> {
        const recommendations = [];

        if (unutilized.includes('analytics_dashboard')) {
            recommendations.push({
                feature: 'Analytics Dashboard',
                reason: 'Get insights into your receivables performance',
                expectedBenefit: 'Identify 20-30% improvement opportunities',
            });
        }

        if (unutilized.includes('automated_reminders')) {
            recommendations.push({
                feature: 'Automated Payment Reminders',
                reason: 'Reduce manual follow-up effort',
                expectedBenefit: 'Save 5-10 hours per week + 15% faster payments',
            });
        }

        if (underutilized.includes('invoice_creation')) {
            recommendations.push({
                feature: 'Bulk Invoice Creation',
                reason: 'Create multiple invoices at once',
                expectedBenefit: 'Save 60% time on invoice creation',
            });
        }

        return recommendations;
    }
}
