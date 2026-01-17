// Frontend Event Types - Extracted from backend entities for frontend use

export enum EventType {
    DELIVERY = 'DELIVERY',                 // Physical/digital delivery events
    MILESTONE = 'MILESTONE',               // Progress/phase completion events
    PERFORMANCE = 'PERFORMANCE',           // KPI/SLA/metric-based events
    COMPLIANCE = 'COMPLIANCE',             // Regulatory/certification events
    TIME = 'TIME',                         // Time-based events (installments, bonuses)
    QUALITY = 'QUALITY',                   // Quality & acceptance events
    CONTINGENT = 'CONTINGENT',             // Pay-if-paid, earnouts, success fees
    HYBRID = 'HYBRID'                      // Complex multi-condition events
}

export enum EventStatus {
    SCHEDULED = 'SCHEDULED',             // Event planned but not started
    IN_PROGRESS = 'IN_PROGRESS',         // Event currently active
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Awaiting verification
    VERIFIED = 'VERIFIED',             // Verified, awaiting payment trigger
    ACHIEVED = 'ACHIEVED',             // Event completed successfully
    FAILED = 'FAILED',                 // Event failed to complete
    CANCELLED = 'CANCELLED',           // Event cancelled
    ON_HOLD = 'ON_HOLD'                // Event temporarily paused
}

export enum TriggerType {
    MANUAL = 'MANUAL',                     // Manually marked as complete
    AUTOMATED = 'AUTOMATED',               // Auto-triggered by system event
    HYBRID = 'HYBRID'                      // Combination of manual + automated
}

export enum VerificationMethod {
    INTERNAL = 'INTERNAL',                 // Internal team verification
    EXTERNAL = 'EXTERNAL',                 // Third-party verifier
    AUTOMATED = 'AUTOMATED'                // System-automated verification
}

export enum PaymentTiming {
    IMMEDIATE = 'IMMEDIATE',               // Payment immediately on achievement
    DELAYED = 'DELAYED',                   // Payment after delay period
    CONDITIONAL = 'CONDITIONAL'            // Payment on additional conditions
}

// Frontend interfaces (without TypeORM decorators)
export interface EventDefinition {
    id: string;
    tenantId: string;
    eventName: string;
    description: string;
    eventType: EventType;
    triggerType: TriggerType;
    triggerConditions: {
        type: string;
        operator: 'AND' | 'OR';
        conditions: Array<{
            field: string;
            operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'CONTAINS';
            value: any;
        }>;
    };
    verificationMethod: VerificationMethod;
    verificationRequirements: Array<{
        requirementId: string;
        requirementType: 'DOCUMENT' | 'APPROVAL' | 'METRIC' | 'SIGNATURE';
        description: string;
        isMandatory: boolean;
    }>;
    paymentAmount: number;
    paymentPercentage: number;
    paymentTiming: PaymentTiming;
    paymentDelayDays: number;
    paymentConditions: any;
    dependencies: string[];
    industry: string;
    isTemplate: boolean;
    templateCategory: string;
    metadata: Record<string, any>;
    isActive: boolean;
}

export interface EventInstance {
    id: string;
    tenantId: string;
    eventDefinitionId: string;
    projectId: string;
    contractId: string;
    eventName: string;
    description: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate: Date;
    actualEndDate: Date;
    plannedDurationDays: number;
    actualDurationDays: number;
    status: EventStatus;
    percentComplete: number;
    ownerId: string;
    ownerType: string;
    paymentAmount: number;
    paymentTriggered: boolean;
    paymentTriggeredAt: Date;
    invoiceId: string;
    paymentId: string;
    isVerified: boolean;
    verifiedAt: Date;
    verifiedBy: string;
    verificationNotes: string;
    isDelayed: boolean;
    delayDays: number;
    delayReason: string;
    isEscalated: boolean;
    escalatedAt: Date;
    dependenciesMet: boolean;
    dependencyStatus: Record<string, {
        eventId: string;
        status: EventStatus;
        completedAt?: Date;
    }>;
    metadata: Record<string, any>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
