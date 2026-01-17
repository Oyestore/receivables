/**
 * Universal Financing Partner Plugin Interface
 * 
 * All financing partners (NBFCs, banks, fintechs) must implement this interface
 * Makes onboarding new partners trivial (2-3 days vs 2 weeks)
 */

export enum PartnerType {
    NBFC = 'nbfc',
    BANK = 'bank',
    FINTECH = 'fintech',
    P2P_PLATFORM = 'p2p_platform',
    INVOICE_DISCOUNTER = 'invoice_discounter',
    TREDS_PARTICIPANT = 'treds_participant',
}

export enum FinancingProduct {
    INVOICE_FINANCING = 'invoice_financing',
    INVOICE_FACTORING = 'invoice_factoring',
    WORKING_CAPITAL = 'working_capital',
    PURCHASE_ORDER_FINANCING = 'purchase_order_financing',
    SUPPLY_CHAIN_FINANCE = 'supply_chain_finance',
    EQUIPMENT_FINANCING = 'equipment_financing',
    REVENUE_BASED_FINANCING = 'revenue_based_financing',
    MERCHANT_CASH_ADVANCE = 'merchant_cash_advance',
    CREDIT_LINE = 'credit_line',
    TRADE_CREDIT_INSURANCE = 'trade_credit_insurance',
    EMBEDDED_BNPL = 'embedded_bnpl',
}

export enum FinancingPurpose {
    INVOICE_DISCOUNTING = 'invoice_discounting',
    INVOICE_FACTORING = 'invoice_factoring',
    WORKING_CAPITAL = 'working_capital',
    PURCHASE_ORDER = 'purchase_order',
    SUPPLY_CHAIN_FINANCE = 'supply_chain_finance',
    EQUIPMENT_FINANCING = 'equipment_financing',
    REVENUE_BASED = 'revenue_based',
}

/**
 * Business Profile - Standardized across all partners
 */
export interface BusinessProfile {
    businessName: string;
    pan: string;
    gstin?: string;
    yearsInBusiness: number;
    annualRevenue: number;
    industry: string;
    employeeCount?: number;
    businessType?: string;

    // Enriched data from platform
    creditScore?: number;
    invoiceHistory?: InvoiceMetrics;
    paymentBehavior?: PaymentMetrics;
}

export interface InvoiceMetrics {
    totalInvoices: number;
    totalValue: number;
    averageInvoiceSize: number;
    averagePaymentDays: number;
    monthlyVolume: number;
}

export interface PaymentMetrics {
    onTimePercentage: number;
    averageDelayDays: number;
    totalPaymentsProcessed: number;
    score: number; // 0-1
}

/**
 * Standard Application Format
 * Partners map this to their specific format
 */
export interface StandardApplication {
    applicationId: string;
    tenantId: string;
    userId: string;

    businessProfile: BusinessProfile;

    financingRequest: {
        amount: number;
        purpose: FinancingPurpose;
        urgency: 'same_day' | '3_days' | '1_week' | 'flexible';
        tenure?: number; // months
        preferredDisbursalDate?: Date;
    };

    invoiceDetails?: {
        invoiceIds: string[];
        totalInvoiceAmount: number;
        averageInvoiceAge: number;
    };

    purchaseOrderDetails?: {
        poIds: string[];
        totalPOAmount: number;
        buyerDetails: any;
    };

    documents: DocumentPackage;

    metadata?: Record<string, any>;
}

export interface DocumentPackage {
    bankStatements?: string[]; // URLs or base64
    gstReturns?: string[];
    invoices?: string[];
    purchaseOrders?: string[];
    financialStatements?: string[];
    identityProofs?: string[];
    addressProofs?: string[];
    [key: string]: string[] | undefined;
}

/**
 * Eligibility Result
 */
export interface EligibilityResult {
    eligible: boolean;
    reason?: string;
    minimumAmount?: number;
    maximumAmount?: number;
    estimatedRate?: number;
    requiredDocuments?: string[];
    conditions?: string[];
}

/**
 * Partner Offer (raw format from partner)
 * Will be normalized for comparison
 */
export interface PartnerOffer {
    offerId: string;
    amount: number;
    interestRate: number; // Annual percentage rate
    processingFee: number;
    tenure: number; // months
    disbursalTime: string; // e.g., "24 hours", "same day"
    emi?: number;
    totalRepayment?: number;
    conditions: string[];
    expiresAt: Date;

