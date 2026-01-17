/**
 * Module Integration Interfaces
 * 
 * Defines contracts that other modules must implement
 * Module 07 will inject these services when available
 */

// ============================================
// Module 05: Workflow Service Interface
// ============================================

export interface WorkflowTriggerData {
    entityType: 'discount_offer' | 'financing_application';
    entityId: string;
    tenantId: string;
    userId: string;
    metadata: Record<string, any>;
}

export interface WorkflowInstance {
    workflowId: string;
    instanceId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    currentState: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Interface for Module 05 Workflow Service
 * Used for managing discount offer state machines
 */
export interface IWorkflowService {
    /**
     * Trigger a workflow for discount offer lifecycle
     * States: created → pending_supplier_review → accepted/rejected → expired
     */
    triggerWorkflow(
        workflowType: string,
        triggerData: WorkflowTriggerData,
    ): Promise<WorkflowInstance>;

    /**
     * Get workflow instance status
     */
    getWorkflowInstance(instanceId: string): Promise<WorkflowInstance>;

    /**
     * Cancel a running workflow
     */
    cancelWorkflow(instanceId: string): Promise<void>;
}

// ============================================
// Module 11: Notification Service Interface
// ============================================

export interface NotificationRecipient {
    userId: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
}

export interface NotificationTemplate {
    templateId: string;
    channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
    variables: Record<string, any>;
}

export interface NotificationResult {
    success: boolean;
    notificationId?: string;
    error?: string;
    sentAt?: Date;
}

/**
 * Interface for Module 11 Notification Service
 * Used for sending financing-related notifications
 */
export interface INotificationService {
    /**
     * Send application status notification
     */
    sendApplicationNotification(
        recipient: NotificationRecipient,
        event: 'application_submitted' | 'application_approved' | 'application_rejected' | 'loan_disbursed',
        data: Record<string, any>,
    ): Promise<NotificationResult>;

    /**
     * Send discount offer notification
     */
    sendDiscountOfferNotification(
        recipient: NotificationRecipient,
        event: 'offer_received' | 'offer_accepted' | 'offer_rejected' | 'offer_expiring_soon',
        data: Record<string, any>,
    ): Promise<NotificationResult>;

    /**
     * Send multi-channel notification
     */
    sendMultiChannelNotification(
        recipient: NotificationRecipient,
        channels: Array<'email' | 'sms' | 'whatsapp'>,
        template: NotificationTemplate,
    ): Promise<NotificationResult[]>;
}

// ============================================
// Module 01: Credit Note Service Interface
// ============================================

export interface CreditNoteRequest {
    invoiceId: string;
    tenantId: string;
    reason: string;
    creditAmount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface CreditNoteResult {
    success: boolean;
    creditNoteId?: string;
    creditNoteNumber?: string;
    amount?: number;
    error?: string;
}

/**
 * Interface for Module 01 Credit Note Service
 * Used for automated credit note generation
 */
export interface ICreditNoteService {
    /**
     * Create credit note for early payment discount
     */
    createCreditNote(request: CreditNoteRequest): Promise<CreditNoteResult>;

    /**
     * Get credit note details
     */
    getCreditNote(creditNoteId: string): Promise<any>;

    /**
     * Validate if credit note can be created
     */
    validateCreditNoteEligibility(invoiceId: string, amount: number): Promise<{
        eligible: boolean;
        reason?: string;
    }>;
}

// ============================================
// Module 06: Credit Scoring Service Interface
// ============================================

export interface FinancingActivityRecord {
    tenantId: string;
    userId: string;
    activityType: 'loan_application' | 'loan_approval' | 'loan_rejection' | 'loan_disbursal' | 'repayment';
    amount: number;
    partnerId: string;
    loanTerm?: number;
    interestRate?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface CreditScoreUpdate {
    success: boolean;
    previousScore?: number;
    newScore?: number;
    scoreChange?: number;
    factors?: string[];
}

/**
 * Interface for Module 06 Credit Scoring Service
 * Bidirectional integration - we report financing activity
 */
export interface ICreditScoringService {
    /**
     * Report financing activity to credit scoring
     * Positive: loan approval, timely repayment
     * Negative: loan rejection, late payment
     */
    reportFinancingActivity(activity: FinancingActivityRecord): Promise<CreditScoreUpdate>;

    /**
     * Get current credit score
     * Used for eligibility checks
     */
    getCreditScore(tenantId: string): Promise<{
        score: number;
        grade: string;
        lastUpdated: Date;
    }>;

    /**
     * Request credit assessment
     * Used before submitting applications
     */
    requestCreditAssessment(tenantId: string): Promise<{
        score: number;
        recommendations: string[];
        approvalProbability: number;
    }>;
}

// ============================================
// Integration Service Tokens (for DI)
// ============================================

export const INTEGRATION_TOKENS = {
    WORKFLOW_SERVICE: 'IWorkflowService',
    NOTIFICATION_SERVICE: 'INotificationService',
    CREDIT_NOTE_SERVICE: 'ICreditNoteService',
    CREDIT_SCORING_SERVICE: 'ICreditScoringService',
} as const;

// ============================================
// Integration Status
// ============================================

export interface ModuleIntegrationStatus {
    module: string;
    integrated: boolean;
    version?: string;
    capabilities?: string[];
    lastHealthCheck?: Date;
}

export interface IntegrationHealth {
    module05_workflow: ModuleIntegrationStatus;
    module11_notification: ModuleIntegrationStatus;
    module01_creditNote: ModuleIntegrationStatus;
    module06_creditScoring: ModuleIntegrationStatus;
}
