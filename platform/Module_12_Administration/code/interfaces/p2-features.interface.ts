// AI Personalization Interfaces
export interface IUserProfile {
    id: string;
    userId: string;
    preferences?: any;
    behaviorData?: any;
    segment?: string;
    mlFeatures?: any;
    lastActivityAt?: Date;
}

export interface IPersonalizationRule {
    id: string;
    ruleName: string;
    targetSegment?: string;
    conditions: any;
    actions: any;
    priority: number;
    isActive: boolean;
}

export interface IRecommendationEvent {
    id: string;
    userId: string;
    itemType: string;
    itemId: string;
    score?: number;
    context?: any;
    createdAt: Date;
}

export interface IABExperiment {
    id: string;
    experimentName: string;
    description?: string;
    variants: any;
    trafficSplit: any;
    metrics?: any;
    status: 'draft' | 'running' | 'paused' | 'completed';
    startDate?: Date;
    endDate?: Date;
    createdBy?: string;
}

export interface IExperimentAssignment {
    id: string;
    userId: string;
    experimentId: string;
    variant: string;
    assignedAt: Date;
}

export interface IUserSegment {
    id: string;
    segmentName: string;
    criteria: any;
    mlModelId?: string;
    memberCount: number;
    lastCalculatedAt?: Date;
    isActive: boolean;
}

// Capacity Planning Interfaces
export interface IResourceMetric {
    id: string;
    tenantId: string;
    resourceType: 'cpu' | 'memory' | 'storage' | 'network' | 'database' | 'custom';
    metricName: string;
    value: number;
    unit?: string;
    timestamp: Date;
}

export interface ICapacityForecast {
    id: string;
    tenantId: string;
    forecastDate: Date;
    resourcePredictions: any;
    confidence?: number;
    algorithm?: string;
}

export interface IScalingPolicy {
    id: string;
    tenantId: string;
    policyName: string;
    resourceType: string;
    scaleTrigger: any;
    scaleAction: any;
    cooldownMinutes: number;
    isActive: boolean;
}

export interface IScalingEvent {
    id: string;
    tenantId: string;
    policyId?: string;
    triggerReason: string;
    actionTaken: any;
    result: 'success' | 'failed' | 'skipped';
    errorMessage?: string;
    timestamp: Date;
}

export interface ICostAnalysis {
    id: string;
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    resourceCosts: any;
    totalCost?: number;
    optimizationSuggestions?: any;
    potentialSavings?: number;
}

// Advanced Auth Interfaces
export interface IBiometricRegistration {
    id: string;
    userId: string;
    biometricType: 'fingerprint' | 'face' | 'voice' | 'iris' | 'webauthn';
    deviceId?: string;
    publicKey: string;
    credentialId?: string;
    counter: number;
    isActive: boolean;
    lastUsedAt?: Date;
}

export interface IHardwareToken {
    id: string;
    userId: string;
    tokenSerial: string;
    tokenType: 'yubikey' | 'rsa' | 'totp_hardware' | 'u2f' | 'fido2';
    counter: number;
    status: 'active' | 'suspended' | 'revoked';
    lastUsedAt?: Date;
}

export interface IDirectoryConnection {
    id: string;
    tenantId: string;
    directoryType: 'ldap' | 'active_directory' | 'azure_ad' | 'okta' | 'google_workspace';
    connectionConfig: any;
    syncConfig?: any;
    status: 'active' | 'inactive' | 'error';
    lastSyncAt?: Date;
}

export interface IDirectorySyncLog {
    id: string;
    connectionId: string;
    syncType: 'full' | 'incremental' | 'manual';
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    status: 'running' | 'completed' | 'failed';
    errorMessage?: string;
    startedAt: Date;
    completedAt?: Date;
}