    // Partner-specific data (preserved for reference)
    rawData: any;
}

/**
 * Application Response from partner
 */
export interface ApplicationResponse {
    success: boolean;
    externalApplicationId: string;
    status: string;
    message?: string;
    nextSteps?: string[];
    estimatedProcessingTime?: string;
}

/**
 * Application Status
 */
export interface ApplicationStatus {
    externalApplicationId: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'completed';
    statusMessage: string;
    updatedAt: Date;
    offers?: PartnerOffer[];
    rejectionReason?: string;
    approvedAmount?: number;
    disbursedAmount?: number;
    disbursedAt?: Date;
}

/**
 * Webhook Result
 */
export interface WebhookResult {
    processed: boolean;
    applicationId?: string;
    status?: string;
    message?: string;
}

/**
 * Financing Request (for getting offers without creating application)
 */
export interface FinancingRequest {
    amount: number;
    purpose: FinancingPurpose;
    urgency: 'same_day' | '3_days' | '1_week' | 'flexible';
    tenure?: number;
    businessProfile?: Partial<BusinessProfile>;
}

/**
 * Cost Calculation Parameters
 */
export interface CostCalculation {
    amount: number;
    interestRate: number;
    tenure: number;
    processingFee?: number;
    otherFees?: Record<string, number>;
}

/**
 * Cost Breakdown
 */
export interface CostBreakdown {
    principal: number;
    totalInterest: number;
    processingFee: number;
    otherFees: Record<string, number>;
    totalCost: number;
    effectiveAPR: number;
    emi?: number;
    repaymentSchedule?: RepaymentScheduleItem[];
}

export interface RepaymentScheduleItem {
    installmentNumber: number;
    dueDate: Date;
    principal: number;
    interest: number;
    totalAmount: number;
    outstandingBalance: number;
}

/**
 * Repayment Schedule Parameters
 */
export interface RepaymentParams {
    amount: number;
    interestRate: number;
    tenure: number;
    startDate?: Date;
}

/**
 * Repayment Schedule
 */
export interface Schedule {
    installments: RepaymentScheduleItem[];
    totalInterest: number;
    totalRepayment: number;
}

/**
 * Offer Acceptance Result
 */
export interface AcceptanceResult {
    success: boolean;
    message: string;
    agreementId?: string;
    nextSteps?: string[];
    disbursalTimeline?: string;
}

/**
 * CORE INTERFACE - All partners MUST implement these 5 methods
 */
export interface IFinancingPartnerPlugin {
    // ========================================
    // Partner Metadata
    // ========================================
    readonly partnerId: string;
    readonly partnerName: string;
    readonly partnerType: PartnerType;
    readonly supportedProducts: FinancingProduct[];

    // ========================================
    // CORE METHODS (Required - All 5 must be implemented)
    // ========================================

    /**
     * Check if business is eligible for financing
     * Called before application to save time
     */
    checkEligibility(profile: BusinessProfile): Promise<EligibilityResult>;

    /**
     * Submit financing application to partner
     * Returns external application ID for tracking
     */
    submitApplication(application: StandardApplication): Promise<ApplicationResponse>;

    /**
     * Get financing offers without submitting formal application
     * Used for comparison shopping
     */
    getOffers(request: FinancingRequest): Promise<PartnerOffer[]>;

    /**
     * Track status of submitted application
     * Polls partner API for updates
     */
    trackStatus(externalAppId: string): Promise<ApplicationStatus>;

    /**
     * Handle webhooks from partner
     * Partner notifies us of status changes
     */
    handleWebhook(payload: any, signature: string): Promise<WebhookResult>;

    // ========================================
    // OPTIONAL METHODS (Nice to have)
    // ========================================

    /**
     * Calculate detailed cost breakdown
     * Optional - for partners that provide this API
     */
    calculateCost?(params: CostCalculation): Promise<CostBreakdown>;

    /**
     * Get repayment schedule
     * Optional - for partners that provide this API
     */
    getRepaymentSchedule?(params: RepaymentParams): Promise<Schedule>;

    /**
     * Accept an offer
     * Optional - some partners auto-accept, others need explicit acceptance
     */
    acceptOffer?(offerId: string): Promise<AcceptanceResult>;

    /**
     * Get partner's current operational status
     * Optional - for monitoring partner availability
     */
    getPartnerStatus?(): Promise<{ available: boolean; message?: string }>;
}
