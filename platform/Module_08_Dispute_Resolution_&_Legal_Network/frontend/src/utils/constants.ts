// Dispute status constants
export const DISPUTE_STATUSES = {
    DRAFT: 'draft',
    FILED: 'filed',
    UNDER_REVIEW: 'under_review',
    MEDIATION: 'mediation',
    ARBITRATION: 'arbitration',
    LEGAL_NOTICE_SENT: 'legal_notice_sent',
    COURT_PROCEEDINGS: 'court_proceedings',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
} as const;

// Dispute types
export const DISPUTE_TYPES = {
    NON_PAYMENT: 'non_payment',
    PARTIAL_PAYMENT: 'partial_payment',
    DELAYED_PAYMENT: 'delayed_payment',
    QUALITY_DISPUTE: 'quality_dispute',
    QUANTITY_DISPUTE: 'quantity_dispute',
    CONTRACT_BREACH: 'contract_breach',
    OTHER: 'other',
} as const;

// Dispute priorities
export const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
} as const;

// Collection statuses
export const COLLECTION_STATUSES = {
    NEW: 'new',
    IN_PROGRESS: 'in_progress',
    PAYMENT_PLAN: 'payment_plan',
    SETTLED: 'settled',
    LEGAL_ACTION: 'legal_action',
    WRITTEN_OFF: 'written_off',
    CLOSED: 'closed',
} as const;

// Collection strategies
export const COLLECTION_STRATEGIES = {
    FRIENDLY_REMINDER: 'friendly_reminder',
    FORMAL_NOTICE: 'formal_notice',
    LEGAL_ACTION: 'legal_action',
    DEBT_COLLECTION_AGENCY: 'debt_collection_agency',
} as const;

// Lawyer specializations
export const SPECIALIZATIONS = {
    CIVIL_LITIGATION: 'civil_litigation',
    COMMERCIAL_DISPUTES: 'commercial_disputes',
    DEBT_RECOVERY: 'debt_recovery',
    CONTRACT_LAW: 'contract_law',
    ARBITRATION: 'arbitration',
    MEDIATION: 'mediation',
    MSME_COMPLIANCE: 'msme_compliance',
} as const;

// Approval levels
export const APPROVAL_LEVELS = {
    L1: 'L1',
    L2: 'L2',
    L3: 'L3',
} as const;

// Amount thresholds for approvals (in INR)
export const APPROVAL_THRESHOLDS = {
    L1_MAX: 100000,
    L2_MAX: 500000,
    L3_MIN: 500001,
} as const;

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// API retry configuration
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY = 1000; // ms

// Date format constants
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Risk levels
export const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
} as const;

// Prediction outcomes
export const PREDICTION_OUTCOMES = {
    WIN: 'win',
    LOSE: 'lose',
    SETTLE: 'settle',
} as const;
