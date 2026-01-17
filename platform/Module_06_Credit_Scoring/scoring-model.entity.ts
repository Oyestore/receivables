import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';

export enum ModelType {
  LINEAR_REGRESSION = 'linear_regression',
  LOGISTIC_REGRESSION = 'logistic_regression',
  DECISION_TREE = 'decision_tree',
  RANDOM_FOREST = 'random_forest',
  GRADIENT_BOOSTING = 'gradient_boosting',
  NEURAL_NETWORK = 'neural_network',
  ENSEMBLE = 'ensemble',
  CUSTOM = 'custom'
}

export enum ModelStatus {
  TRAINING = 'training',
  TRAINED = 'trained',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  DEPLOYED = 'deployed',
  DEPRECATED = 'deprecated',
  FAILED = 'failed'
}

export enum ModelCategory {
  CREDIT_SCORING = 'credit_scoring',
  RISK_ASSESSMENT = 'risk_assessment',
  PAYMENT_PREDICTION = 'payment_prediction',
  FRAUD_DETECTION = 'fraud_detection',
  DEFAULT_PREDICTION = 'default_prediction',
  BEHAVIOR_ANALYSIS = 'behavior_analysis'
}

export enum ModelVersion {
  V1_0 = '1.0',
  V1_1 = '1.1',
  V1_2 = '1.2',
  V2_0 = '2.0',
  V2_1 = '2.1',
  V3_0 = '3.0'
}

@Entity('scoring_models')
export class ScoringModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ModelType,
    default: ModelType.LINEAR_REGRESSION
  })
  modelType: ModelType;

  @Column({
    type: 'enum',
    enum: ModelCategory,
    default: ModelCategory.CREDIT_SCORING
  })
  category: ModelCategory;

  @Column({
    type: 'enum',
    enum: ModelStatus,
    default: ModelStatus.TRAINING
  })
  status: ModelStatus;

  @Column({
    type: 'enum',
    enum: ModelVersion,
    default: ModelVersion.V1_0
  })
  version: ModelVersion;

  @Column({ type: 'jsonb', default: {} })
  features: Array<{
    name: string;
    type: 'numerical' | 'categorical' | 'text' | 'boolean';
    importance: number;
    description: string;
    required: boolean;
    defaultValue?: any;
    validationRules?: Record<string, any>;
  }>;

  @Column({ type: 'jsonb', default: {} })
  hyperparameters: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  trainingConfig: {
    algorithm: string;
    parameters: Record<string, any>;
    crossValidation: boolean;
    cvFolds: number;
    randomSeed: number;
    maxIterations: number;
    convergenceThreshold: number;
  };

  @Column({ type: 'jsonb', default: {} })
  trainingData: {
    source: string;
    size: number;
    features: string[];
    target: string;
    preprocessing: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    splitRatio: {
      training: number;
      validation: number;
      testing: number;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  performanceMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    aucRoc: number;
    confusionMatrix: number[][];
    calibrationScore: number;
    ksStatistic: number;
    giniCoefficient: number;
  };

  @Column({ type: 'jsonb', default: {} })
  validationResults: {
    validationSet: {
      size: number;
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    crossValidation: {
      meanAccuracy: number;
      stdAccuracy: number;
      meanPrecision: number;
      stdPrecision: number;
      meanRecall: number;
      stdRecall: number;
    };
    outOfSample: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  modelArtifacts: {
    modelFile: string;
    weightsFile: string;
    configFile: string;
    preprocessingFile: string;
    metadataFile: string;
    checksum: string;
  };

  @Column({ type: 'jsonb', default: {} })
  featureImportance: Array<{
    feature: string;
    importance: number;
    rank: number;
    contribution: number;
  }>;

  @Column({ type: 'jsonb', default: {} })
  thresholds: {
    default: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    optimal: number;
    custom: Record<string, number>;
  };

  @Column({ type: 'jsonb', default: {} })
  calibration: {
    method: string;
    parameters: Record<string, any>;
    calibrationCurve: Array<{
      predicted: number;
      actual: number;
      sampleSize: number;
    }>;
    brierScore: number;
  };

  @Column({ type: 'jsonb', default: {} })
  explainability: {
    method: string;
    globalExplanations: Record<string, number>;
    localExplanations: Array<{
      feature: string;
      contribution: number;
      direction: 'positive' | 'negative';
    }>;
    shapValues: Record<string, number>;
  };

  @Column({ type: 'jsonb', default: {} })
  monitoring: {
    driftDetection: {
      enabled: boolean;
      threshold: number;
      lastCheck: Date;
      driftDetected: boolean;
    };
    performanceMonitoring: {
      enabled: boolean;
      windowSize: number;
      alertThreshold: number;
      lastCheck: Date;
    };
    dataQuality: {
      enabled: boolean;
      checks: Array<{
        type: string;
        threshold: number;
        status: 'pass' | 'fail' | 'warning';
      }>;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  deployment: {
    environment: 'development' | 'staging' | 'production';
    endpoint: string;
    apiVersion: string;
    scaling: {
      minInstances: number;
      maxInstances: number;
      targetCpuUtilization: number;
    };
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  governance: {
    owner: string;
    approver: string;
    reviewDate: Date;
    nextReviewDate: Date;
    complianceChecks: Array<{
      check: string;
      status: 'pass' | 'fail' | 'pending';
      evidence: string;
    }>;
    riskLevel: 'low' | 'medium' | 'high';
    dataPrivacy: {
      personalData: boolean;
      sensitiveData: boolean;
      consentRequired: boolean;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  usage: {
    totalPredictions: number;
    dailyPredictions: number;
    averageResponseTime: number;
    errorRate: number;
    lastUsed: Date;
    topUsers: Array<{
      userId: string;
      usageCount: number;
      lastUsed: Date;
    }>;
  };

  @Column({ type: 'jsonb', default: {} })
  auditTrail: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    changes: Record<string, any>;
    reason?: string;
    version: string;
  }>;

  @Column({ name: 'parent_model_id', type: 'varchar', length: 255, nullable: true })
  parentModelId: string;

  @ManyToOne(() => ScoringModel, { nullable: true })
  @JoinColumn({ name: 'parent_model_id' })
  parentModel: ScoringModel;

  @OneToMany(() => ScoringModel, model => model.parentModel)
  childModels: ScoringModel[];

  @Column({ name: 'buyer_profile_id', type: 'varchar', length: 255, nullable: true })
  buyerProfileId: string;

  @ManyToOne(() => BuyerProfile, { nullable: true })
  @JoinColumn({ name: 'buyer_profile_id' })
  buyerProfile: BuyerProfile;

  @OneToMany(() => CreditAssessment, assessment => assessment.model)
  creditAssessments: CreditAssessment[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    tags: string[];
    labels: Record<string, string>;
    documentation: string;
    examples: Array<{
      description: string;
      input: Record<string, any>;
      output: any;
    }>;
    references: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string;
}
