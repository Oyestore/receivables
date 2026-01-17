/**
 * AI Behavioral Analytics Interfaces
 * Shared interfaces for customer segmentation and personalization
 */

import { CustomerSegmentType, PersonalizationLevel, PredictionConfidence } from '../enums/ai-behavioral-analytics.enum';

export interface CustomerSegmentationInterface {
    segmentId: string;
    segmentName: string;
    segmentType: CustomerSegmentType;
    criteria: {
        behavioral?: Record<string, any>;
        demographic?: Record<string, any>;
        transactional?: Record<string, any>;
    };
    characteristics: {
        size: number;
        averageValue: number;
        riskLevel: string;
    };
}

export interface PersonalizationEngineInterface {
    customerId: string;
    personalizationLevel: PersonalizationLevel;
    recommendations: Array<{
        type: string;
        content: any;
        confidence: PredictionConfidence;
        priority: number;
    }>;
    preferences: Record<string, any>;
    engagementMetrics: {
        responseRate: number;
        conversionRate: number;
        satisfactionScore: number;
    };
}
