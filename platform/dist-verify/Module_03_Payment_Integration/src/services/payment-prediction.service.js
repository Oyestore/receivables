"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentPredictionService = void 0;
const ai_behavioral_analytics_enum_1 = require("../../shared/enums/ai-behavioral-analytics.enum");
const payment_prediction_entity_1 = require("../entities/payment-prediction.entity");
const logger_util_1 = require("../../shared/utils/logger.util");
/**
 * Payment Prediction Service
 * Comprehensive service for ML-based payment success prediction and optimization
 */
class PaymentPredictionService {
    constructor() {
        this.predictions = new Map();
        this.models = new Map();
        this.predictionQueue = [];
        this.modelTrainingQueue = [];
        this.logger = new logger_util_1.Logger('PaymentPredictionService');
        this.initializeDefaultModels();
        this.startPredictionProcessor();
        this.startModelTrainingProcessor();
        this.startModelMonitor();
        this.startPredictionValidator();
    }
    /**
     * Initialize default ML models for payment prediction
     */
    initializeDefaultModels() {
        const defaultModels = [
            {
                modelName: 'Payment Success Predictor',
                modelType: ai_behavioral_analytics_enum_1.AIModelType.DEEPSEEK_R1,
                algorithmType: ai_behavioral_analytics_enum_1.LearningAlgorithmType.RANDOM_FOREST,
                version: '1.0.0',
                modelParameters: {
                    hyperparameters: {
                        n_estimators: 100,
                        max_depth: 10,
                        min_samples_split: 5,
                        min_samples_leaf: 2,
                        random_state: 42
                    },
                    featureSelection: {
                        selectedFeatures: [
                            'onTimePaymentRate',
                            'averageDelayDays',
                            'totalTransactions',
                            'communicationResponseRate',
                            'engagementScore',
                            'digitalAdoptionScore',
                            'riskScore',
                            'averageTransactionAmount',
                            'lifetimeValue',
                            'seasonalityIndex',
                            'businessAge',
                            'industryType',
                            'companySize',
                            'geographicRegion'
                        ],
                        featureImportance: {
                            'onTimePaymentRate': 0.25,
                            'averageDelayDays': 0.20,
                            'riskScore': 0.15,
                            'communicationResponseRate': 0.12,
                            'lifetimeValue': 0.10,
                            'engagementScore': 0.08,
                            'digitalAdoptionScore': 0.05,
                            'seasonalityIndex': 0.05
                        }
                    },
                    trainingConfiguration: {
                        trainingDataSize: 10000,
                        validationSplit: 0.2,
                        testSplit: 0.1,
                        crossValidationFolds: 5
                    }
                },
                dataRequirements: {
                    minimumDataSize: 1000,
                    requiredFeatures: [
                        'onTimePaymentRate',
                        'averageDelayDays',
                        'riskScore',
                        'communicationResponseRate'
                    ],
                    dataQualityThresholds: {
                        completeness: 0.9,
                        consistency: 0.85,
                        accuracy: 0.9,
                        timeliness: 0.8
                    }
                }
            },
            {
                modelName: 'Payment Timing Predictor',
                modelType: ai_behavioral_analytics_enum_1.AIModelType.DEEPSEEK_R1,
                algorithmType: ai_behavioral_analytics_enum_1.LearningAlgorithmType.GRADIENT_BOOSTING,
                version: '1.0.0',
                modelParameters: {
                    hyperparameters: {
                        n_estimators: 150,
                        learning_rate: 0.1,
                        max_depth: 8,
                        subsample: 0.8,
                        random_state: 42
                    },
                    featureSelection: {
                        selectedFeatures: [
                            'averageDelayDays',
                            'paymentTimingPatterns',
                            'seasonalPaymentPatterns',
                            'dayOfWeek',
                            'monthOfYear',
                            'holidayProximity',
                            'businessCyclePhase',
                            'communicationResponseRate',
                            'engagementScore'
                        ],
                        featureImportance: {
                            'averageDelayDays': 0.30,
                            'seasonalPaymentPatterns': 0.20,
                            'paymentTimingPatterns': 0.18,
                            'holidayProximity': 0.12,
                            'businessCyclePhase': 0.10,
                            'communicationResponseRate': 0.10
                        }
                    }
                }
            },
            {
                modelName: 'Payment Amount Predictor',
                modelType: ai_behavioral_analytics_enum_1.AIModelType.DEEPSEEK_R1,
                algorithmType: ai_behavioral_analytics_enum_1.LearningAlgorithmType.NEURAL_NETWORK,
                version: '1.0.0',
                modelParameters: {
                    hyperparameters: {
                        hidden_layers: [128, 64, 32],
                        activation: 'relu',
                        dropout_rate: 0.3,
                        learning_rate: 0.001,
                        batch_size: 32,
                        epochs: 100
                    },
                    modelArchitecture: {
                        layers: [
                            { type: 'dense', units: 128, activation: 'relu', dropout: 0.3 },
                            { type: 'dense', units: 64, activation: 'relu', dropout: 0.2 },
                            { type: 'dense', units: 32, activation: 'relu', dropout: 0.1 },
                            { type: 'dense', units: 1, activation: 'linear' }
                        ],
                        inputShape: [20],
                        outputShape: [1]
                    },
                    featureSelection: {
                        selectedFeatures: [
                            'averageTransactionAmount',
                            'transactionVolatility',
                            'lifetimeValue',
                            'recentTransactionTrend',
                            'seasonalVariation',
                            'invoiceAmount',
                            'paymentTerms',
                            'industryType',
                            'companySize',
                            'economicIndicators'
                        ]
                    }
                }
            }
        ];
        defaultModels.forEach(modelData => {
            const model = new payment_prediction_entity_1.MLModelConfiguration(modelData);
            this.models.set(model.id, model);
        });
        this.logger.info('Default ML models initialized', {
            modelCount: this.models.size,
            models: Array.from(this.models.values()).map(m => ({
                name: m.modelName,
                type: m.modelType,
                algorithm: m.algorithmType
            }))
        });
    }
    /**
     * Generate comprehensive payment prediction
     */
    async generatePaymentPrediction(customerId, tenantId, customerProfile, behaviorAnalysis, options = {}) {
        try {
            this.logger.info('Generating payment prediction', {
                customerId,
                tenantId,
                invoiceId: options.invoiceId,
                predictionTypes: options.predictionTypes
            });
            // Validate input data quality
            const dataQuality = this.assessDataQuality(customerProfile, behaviorAnalysis);
            if (dataQuality.overallQuality === ai_behavioral_analytics_enum_1.DataQualityLevel.POOR) {
                return {
                    success: false,
                    error: `Insufficient data quality for prediction: ${dataQuality.qualityIssues.join(', ')}`
                };
            }
            // Extract features for prediction
            const inputFeatures = this.extractPredictionFeatures(customerProfile, behaviorAnalysis, options);
            // Create prediction entity
            const prediction = new payment_prediction_entity_1.PaymentSuccessPrediction({
                customerId,
                tenantId,
                invoiceId: options.invoiceId,
                predictionType: 'SUCCESS_PROBABILITY',
                inputFeatures,
                dataQuality,
                status: ai_behavioral_analytics_enum_1.AIProcessingStatus.PROCESSING
            });
            // Generate success probability prediction
            const successPrediction = await this.predictPaymentSuccess(inputFeatures);
            // Generate timing prediction
            const timingPrediction = await this.predictPaymentTiming(inputFeatures);
            // Generate amount prediction
            const amountPrediction = await this.predictPaymentAmount(inputFeatures, options.invoiceAmount);
            // Generate method prediction
            const methodPrediction = await this.predictPaymentMethod(inputFeatures, customerProfile);
            // Combine all predictions
            prediction.updatePrediction({
                successProbability: successPrediction,
                timingPrediction: timingPrediction,
                amountPrediction: amountPrediction,
                methodPrediction: methodPrediction
            }, this.calculateOverallConfidence([
                successPrediction.confidence,
                timingPrediction.confidence,
                amountPrediction.confidence,
                methodPrediction.confidence
            ]));
            // Generate explanations
            await this.generatePredictionExplanations(prediction, inputFeatures);
            // Generate recommendations
            await this.generateActionableRecommendations(prediction, customerProfile);
            // Store prediction
            this.predictions.set(prediction.id, prediction);
            this.logger.info('Payment prediction generated successfully', {
                predictionId: prediction.id,
                customerId,
                successProbability: prediction.predictionDetails.successProbability.probability,
                confidence: prediction.getOverallConfidence(),
                processingTime: prediction.processingMetadata.processingTime
            });
            return {
                success: true,
                prediction
            };
        }
        catch (error) {
            this.logger.error('Failed to generate payment prediction', {
                customerId,
                tenantId,
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Predict payment success probability
     */
    async predictPaymentSuccess(inputFeatures) {
        const model = this.getModelByName('Payment Success Predictor');
        if (!model) {
            throw new Error('Payment Success Predictor model not found');
        }
        // Simulate ML model prediction (in production, this would call actual ML model)
        const features = inputFeatures.customerFeatures;
        // Calculate base probability using weighted features
        let probability = 50; // Base probability
        // Payment history impact
        const onTimeRate = features.paymentHistory.onTimePaymentRate;
        probability += (onTimeRate - 50) * 0.8;
        // Risk score impact (inverse)
        const riskScore = features.behavioralFeatures.riskScore;
        probability -= (riskScore - 50) * 0.6;
        // Communication response rate impact
        const responseRate = features.behavioralFeatures.communicationResponseRate;
        probability += (responseRate - 50) * 0.4;
        // Engagement score impact
        const engagementScore = features.behavioralFeatures.engagementScore;
        probability += (engagementScore - 50) * 0.3;
        // Digital adoption impact
        const digitalAdoption = features.behavioralFeatures.digitalAdoptionScore;
        probability += (digitalAdoption - 50) * 0.2;
        // Clamp probability between 0 and 100
        probability = Math.max(0, Math.min(100, probability));
        // Calculate confidence based on data quality and model performance
        let confidence;
        const dataCompleteness = this.calculateFeatureCompleteness(features);
        if (dataCompleteness > 0.9 && probability > 80) {
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.VERY_HIGH;
        }
        else if (dataCompleteness > 0.8 && probability > 60) {
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.HIGH;
        }
        else if (dataCompleteness > 0.7) {
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.MEDIUM;
        }
        else if (dataCompleteness > 0.5) {
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.LOW;
        }
        else {
            confidence = ai_behavioral_analytics_enum_1.PredictionConfidence.VERY_LOW;
        }
        // Identify key factors
        const factors = [
            {
                factor: 'Payment History',
                impact: (onTimeRate - 50) * 0.8,
                weight: 0.25,
                description: `On-time payment rate of ${onTimeRate}% ${onTimeRate > 80 ? 'indicates reliable payment behavior' : 'suggests payment challenges'}`
            },
            {
                factor: 'Risk Profile',
                impact: -(riskScore - 50) * 0.6,
                weight: 0.20,
                description: `Risk score of ${riskScore} ${riskScore < 30 ? 'indicates low risk' : riskScore > 70 ? 'indicates high risk' : 'indicates moderate risk'}`
            },
            {
                factor: 'Communication Engagement',
                impact: (responseRate - 50) * 0.4,
                weight: 0.15,
                description: `Response rate of ${responseRate}% ${responseRate > 70 ? 'shows good engagement' : 'suggests limited engagement'}`
            },
            {
                factor: 'Digital Adoption',
                impact: (digitalAdoption - 50) * 0.2,
                weight: 0.10,
                description: `Digital adoption score of ${digitalAdoption} ${digitalAdoption > 70 ? 'indicates tech-savvy customer' : 'suggests traditional preferences'}`
            }
        ].filter(f => Math.abs(f.impact) > 5); // Only include significant factors
        // Identify risk factors
        const riskFactors = [];
        if (onTimeRate < 60) {
            riskFactors.push({
                risk: 'Poor Payment History',
                severity: 100 - onTimeRate,
                mitigation: 'Implement payment reminders and flexible payment options'
            });
        }
        if (riskScore > 70) {
            riskFactors.push({
                risk: 'High Risk Profile',
                severity: riskScore,
                mitigation: 'Increase monitoring and consider payment guarantees'
            });
        }
        if (responseRate < 40) {
            riskFactors.push({
                risk: 'Poor Communication Engagement',
                severity: 100 - responseRate,
                mitigation: 'Try alternative communication channels and personalized messaging'
            });
        }
        return {
            probability,
            confidence,
            factors,
            riskFactors
        };
    }
    /**
     * Predict payment timing
     */
    async predictPaymentTiming(inputFeatures) {
        const model = this.getModelByName('Payment Timing Predictor');
        if (!model) {
            throw new Error('Payment Timing Predictor model not found');
        }
        const features = inputFeatures.customerFeatures;
        const contextual = inputFeatures.contextualFeatures;
        // Base delay calculation
        const historicalDelay = features.paymentHistory.averageDelayDays;
        let expectedDelay = historicalDelay;
        // Seasonal adjustments
        const currentMonth = new Date().getMonth() + 1;
        const seasonalFactors = {
            'month_effect': this.getSeasonalEffect(currentMonth),
            'quarter_end': this.isQuarterEnd() ? 1.2 : 1.0,
            'holiday_proximity': contextual.temporalFeatures.holidayProximity || 0,
            'business_cycle': this.getBusinessCycleEffect(contextual.temporalFeatures.businessCyclePhase)
        };
        // Apply seasonal adjustments
        expectedDelay *= seasonalFactors.month_effect * seasonalFactors.quarter_end;
        if (seasonalFactors.holiday_proximity > 0.5) {
            expectedDelay += 2; // Additional delay near holidays
        }
        // Behavioral adjustments
        c(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks);
    }
}
exports.PaymentPredictionService = PaymentPredictionService;
//# sourceMappingURL=payment-prediction.service.js.map