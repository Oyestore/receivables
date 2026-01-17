import {
  PredictionConfidence,
  DataQualityLevel,
  AIProcessingStatus,
  LearningAlgorithmType,
  AIModelType,
  PredictionAccuracy
} from '../../shared/enums/ai-behavioral-analytics.enum';
import {
  PredictionModelInterface,
  MLModelConfigurationInterface
} from '../../shared/interfaces/ai-behavioral-analytics.interface';

/**
 * Payment Success Prediction Entity
 * Comprehensive payment success prediction with ML models and confidence scoring
 */
export class PaymentSuccessPrediction {
  public id: string;
  public tenantId: string;
  public customerId: string;
  public invoiceId?: string;
  public predictionType: 'SUCCESS_PROBABILITY' | 'TIMING_PREDICTION' | 'AMOUNT_PREDICTION' | 'METHOD_PREDICTION';
  public modelVersion: string;
  public algorithmUsed: LearningAlgorithmType;
  public aiModelType: AIModelType;
  public predictionDetails: {
    successProbability: {
      probability: number; // 0-100
      confidence: PredictionConfidence;
      factors: Array<{
        factor: string;
        impact: number; // -100 to +100
        weight: number;
        description: string;
      }>;
      riskFactors: Array<{
        risk: string;
        severity: number; // 0-100
        mitigation: string;
      }>;
    };
    timingPrediction: {
      predictedPaymentDate: Date;
      earliestExpectedDate: Date;
      latestExpectedDate: Date;
      delayProbability: number;
      expectedDelayDays: number;
      confidence: PredictionConfidence;
      seasonalFactors: Record<string, number>;
      behavioralFactors: Record<string, number>;
    };
    amountPrediction: {
      predictedAmount: number;
      minimumExpectedAmount: number;
      maximumExpectedAmount: number;
      partialPaymentProbability: number;
      fullPaymentProbability: number;
      confidence: PredictionConfidence;
      historicalVariance: number;
      amountFactors: Array<{
        factor: string;
        influence: number;
        description: string;
      }>;
    };
    methodPrediction: {
      recommendedMethods: Array<{
        method: string;
        probability: number;
        successRate: number;
        averageProcessingTime: number;
        fees: number;
        userPreference: number;
      }>;
      primaryMethod: string;
      fallbackMethods: string[];
      confidence: PredictionConfidence;
    };
  };
  public inputFeatures: {
    customerFeatures: {
      paymentHistory: {
        onTimePaymentRate: number;
        averageDelayDays: number;
        totalTransactions: number;
        successfulTransactions: number;
        failedTransactions: number;
        disputedTransactions: number;
      };
      behavioralFeatures: {
        communicationResponseRate: number;
        engagementScore: number;
        digitalAdoptionScore: number;
        seasonalityIndex: number;
        riskScore: number;
      };
      demographicFeatures: {
        businessAge: number;
        industryType: string;
        companySize: string;
        geographicRegion: string;
        creditRating?: string;
      };
      transactionalFeatures: {
        averageTransactionAmount: number;
        transactionFrequency: string;
        lifetimeValue: number;
        recentTransactionTrend: number;
        seasonalVariation: number;
      };
    };
    contextualFeatures: {
      invoiceFeatures?: {
        amount: number;
        dueDate: Date;
        invoiceAge: number;
        paymentTerms: string;
        currency: string;
        priority: string;
      };
      marketFeatures: {
        economicIndicators: Record<string, number>;
        industryTrends: Record<string, number>;
        seasonalFactors: Record<string, number>;
        competitiveFactors: Record<string, number>;
      };
      temporalFeatures: {
        dayOfWeek: number;
        monthOfYear: number;
        quarterOfYear: number;
        holidayProximity: number;
        businessCyclePhase: string;
      };
    };
  };
  public modelPerformance: {
    accuracy: PredictionAccuracy;
    precision: number;
    recall: number;
    f1Score: number;
    areaUnderCurve: number;
    confidenceCalibration: number;
    featureImportance: Record<string, number>;
    modelStability: number;
    predictionLatency: number; // in milliseconds
  };
  public validationMetrics: {
    crossValidationScore: number;
    holdoutTestScore: number;
    temporalValidationScore: number;
    businessValidationScore: number;
    statisticalSignificance: number;
    predictionInterval: {
      lower: number;
      upper: number;
      confidence: number;
    };
  };
  public explanations: {
    primaryDrivers: Array<{
      driver: string;
      impact: number;
      explanation: string;
      actionable: boolean;
    }>;
    scenarioAnalysis: Array<{
      scenario: string;
      probability: number;
      outcome: string;
      recommendations: string[];
    }>;
    sensitivityAnalysis: Array<{
      feature: string;
      sensitivity: number;
      threshold: number;
      impact: string;
    }>;
    counterfactualExplanations: Array<{
      originalPrediction: number;
      modifiedFeatures: Record<string, any>;
      newPrediction: number;
      explanation: string;
    }>;
  };
  public recommendations: {
    actionableInsights: Array<{
      insight: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      effort: 'LOW' | 'MEDIUM' | 'HIGH';
      impact: number;
      timeline: string;
      successMetrics: string[];
    }>;
    riskMitigation: Array<{
      risk: string;
      mitigation: string;
      cost: number;
      effectiveness: number;
    }>;
    optimizationOpportunities: Array<{
      opportunity: string;
      potentialImprovement: number;
      implementation: string;
      resources: string[];
    }>;
  };
  public predictionHistory: Array<{
    timestamp: Date;
    prediction: any;
    actualOutcome?: any;
    accuracy?: number;
    learningFeedback?: string;
  }>;
  public dataQuality: {
    completeness: number;
    consistency: number;
    accuracy: number;
    timeliness: number;
    relevance: number;
    overallQuality: DataQualityLevel;
    qualityIssues: string[];
  };
  public processingMetadata: {
    processingTime: number;
    computeResources: {
      cpuUsage: number;
      memoryUsage: number;
      gpuUsage?: number;
    };
    modelLoadTime: number;
    featureExtractionTime: number;
    predictionTime: number;
    postProcessingTime: number;
  };
  public createdAt: Date;
  public updatedAt: Date;
  public expiresAt: Date;
  public status: AIProcessingStatus;
  public metadata: Record<string, any>;

