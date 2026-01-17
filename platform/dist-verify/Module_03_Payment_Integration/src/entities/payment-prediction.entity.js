"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSuccessPrediction = void 0;
const ai_behavioral_analytics_enum_1 = require("../../shared/enums/ai-behavioral-analytics.enum");
/**
 * Payment Success Prediction Entity
 * Comprehensive payment success prediction with ML models and confidence scoring
 */
class PaymentSuccessPrediction {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.customerId = data.customerId || '';
        this.invoiceId = data.invoiceId;
        this.predictionType = data.predictionType || 'SUCCESS_PROBABILITY';
        this.modelVersion = data.modelVersion || '1.0.0';
        this.algorithmUsed = data.algorithmUsed || ai_behavioral_analytics_enum_1.LearningAlgorithmType.RANDOM_FOREST;
        this.aiModelType = data.aiModelType || ai_behavioral_analytics_enum_1.AIModelType.DEEPSEEK_R1;
        this.predictionDetails = data.predictionDetails || this.getDefaultPredictionDetails();
        this.inputFeatures = data.inputFeatures || this.getDefaultInputFeatures();
        this.modelPerformance = data.modelPerformance || this.getDefaultModelPerformance();
        this.validationMetrics = data.validationMetrics || this.getDefaultValidationMetrics();
        this.explanations = data.explanations || this.getDefaultExplanations();
        this.recommendations = data.recommendations || this.getDefaultRecommendations();
        this.predictionHistory = data.predictionHistory || [];
        this.dataQuality = data.dataQuality || this.getDefaultDataQuality();
        this.processingMetadata = data.processingMetadata || this.getDefaultProcessingMetadata();
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        this.status = data.status || ai_behavioral_analytics_enum_1.AIProcessingStatus.PENDING;
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `pred_${this.predictionType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    getDefaultPredictionDetails() {
        return {
            successProbability: {
                probability: 0,
                confidence: ai_behavioral_analytics_enum_1.PredictionConfidence.LOW,
                factors: [],
                riskFactors: []
            },
            timingPrediction: {
                predictedPaymentDate: new Date(),
                earliestExpectedDate: new Date(),
                latestExpectedDate: new Date(),
                delayProbability: 0,
                expectedDelayDays: 0,
                confidence: ai_behavioral_analytics_enum_1.PredictionConfidence.LOW,
                seasonalFactors: {},
                behavioralFactors: {}
            },
            amountPrediction: {
                predictedAmount: 0,
                minimumExpectedAmount: 0,
                maximumExpectedAmount: 0,
                partialPaymentProbability: 0,
                fullPaymentProbability: 0,
                confidence: ai_behavioral_analytics_enum_1.PredictionConfidence.LOW,
                historicalVariance: 0,
                amountFactors: []
            },
            methodPrediction: {
                recommendedMethods: [],
                primaryMethod: '',
                fallbackMethods: [],
                confidence: ai_behavioral_analytics_enum_1.PredictionConfidence.LOW
            }
        };
    }
    getDefaultInputFeatures() {
        return {
            customerFeatures: {
                paymentHistory: {
                    onTimePaymentRate: 0,
                    averageDelayDays: 0,
                    totalTransactions: 0,
                    successfulTransactions: 0,
                    failedTransactions: 0,
                    disputedTransactions: 0
                },
                behavioralFeatures: {
                    communicationResponseRate: 0,
                    engagementScore: 0,
                    digitalAdoptionScore: 0,
                    seasonalityIndex: 0,
                    riskScore: 0
                },
                demographicFeatures: {
                    businessAge: 0,
                    industryType: '',
                    companySize: '',
                    geographicRegion: '',
                    creditRating: ''
                },
                transactionalFeatures: {
                    averageTransactionAmount: 0,
                    transactionFrequency: '',
                    lifetimeValue: 0,
                    recentTransactionTrend: 0,
                    seasonalVariation: 0
                }
            },
            contextualFeatures: {
                marketFeatures: {
                    economicIndicators: {},
                    industryTrends: {},
                    seasonalFactors: {},
                    competitiveFactors: {}
                },
                temporalFeatures: {
                    dayOfWeek: 0,
                    monthOfYear: 0,
                    quarterOfYear: 0,
                    holidayProximity: 0,
                    businessCyclePhase: ''
                }
            }
        };
    }
    getDefaultModelPerformance() {
        return {
            accuracy: ai_behavioral_analytics_enum_1.PredictionAccuracy.FAIR,
            precision: 0,
            recall: 0,
            f1Score: 0,
            areaUnderCurve: 0,
            confidenceCalibration: 0,
            featureImportance: {},
            modelStability: 0,
            predictionLatency: 0
        };
    }
    getDefaultValidationMetrics() {
        return {
            crossValidationScore: 0,
            holdoutTestScore: 0,
            temporalValidationScore: 0,
            businessValidationScore: 0,
            statisticalSignificance: 0,
            predictionInterval: {
                lower: 0,
                upper: 0,
                confidence: 0
            }
        };
    }
    getDefaultExplanations() {
        return {
            primaryDrivers: [],
            scenarioAnalysis: [],
            sensitivityAnalysis: [],
            counterfactualExplanations: []
        };
    }
    getDefaultRecommendations() {
        return {
            actionableInsights: [],
            riskMitigation: [],
            optimizationOpportunities: []
        };
    }
    getDefaultDataQuality() {
        return {
            completeness: 0,
            consistency: 0,
            accuracy: 0,
            timeliness: 0,
            relevance: 0,
            overallQuality: ai_behavioral_analytics_enum_1.DataQualityLevel.POOR,
            qualityIssues: []
        };
    }
    getDefaultProcessingMetadata() {
        return {
            processingTime: 0,
            computeResources: {
                cpuUsage: 0,
                memoryUsage: 0,
                gpuUsage: 0
            },
            modelLoadTime: 0,
            featureExtractionTime: 0,
            predictionTime: 0,
            postProcessingTime: 0
        };
    }
    updatePrediction(predictionDetails, confidence) {
        // Store previous prediction in history
        this.predictionHistory.push({
            timestamp: new Date(),
            prediction: { ...this.predictionDetails }
        });
        // Update prediction details
        Object.assign(this.predictionDetails, predictionDetails);
        // Update confidence levels
        if (this.predictionDetails.successProbability) {
            this.predictionDetails.successProbability.confidence = confidence;
        }
        if (this.predictionDetails.timingPrediction) {
            this.predictionDetails.timingPrediction.confidence = confidence;
        }
        if (this.predictionDetails.amountPrediction) {
            this.predictionDetails.amountPrediction.confidence = confidence;
        }
        if (this.predictionDetails.methodPrediction) {
            this.predictionDetails.methodPrediction.confidence = confidence;
        }
        this.updatedAt = new Date();
        this.status = ai_behavioral_analytics_enum_1.AIProcessingStatus.COMPLETED;
    }
    addActualOutcome(outcome) {
        if (this.predictionHistory.length > 0) {
            const latestPrediction = this.predictionHistory[this.predictionHistory.length - 1];
            latestPrediction.actualOutcome = outcome;
            // Calculate accuracy
            latestPrediction.accuracy = this.calculatePredictionAccuracy(latestPrediction.prediction, outcome);
            // Generate learning feedback
            latestPrediction.learningFeedback = this.generateLearningFeedback(latestPrediction.prediction, outcome, latestPrediction.accuracy);
        }
        this.updatedAt = new Date();
    }
    calculatePredictionAccuracy(prediction, outcome) {
        let accuracyScore = 0;
        let factors = 0;
        // Success probability accuracy
        if (prediction.successProbability && outcome.paymentSuccess !== undefined) {
            const predictedSuccess = prediction.successProbability.probability > 50;
            const actualSuccess = outcome.paymentSuccess;
            accuracyScore += predictedSuccess === actualSuccess ? 100 : 0;
            factors++;
        }
        // Timing accuracy
        if (prediction.timingPrediction && outcome.actualPaymentDate) {
            const predictedDate = new Date(prediction.timingPrediction.predictedPaymentDate);
            const actualDate = new Date(outcome.actualPaymentDate);
            const daysDifference = Math.abs((actualDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24));
            // Accuracy decreases with days difference
            const timingAccuracy = Math.max(0, 100 - (daysDifference * 10));
            accuracyScore += timingAccuracy;
            factors++;
        }
        // Amount accuracy
        if (prediction.amountPrediction && outcome.actualAmount !== undefined) {
            const predictedAmount = prediction.amountPrediction.predictedAmount;
            const actualAmount = outcome.actualAmount;
            const percentageDifference = Math.abs((actualAmount - predictedAmount) / predictedAmount * 100);
            // Accuracy decreases with percentage difference
            const amountAccuracy = Math.max(0, 100 - percentageDifference);
            accuracyScore += amountAccuracy;
            factors++;
        }
        // Method accuracy
        if (prediction.methodPrediction && outcome.actualMethod) {
            const predictedMethod = prediction.methodPrediction.primaryMethod;
            const actualMethod = outcome.actualMethod;
            accuracyScore += predictedMethod === actualMethod ? 100 : 0;
            factors++;
        }
        return factors > 0 ? accuracyScore / factors : 0;
    }
    generateLearningFeedback(prediction, outcome, accuracy) {
        const feedback = (Content), truncated, due, to, size, limit, Use, line, ranges, to, read;
         in chunks;
    }
}
exports.PaymentSuccessPrediction = PaymentSuccessPrediction;
//# sourceMappingURL=payment-prediction.entity.js.map