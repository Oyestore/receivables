export interface IRiskCategory {
    id: string;
    categoryName: string;
    categoryType: 'operational' | 'financial' | 'security' | 'compliance' | 'strategic' | 'reputational';
    weight: number;
    description?: string;
    isActive: boolean;
}

export interface IRiskAssessment {
    id: string;
    tenantId: string;
    assessmentNumber: string;
    assessmentDate: Date;
    overallRiskScore?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    assessmentType?: 'periodic' | 'triggered' | 'incident' | 'audit';
    assessmentData?: any;
    assessorId?: string;
    assessorName?: string;
    status: 'draft' | 'in_progress' | 'completed' | 'archived';
    completionDate?: Date;
    nextAssessmentDate?: Date;
    notes?: string;
}

export interface IRiskIndicator {
    id: string;
    tenantId?: string;
    categoryId: string;
    indicatorName: string;
    indicatorType?: 'kri' | 'kpi' | 'threshold' | 'trend';
    measurementUnit?: string;
    thresholdValue?: number;
    thresholdOperator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
    currentValue?: number;
    previousValue?: number;
    status: 'normal' | 'warning' | 'critical' | 'unknown';
    calculationFormula?: string;
    collectionFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    lastUpdated: Date;
    isActive: boolean;
}

export interface IRiskEvent {
    id: string;
    tenantId?: string;
    categoryId?: string;
    eventTitle: string;
    eventDescription?: string;
    eventType?: 'incident' | 'near_miss' | 'threat' | 'vulnerability' | 'breach';
    severity: 'low' | 'medium' | 'high' | 'critical';
    impactScore?: number;
    likelihoodScore?: number;
    riskScore?: number;
    eventDate: Date;
    detectionDate?: Date;
    resolutionDate?: Date;
    status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
    affectedSystems?: any;
    financialImpact?: number;
    reportedBy?: string;
    assignedTo?: string;
    rootCause?: string;
    lessonsLearned?: string;
}

export interface IRiskMitigation {
    id: string;
    tenantId?: string;
    assessmentId?: string;
    eventId?: string;
    categoryId?: string;
    riskDescription: string;
    mitigationStrategy: string;
    mitigationType?: 'avoid' | 'transfer' | 'mitigate' | 'accept';
    implementationPlan?: string;
    assignedTo?: string;
    ownerName?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
    startDate?: Date;
    dueDate?: Date;
    completionDate?: Date;
    estimatedCost?: number;
    actualCost?: number;
    effectivenessScore?: number;
    notes?: string;
}

export interface IRiskTrend {
    tenantId: string;
    trendDate: Date;
    overallRiskScore?: number;
    riskLevel?: string;
    categoryScores?: any;
    openEvents: number;
    criticalEvents: number;
    mitigationCompletionRate?: number;
    trendDirection?: 'improving' | 'stable' | 'deteriorating';
}

export interface IRiskPrediction {
    id: string;
    tenantId: string;
    categoryId?: string;
    predictionDate: Date;
    predictionHorizon: '7_days' | '30_days' | '90_days' | '180_days' | '365_days';
    predictedRiskScore?: number;
    predictedRiskLevel?: string;
    confidenceScore?: number;
    predictionFactors?: any;
    mlModelVersion?: string;
}
