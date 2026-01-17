// Dispute Types
export type DisputeStatus =
    | 'draft'
    | 'filed'
    | 'under_review'
    | 'mediation'
    | 'arbitration'
    | 'legal_notice_sent'
    | 'court_proceedings'
    | 'resolved'
    | 'closed';

export type DisputeType =
    | 'non_payment'
    | 'partial_payment'
    | 'delayed_payment'
    | 'quality_dispute'
    | 'quantity_dispute'
    | 'contract_breach'
    | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DisputeCase {
    id: string;
    tenantId: string;
    caseNumber: string;
    invoiceId: string;
    customerId: string;
    customerName: string;
    type: DisputeType;
    status: DisputeStatus;
    priority: DisputePriority;
    disputedAmount: number;
    description: string;
    evidence?: {
        documents: Array<{
            id: string;
            name: string;
            url: string;
            type: string;
            uploadedAt: Date;
        }>;
        communications: Array<{
            id: string;
            type: string;
            date: Date;
            summary: string;
        }>;
    };
    assignedLegalProviderId?: string;
    timeline?: Array<{
        date: Date;
        event: string;
        description: string;
        performedBy: string;
    }>;
    resolution?: {
        type: string;
        amount: number;
        terms: string;
        agreedDate: Date;
    };
    notes?: string;
    filedAt?: Date;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// Collection Types
export type CollectionStatus =
    | 'new'
    | 'in_progress'
    | 'payment_plan'
    | 'settled'
    | 'legal_action'
    | 'written_off'
    | 'closed';

export type CollectionStrategy =
    | 'friendly_reminder'
    | 'formal_notice'
    | 'legal_action'
    | 'debt_collection_agency';

export interface CollectionCase {
    id: string;
    tenantId: string;
    caseNumber: string;
    disputeId?: string;
    customerId: string;
    customerName: string;
    invoiceId: string;
    outstandingAmount: number;
    originalAmount: number;
    status: CollectionStatus;
    strategy: CollectionStrategy;
    assignedTo?: string;
    paymentHistory?: Array<{
        date: Date;
        amount: number;
        paymentMethod: string;
        recordedBy: string;
    }>;
    settlementOffer?: {
        proposedAmount: number;
        terms: string;
        proposedDate: Date;
        proposedBy: string;
        status: 'pending' | 'accepted' | 'rejected';
    };
    writeOffReason?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// Legal Provider Types
export type ProviderType = 'individual' | 'firm' | 'consultant';
export type ProviderStatus = 'pending_verification' | 'active' | 'inactive' | 'suspended';
export type Specialization =
    | 'civil_litigation'
    | 'commercial_disputes'
    | 'debt_recovery'
    | 'contract_law'
    | 'arbitration'
    | 'mediation'
    | 'msme_compliance';

export interface LegalProviderProfile {
    id: string;
    tenantId: string;
    firmName: string;
    providerType: ProviderType;
    status: ProviderStatus;
    specializations: Specialization[];
    barCouncilNumber: string;
    yearsOfExperience: number;
    contactInfo: {
        email: string;
        phone: string;
        address: {
            street: string;
            city: string;
            state: string;
            pincode: string;
        };
    };
    pricing?: {
        consultationFee: number;
        hourlyRate: number;
        legalNoticeFee: number;
        courtRepresentationFee: number;
        successFeePercentage: number;
    };
    rating: number;
    totalCasesHandled: number;
    successfulResolutions: number;
    activeCases: number;
    averageResolutionDays: number;
    languages?: string[];
    bio?: string;
    acceptsNewCases: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// AI Prediction Types
export interface PredictionResult {
    disputeId: string;
    predictedOutcome: 'win' | 'lose' | 'settle';
    confidence: number;
    estimatedDuration: number;
    estimatedCost: number;
    recommendedStrategy: string;
    riskFactors: Array<{
        factor: string;
        impact: 'low' | 'medium' | 'high';
        description: string;
    }>;
    successProbability: number;
}

export interface RiskAssessment {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
        category: string;
        score: number;
        weight: number;
        details: string;
    }>;
    recommendations: string[];
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: {
        items: T[];
        totalCount: number;
        page: number;
        limit: number;
    };
}
