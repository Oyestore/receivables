/**
 * AI Behavioral Analytics Enums
 * Shared enumerations for customer segmentation, behavioral analysis, and AI processing
 */

export enum SegmentationMethod {
    K_MEANS = 'K_MEANS',
    HIERARCHICAL = 'HIERARCHICAL',
    DBSCAN = 'DBSCAN',
    GAUSSIAN_MIXTURE = 'GAUSSIAN_MIXTURE',
    RULE_BASED = 'RULE_BASED',
    HYBRID = 'HYBRID'
}

export enum CustomerSegmentType {
    HIGH_VALUE = 'HIGH_VALUE',
    MEDIUM_VALUE = 'MEDIUM_VALUE',
    LOW_VALUE = 'LOW_VALUE',
    PREMIUM = 'PREMIUM',
    STANDARD = 'STANDARD',
    AT_RISK = 'AT_RISK',
    CHURNED = 'CHURNED',
    NEW = 'NEW',
    GROWTH_POTENTIAL = 'GROWTH_POTENTIAL'
}

export enum CustomerBehaviorCategory {
    PAYMENT_BEHAVIOR = 'PAYMENT_BEHAVIOR',
    TRANSACTION_BEHAVIOR = 'TRANSACTION_BEHAVIOR',
    COMMUNICATION_BEHAVIOR = 'COMMUNICATION_BEHAVIOR',
    ENGAGEMENT_BEHAVIOR = 'ENGAGEMENT_BEHAVIOR',
    RISK_BEHAVIOR = 'RISK_BEHAVIOR'
}

export enum PredictionConfidence {
    VERY_HIGH = 'VERY_HIGH',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
    VERY_LOW = 'VERY_LOW'
}

export enum DataQualityLevel {
    EXCELLENT = 'EXCELLENT',
    GOOD = 'GOOD',
    FAIR = 'FAIR',
    POOR = 'POOR',
    INSUFFICIENT = 'INSUFFICIENT'
}

export enum PersonalizationLevel {
    NONE = 'NONE',
    BASIC = 'BASIC',
    STANDARD = 'STANDARD',
    ADVANCED = 'ADVANCED',
    HYPER_PERSONALIZED = 'HYPER_PERSONALIZED'
}

export enum AIProcessingStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum LearningAlgorithmType {
    SUPERVISED = 'SUPERVISED',
    UNSUPERVISED = 'UNSUPERVISED',
    REINFORCEMENT = 'REINFORCEMENT',
    SEMI_SUPERVISED = 'SEMI_SUPERVISED',
    DEEP_LEARNING = 'DEEP_LEARNING'
}
