/**
 * Module 08 - Dispute Resolution & Legal Network Constants
 * Shared constants and types across all services
 */

// Legal Provider Search Constants
export const MIN_PROVIDER_RATING = 3.5;
export const TOP_PROVIDERS_LIMIT = 5;

// FDCPA Compliance Constants
export const FDCPA_START_HOUR = 8;  // 8 AM
export const FDCPA_END_HOUR = 21;    // 9 PM
export const MAX_DAILY_CONTACTS = 3;

// RBI Compliance Constants
export const RBI_UPI_LIMIT = 100000;  // ₹1 Lakh
export const RBI_KYC_THRESHOLD = 50000; // ₹50,000

// GST Constants
export const GST_RATE = 0.18;  // 18%
export const GSTIN_LENGTH = 15;

/**
 * Type-safe interfaces to replace `any` types
 */

// Dispute Statistics Result
export interface DisputeStatsResult {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    totalDisputedAmount: number;
    averageResolutionDays: number;
}

// Compliance Report Summary
export interface ComplianceReportSummary {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    complianceRate: number;
}

export interface ComplianceReportData {
    summary: ComplianceReportSummary;
    violations: ComplianceViolation[];
    trends: ComplianceTrend;
    pdf: Buffer;
}

export interface ComplianceViolation {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: Date;
}

export interface ComplianceTrend {
    improving: boolean;
    monthOverMonth: number;
}

// Document Template Variables
export interface DocumentVariable {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    defaultValue?: any;
    description?: string;
}

export type DocumentVariables = Record<string, string | number | Date | boolean>;

// GST Calculation Result
export interface GSTCalculationResult {
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
}

// MSME Portal Webhook Payload
export interface MSMEWebhookPayload {
    case_number: string;
    status: string;
    description?: string;
    event_type: 'status_change' | 'hearing_scheduled' | 'award_passed';
    hearing_date?: string;
    award_number?: string;
    award_date?: string;
    awarded_amount?: number;
    payment_due_date?: string;
    remarks?: string;
}
