export interface IPricingModel {
    id: string;
    modelName: string;
    modelType: 'base' | 'usage' | 'feature' | 'hybrid';
    basePrice: number;
    currency: string;
    isActive: boolean;
    mlConfig?: any;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPricingTier {
    id: string;
    modelId: string;
    tierName: string;
    minVolume?: number;
    maxVolume?: number;
    unitPrice: number;
    features?: any;
    discountPercentage?: number;
}

export interface IDiscountRule {
    id: string;
    ruleName: string;
    ruleType: 'volume' | 'promotional' | 'partner' | 'seasonal' | 'loyalty';
    discountPercentage?: number;
    discountAmount?: number;
    conditions?: any;
    validFrom?: Date;
    validUntil?: Date;
    isActive: boolean;
    maxUses?: number;
    currentUses: number;
}

export interface IPricingExperiment {
    id: string;
    experimentName: string;
    controlModelId: string;
    variantModelId: string;
    trafficSplit: number;
    startDate: Date;
    endDate?: Date;
    status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
    hypothesis?: string;
    successMetrics?: any;
    results?: any;
    winner?: 'control' | 'variant' | 'inconclusive';
    confidenceLevel?: number;
}

export interface IPricingAnalytics {
    id: string;
    modelId: string;
    metricDate: Date;
    conversions: number;
    revenue: number;
    churnCount: number;
    priceElasticity?: number;
    competitorAvgPrice?: number;
    marketPosition?: 'premium' | 'competitive' | 'discount';
    customerAcquisitionCost?: number;
    customerLifetimeValue?: number;
}

export interface IPriceRecommendation {
    id: string;
    modelId: string;
    recommendedPrice: number;
    currentPrice: number;
    confidenceScore: number;
    reasoning?: any;
    expectedImpact?: any;
    mlModelVersion?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface IPriceCalculationRequest {
    modelId: string;
    tenantId?: string;
    volume?: number;
    region?: string;
    discountCodes?: string[];
    customParameters?: any;
}

export interface IPriceCalculationResult {
    basePrice: number;
    discounts: Array<{
        ruleName: string;
        amount: number;
        percentage?: number;
    }>;
    finalPrice: number;
    currency: string;
    taxAmount?: number;
    totalPrice: number;
    breakdown: any;
}
