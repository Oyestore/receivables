import { BusinessProfile, FinancingRequest } from '../interfaces/financing-partner-plugin.interface';

/**
 * Pre-qualification result
 */
export interface PreQualificationResult {
    // Overall decision
    decision: 'approve' | 'review' | 'decline';

    // Scores (0-100)
    approvalProbability: number;
    riskScore: number; // Higher = riskier
    creditScore?: number;

    // Recommended partners
    recommendedPartners: PartnerRecommendation[];

    // Partner-specific scores
    partnerScores: Record<string, number>; // partnerId => approval probability

    // Decision factors
    factors: DecisionFactor[];

    // Recommendations
    suggestions: string[];

    // Metadata
    assessedAt: Date;
    source: 'ml_model' | 'rule_based';
    confidence: number; // 0-100
}

/**
 * Credit decision request for Module 15
 */
export interface CreditDecisionRequest {
    businessProfile: BusinessProfile;
    requestedAmount: number;
    purpose: string;
    urgency?: string;
    existingDebt?: number;
    monthlyRevenue?: number;
}

/**
 * Credit decision from Module 15
 */
export interface CreditDecision {
    // Overall decision
    recommendation: 'approve' | 'review' | 'decline';

    // Scores
    overallScore: number; // 0-100
    riskScore: number; // 0-100
    creditScore?: number;

    // Partner matching
    partnerScores: Record<string, number>;
    recommendedPartnerIds: string[];

    // Factors
    factors: DecisionFactor[];

    // ML model metadata
    modelVersion?: string;
    confidence?: number;
}

/**
 * Decision factor
 */
export interface DecisionFactor {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number; // 0-100
    description: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
    level: 'low' | 'medium' | 'high' | 'very_high';
    score: number; // 0-100

    factors: {
        businessAge: { score: number; risk: string };
        revenue: { score: number; risk: string };
        debtToIncome: { score: number; risk: string };
        creditHistory: { score: number; risk: string };
        industry: { score: number; risk: string };
    };

    recommendations: string[];
}

/**
 * Partner recommendation
 */
export interface PartnerRecommendation {
    partnerId: string;
    partnerName: string;

    // Scoring
    approvalProbability: number; // 0-100
    matchScore: number; // 0-100 - how well this partner fits

    // Estimates
    estimatedRate: number; // APR
    estimatedAmount: number;
    estimatedApprovalTime: string; // "24 hours", "2-3 days"

    // Reasoning
    reasons: string[];
    strengths: string[];
    considerations: string[];

    // Rank
    rank: number;
}

/**
 * Pre-qualification options
 */
export interface PreQualificationOptions {
    includeRiskAssessment?: boolean;
    maxPartners?: number; // Max partners to recommend (default: 5)
    minApprovalProbability?: number; // Min threshold (default: 50)
    preferredPartners?: string[]; // User preferences
    excludePartners?: string[]; // Partners to exclude
}

/**
 * Partner approval score
 */
export interface PartnerApprovalScore {
    partnerId: string;
    partnerName: string;
    approvalProbability: number;
    estimatedRate: number;
    factors: DecisionFactor[];
}
