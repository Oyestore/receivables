"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerSegment = void 0;
const ai_behavioral_analytics_enum_1 = require("../../shared/enums/ai-behavioral-analytics.enum");
/**
 * Customer Segment Entity
 * Represents a customer segment with dynamic characteristics and strategies
 */
class CustomerSegment {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.segmentName = data.segmentName || '';
        this.segmentType = data.segmentType || ai_behavioral_analytics_enum_1.CustomerSegmentType.MEDIUM_VALUE;
        this.method = data.method || ai_behavioral_analytics_enum_1.SegmentationMethod.K_MEANS;
        this.description = data.description || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.segmentCriteria = data.segmentCriteria || this.getDefaultCriteria();
        this.segmentCharacteristics = data.segmentCharacteristics || this.getDefaultCharacteristics();
        this.segmentStrategies = data.segmentStrategies || this.getDefaultStrategies();
        this.segmentPerformance = data.segmentPerformance || this.getDefaultPerformance();
        this.clusteringMetrics = data.clusteringMetrics || this.getDefaultClusteringMetrics();
        this.membershipCriteria = data.membershipCriteria || this.getDefaultMembershipCriteria();
        this.dynamicUpdates = data.dynamicUpdates || {
            lastUpdated: new Date(),
            updateFrequency: 'weekly',
            autoUpdate: true,
            triggerConditions: ['significant_behavior_change', 'performance_threshold'],
            membershipChanges: []
        };
        this.validation = data.validation || this.getDefaultValidation();
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.createdBy = data.createdBy || '';
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `seg_${this.segmentType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    getDefaultCriteria() {
        return {
            behavioralCriteria: {
                paymentBehavior: {
                    onTimePaymentRate: { min: 0, max: 100 },
                    averageDelayDays: { min: 0, max: 365 },
                    paymentMethodPreferences: []
                },
                transactionBehavior: {
                    averageAmount: { min: 0, max: 1000000 },
                    frequency: [],
                    seasonality: {}
                },
                communicationBehavior: {
                    responseRate: { min: 0, max: 100 },
                    preferredChannels: [],
                    engagementScore: { min: 0, max: 100 }
                },
                riskProfile: {
                    overallRiskScore: { min: 0, max: 100 },
                    riskCategories: []
                }
            },
            demographicCriteria: {
                businessType: [],
                industry: [],
                companySize: [],
                geographicRegion: [],
                registrationAge: { min: 0, max: 120 }
            },
            transactionalCriteria: {
                totalTransactionValue: { min: 0, max: 10000000 },
                transactionCount: { min: 0, max: 1000 },
                averageTransactionSize: { min: 0, max: 1000000 },
                lifetimeValue: { min: 0, max: 10000000 }
            },
            temporalCriteria: {
                customerAge: { min: 0, max: 120 },
                lastActivityDays: { min: 0, max: 365 },
                seasonalActivity: {}
            }
        };
    }
    getDefaultCharacteristics() {
        return {
            size: 0,
            averageTransactionValue: 0,
            paymentFrequency: 'unknown',
            preferredMethods: [],
            riskLevel: 'medium',
            lifetimeValue: 0,
            churnProbability: 0,
            growthPotential: 0,
            profitability: 0,
            engagementLevel: 'medium',
            digitalAdoption: 0,
            seasonalityIndex: 0
        };
    }
    getDefaultStrategies() {
        return {
            communicationStrategy: {
                preferredChannels: [],
                messageFrequency: 'weekly',
                contentType: 'standard',
                personalizationLevel: ai_behavioral_analytics_enum_1.PersonalizationLevel.BASIC,
                optimalTiming: {}
            },
            paymentStrategy: {
                recommendedMethods: [],
                incentiveStructure: {},
                reminderSchedule: [],
                flexibilityOptions: []
            },
            engagementStrategy: {
                touchpointFrequency: 'monthly',
                contentStrategy: 'standard',
                rewardPrograms: [],
                feedbackMechanisms: []
            },
            riskMitigationStrategy: {
                monitoringLevel: 'standard',
                interventionTriggers: [],
                escalationProcedures: [],
                preventiveMeasures: []
            },
            retentionStrategy: {
                loyaltyPrograms: [],
                valueAddedServices: [],
                relationshipBuilding: [],
                churnPrevention: []
            }
        };
    }
    getDefaultPerformance() {
        return {
            conversionRate: 0,
            averageResponseTime: 0,
            satisfactionScore: 0,
            retentionRate: 0,
            upsellSuccess: 0,
            crossSellSuccess: 0,
            costPerAcquisition: 0,
            revenuePerCustomer: 0,
            profitMargin: 0,
            npsScore: 0
        };
    }
    getDefaultClusteringMetrics() {
        return {
            silhouetteScore: 0,
            inertia: 0,
            cohesion: 0,
            separation: 0,
            stability: 0,
            interpretability: 0
        };
    }
    getDefaultMembershipCriteria() {
        return {
            strictCriteria: {},
            softCriteria: {},
            weightedScoring: {},
            membershipThreshold: 0.7,
            fuzzyMembership: false
        };
    }
    getDefaultValidation() {
        return {
            statisticalSignificance: 0,
            businessRelevance: 0,
            actionability: 0,
            stability: 0,
            interpretability: 0,
            overallQuality: 0
        };
    }
    evaluateCustomerMembership(customerProfile) {
        let score = 0;
        let totalWeight = 0;
        const reasons = [];
        // Evaluate behavioral criteria
        const behavioralScore = this.evaluateBehavioralCriteria(customerProfile);
        score += behavioralScore.score * 0.4;
        totalWeight += 0.4;
        reasons.push(...behavioralScore.reasons);
        // Evaluate demographic criteria
        const demographicScore = this.evaluateDemographicCriteria(customerProfile);
        score += demographicScore.score * 0.2;
        totalWeight += 0.2;
        reasons.push(...demographicScore.reasons);
        // Evaluate transactional criteria
        const transactionalScore = this.evaluateTransactionalCriteria(customerProfile);
        score += transactionalScore.score * 0.3;
        totalWeight += 0.3;
        reasons.push(...transactionalScore.reasons);
        // Evaluate temporal criteria
        const temporalScore = this.evaluateTemporalCriteria(customerProfile);
        score += temporalScore.score * 0.1;
        totalWeight += 0.1;
        reasons.push(...temporalScore.reasons);
        const membershipScore = totalWeight > 0 ? score / totalWeight : 0;
        const isMember = membershipScore >= this.membershipCriteria.membershipThreshold;
        let confidence;
        if (membershipScore >= 0.9)
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.VERY_HIGH;
        else if (membershipScore >= 0.8)
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.HIGH;
        else if (membershipScore >= 0.6)
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.MEDIUM;
        else if (membershipScore >= 0.4)
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.LOW;
        else
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.VERY_LOW;
        return {
            isMember,
            membershipScore,
            confidence,
            reasons
        };
    }
    evaluateBehavioralCriteria(customerProfile) {
        let score = 0;
        let factors = 0;
        const reasons = [];
        const criteria = this.segmentCriteria.behavioralCriteria;
        // Payment behavior
        if (customerProfile.paymentBehavior) {
            const paymentScore = this.evaluateRange(customerProfile.paymentBehavior.onTimePaymentRate, criteria.paymentBehavior.onTimePaymentRate);
            score += paymentScore;
            factors++;
            if (paymentScore > 0.7)
                reasons.push('Strong payment behavior match');
        }
        // Transaction behavior
        if (customerProfile.transactionBehavior) {
            const transactionScore = this.evaluateRange(customerProfile.transactionBehavior.averageAmount, criteria.transactionBehavior.averageAmount);
            score += transactionScore;
            factors++;
            if (transactionScore > 0.7)
                reasons.push('Transaction behavior aligns with segment');
        }
        // Communication behavior
        if (customerProfile.communicationBehavior) {
            const communicationScore = this.evaluateRange(customerProfile.communicationBehavior.responseRate, criteria.communicationBehavior.responseRate);
            score += communicationScore;
            factors++;
            if (communicationScore > 0.7)
                reasons.push('Communication patterns match segment');
        }
        return {
            score: factors > 0 ? score / factors : 0,
            reasons
        };
    }
    evaluateDemographicCriteria(customerProfile) {
        let score = 0;
        let factors = 0;
        const reasons = [];
        const criteria = this.segmentCriteria.demographicCriteria;
        // Business type
        if (customerProfile.businessType && criteria.businessType.length > 0) {
            if (criteria.businessType.includes(customerProfile.businessType)) {
                score += 1;
                reasons.push(`Business type ${customerProfile.businessType} matches segment`);
            }
            factors++;
        }
        // Industry
        if (customerProfile.industry && criteria.industry.length > 0) {
            if (criteria.industry.includes(customerProfile.industry)) {
                score += 1;
                reasons.push(`Industry ${customerProfile.industry} matches segment`);
            }
            factors++;
        }
        // Geographic region
        if (customerProfile.geographicRegion && criteria.geographicRegion.length > 0) {
            if (criteria.geographicRegion.includes(customerProfile.geographicRegion)) {
                score += 1;
                reasons.push(`Geographic region matches segment`);
            }
            factors++;
        }
        return {
            score: factors > 0 ? score / factors : 0,
            reasons
        };
    }
    evaluateTransactionalCriteria(customerProfile) {
        let score = 0;
        let factors = 0;
        const reasons = [];
        const criteria = this.segmentCriteria.transactionalCriteria;
        // Total transaction value
        if (customerProfile.totalTransactionValue !== undefined) {
            const valueScore = this.evaluateRange(customerProfile.totalTransactionValue, criteria.totalTransactionValue);
            score += valueScore;
            factors++;
            if (valueScore > 0.7)
                reasons.push('Transaction value aligns with segment');
        }
        // Transaction count
        if (customerProfile.transactionCount !== undefined) {
            const countScore = this.evaluateRange(customerProfile.transactionCount, criteria.transactionCount);
            score += countScore;
            factors++;
            if (countScore > 0.7)
                reasons.push('Transaction frequency matches segment');
        }
        // Lifetime value
        if (customerProfile.lifetimeValue !== undefined) {
            const ltvScore = this.evaluateRange(customerProfile.lifetimeValue, criteria.lifetimeValue);
            score += ltvScore;
            factors++;
            if (ltvScore > 0.7)
                reasons.push('Lifetime value fits segment profile');
        }
        return {
            score: factors > 0 ? score / factors : 0(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks)
        };
    }
}
exports.CustomerSegment = CustomerSegment;
//# sourceMappingURL=customer-segmentation.entity.js.map