  constructor(data: Partial<PaymentSuccessPrediction>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.customerId = data.customerId || '';
    this.invoiceId = data.invoiceId;
    this.predictionType = data.predictionType || 'SUCCESS_PROBABILITY';
    this.modelVersion = data.modelVersion || '1.0.0';
    this.algorithmUsed = data.algorithmUsed || LearningAlgorithmType.RANDOM_FOREST;
    this.aiModelType = data.aiModelType || AIModelType.DEEPSEEK_R1;
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
    this.status = data.status || AIProcessingStatus.PENDING;
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `pred_${this.predictionType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private getDefaultPredictionDetails(): any {
    return {
      successProbability: {
        probability: 0,
        confidence: PredictionConfidence.LOW,
        factors: [],
        riskFactors: []
      },
      timingPrediction: {
        predictedPaymentDate: new Date(),
        earliestExpectedDate: new Date(),
        latestExpectedDate: new Date(),
        delayProbability: 0,
        expectedDelayDays: 0,
        confidence: PredictionConfidence.LOW,
        seasonalFactors: {},
        behavioralFactors: {}
      },
      amountPrediction: {
        predictedAmount: 0,
        minimumExpectedAmount: 0,
        maximumExpectedAmount: 0,
        partialPaymentProbability: 0,
        fullPaymentProbability: 0,
        confidence: PredictionConfidence.LOW,
        historicalVariance: 0,
        amountFactors: []
      },
      methodPrediction: {
        recommendedMethods: [],
        primaryMethod: '',
        fallbackMethods: [],
        confidence: PredictionConfidence.LOW
      }
    };
  }

  private getDefaultInputFeatures(): any {
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

  private getDefaultModelPerformance(): any {
    return {
      accuracy: PredictionAccuracy.FAIR,
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

  private getDefaultValidationMetrics(): any {
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

  private getDefaultExplanations(): any {
    return {
      primaryDrivers: [],
      scenarioAnalysis: [],
      sensitivityAnalysis: [],
      counterfactualExplanations: []
    };
  }

  private getDefaultRecommendations(): any {
    return {
      actionableInsights: [],
      riskMitigation: [],
      optimizationOpportunities: []
    };
  }

  private getDefaultDataQuality(): any {
    return {
      completeness: 0,
      consistency: 0,
      accuracy: 0,
      timeliness: 0,
      relevance: 0,
      overallQuality: DataQualityLevel.POOR,
      qualityIssues: []
    };
  }

  private getDefaultProcessingMetadata(): any {
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

  public updatePrediction(
    predictionDetails: Partial<typeof this.predictionDetails>,
    confidence: PredictionConfidence
  ): void {
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
    this.status = AIProcessingStatus.COMPLETED;
  }

  public addActualOutcome(outcome: {
    actualPaymentDate?: Date;
    actualAmount?: number;
    actualMethod?: string;
    paymentSuccess: boolean;
    delayDays?: number;
  }): void {
    if (this.predictionHistory.length > 0) {
      const latestPrediction = this.predictionHistory[this.predictionHistory.length - 1];
      latestPrediction.actualOutcome = outcome;
      
      // Calculate accuracy
      latestPrediction.accuracy = this.calculatePredictionAccuracy(
        latestPrediction.prediction,
        outcome
      );

      // Generate learning feedback
      latestPrediction.learningFeedback = this.generateLearningFeedback(
        latestPrediction.prediction,
        outcome,
        latestPrediction.accuracy
      );
    }

    this.updatedAt = new Date();
  }

  private calculatePredictionAccuracy(prediction: any, outcome: any): number {
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
      const daysDifference = Math.abs(
        (actualDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Accuracy decreases with days difference
      const timingAccuracy = Math.max(0, 100 - (daysDifference * 10));
      accuracyScore += timingAccuracy;
      factors++;
    }

    // Amount accuracy
    if (prediction.amountPrediction && outcome.actualAmount !== undefined) {
      const predictedAmount = prediction.amountPrediction.predictedAmount;
      const actualAmount = outcome.actualAmount;
      const percentageDifference = Math.abs(
        (actualAmount - predictedAmount) / predictedAmount * 100
      );
      
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

  private generateLearningFeedback(prediction: any, outcome: any, accuracy: number): string {
    const feedback: string[] = 
(Content truncated due to size limit. Use line ranges to read in chunks)