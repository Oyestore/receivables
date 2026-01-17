/**
 * Financing Opportunity detected by Copilot
 */
export interface FinancingOpportunity {
    id: string;
    type: 'preventive_financing' | 'growth_capital' | 'invoice_financing' | 'working_capital';

    // Scoring
    score: number; // 0-100, overall opportunity quality
    approvalProbability: number; // 0-100
    roi: number; // Expected return on investment
    urgency: 'immediate' | 'within_week' | 'within_month' | 'flexible';

    // Details
    recommendedAmount: number;
    estimatedRate: number;
    estimatedTenure: number;

    // Reasoning
    recommendation: string; // User-friendly description
    reasoning: string[]; // Why this opportunity exists
    benefits: string[]; // What user gains
    risks: string[]; // Potential downsides

    // Timing
    optimalApplicationDate: Date;
    expiresAt?: Date; // When opportunity window closes

    // Actions
    canAutoApply: boolean;
    oneClickApply: boolean;
    requiresDocuments: boolean;

    // Context
    triggeredBy: string; // What detected this opportunity
    relatedInvoices?: string[];
    relatedExpenses?: string[];

    // Metadata
    detectedAt: Date;
    createdBy: 'copilot_ai' | 'user_requested';
}

/**
 * Cash flow prediction
 */
export interface CashFlowPrediction {
    tenantId: string;

    // Predictions by week
    weeks: CashFlowWeek[];

    // Summary
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;

    // Alerts
    shortfalls: CashFlowShortfall[];
    surpluses: CashFlowSurplus[];

    // Confidence
    confidence: number; // 0-100
    basedOn: string; // Data sources used

    predictedAt: Date;
    predictedFor: {
        startDate: Date;
        endDate: Date;
    };
}

/**
 * Weekly cash flow projection
 */
export interface CashFlowWeek {
    weekNumber: number;
    startDate: Date;
    endDate: Date;

    expectedInflow: number; // Expected receipts
    expectedOutflow: number; // Expected payments
    netFlow: number;
    cumulativeBalance: number;

    // Details
    receivables: number; // Invoices due
    payables: number; // Bills due
    other: number;

    // Risk assessment
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Cash flow shortfall alert
 */
export interface CashFlowShortfall {
    weekNumber: number;
    date: Date;
    amount: number; // Shortfall amount
    severity: 'minor' | 'moderate' | 'severe' | 'critical';

  // Recommendations
  recommended Actions: string[];
financingOption ?: FinancingOpportunity;

// Impact
affectedPayments: string[]; // What bills might be delayed
potentialPenalties: number;
}

/**
 * Cash flow surplus
 */
export interface CashFlowSurplus {
    weekNumber: number;
    date: Date;
    amount: number;

    // Recommendations
    recommendations: string[]; // e.g., "Pay down debt", "Invest"
}

/**
 * Timing suggestion for financing
 */
export interface TimingSuggestion {
    optimal: Date; // Best time to apply
    acceptable: { start: Date; end: Date }; // Window of good timing
    avoid: Date[]; // Dates to avoid

    reasoning: string;
    factors: TimingFactor[];

    // Impact of timing
    rateImpact: number; // How much rate changes by timing
    approvalImpact: number; // How much approval probability changes
}

/**
 * Factor affecting timing
 */
export interface TimingFactor {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
}

/**
 * Opportunity scoring breakdown
 */
export interface OpportunityScore {
    overall: number; // 0-100

    components: {
        approvalProbability: { score: number; weight: number };
        roi: { score: number; weight: number };
        urgency: { score: number; weight: number };
        termsFavorability: { score: number; weight: number };
    };

    confidence: number;
}

/**
 * Auto-apply result
 */
export interface AutoApplyResult {
    success: boolean;
    applicationId?: string;
    auctionId?: string;

    // Details
    partnersSubmitted: number;
    estimatedCompletionTime: Date;

    // Next steps
    nextSteps: string[];
    documentsRequired?: string[];

    error?: string;
}

/**
 * Copilot insight
 */
export interface CopilotInsight {
    type: 'tip' | 'warning' | 'opportunity' | 'achievement';
    title: string;
    message: string;
    actionable: boolean;
    action?: {
        label: string;
        endpoint: string;
    };
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
}

/**
 * Copilot configuration
 */
export interface CopilotConfig {
    enabled: boolean;

    // Auto-analysis
    autoAnalyzeFrequency: 'daily' | 'weekly' | 'on_demand';
    cashFlowPredictionWeeks: number; // Default: 8

    // Notifications
    notifyOnOpportunities: boolean;
    notifyOnShortfalls: boolean;
    minimumOpportunityScore: number; // Only show if score >= this

    // Auto-apply
    autoApplyEnabled: boolean;
    autoApplyThreshold: number; // Auto-apply if score >= this
    autoApplyMaxAmount: number; // Don't auto-apply above this amount
}
