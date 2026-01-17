/**
 * Event Constants
 * 
 * Centralized event names for consistency across the platform
 */

// Workflow Events (emitted by Module 05)
export const WORKFLOW_EVENTS = {
    CREATED: 'workflow.created',
    STARTED: 'workflow.started',
    COMPLETED: 'workflow.completed',
    PAUSED: 'workflow.paused',
    RESUMED: 'workflow.resumed',
    CANCELLED: 'workflow.cancelled',
    FAILED: 'workflow.failed',
} as const;

// Milestone Events (emitted by Module 05)
export const MILESTONE_EVENTS = {
    CREATED: 'milestone.created',
    STARTED: 'milestone.started',
    COMPLETED: 'milestone.completed',
    OVERDUE: 'milestone.overdue',
    AT_RISK: 'milestone.at.risk',
    BLOCKED: 'milestone.blocked',
    UNBLOCKED: 'milestone.unblocked',
} as const;

// Verification Events (emitted by Module 05)
export const VERIFICATION_EVENTS = {
    REQUESTED: 'verification.requested',
    APPROVED: 'verification.approved',
    REJECTED: 'verification.rejected',
    ESCALATED: 'verification.escalated',
} as const;

// Evidence Events (emitted by Module 05)
export const EVIDENCE_EVENTS = {
    UPLOADED: 'evidence.uploaded',
    VALIDATED: 'evidence.validated',
    REJECTED: 'evidence.rejected',
} as const;

// Escalation Events (emitted by Module 05)
export const ESCALATION_EVENTS = {
    CREATED: 'escalation.created',
    ASSIGNED: 'escalation.assigned',
    RESOLVED: 'escalation.resolved',
    CLOSED: 'escalation.closed',
} as const;

// Invoice Events (from Module 01)
export const INVOICE_EVENTS = {
    CREATED: 'invoice.created',
    SENT: 'invoice.sent',
    VIEWED: 'invoice.viewed',
    PAID: 'invoice.paid',
    OVERDUE: 'invoice.overdue',
    CANCELLED: 'invoice.cancelled',
} as const;

// Payment Events (from Module 03)
export const PAYMENT_EVENTS = {
    INITIATED: 'payment.initiated',
    RELEASED: 'payment.released',
    PROCESSING: 'payment.processing',
    COMPLETED: 'payment.completed',
    FAILED: 'payment.failed',
    REFUNDED: 'payment.refunded',
} as const;

// Analytics Events (to Module 04)
export const ANALYTICS_EVENTS = {
    WORKFLOW_METRICS: 'analytics.workflow.metrics',
    MILESTONE_EVENT: 'analytics.milestone.event',
    PERFORMANCE_DATA: 'analytics.performance.data',
} as const;

// All event types for type safety
export type WorkflowEventType = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];
export type MilestoneEventType = typeof MILESTONE_EVENTS[keyof typeof MILESTONE_EVENTS];
export type VerificationEventType = typeof VERIFICATION_EVENTS[keyof typeof VERIFICATION_EVENTS];
export type EvidenceEventType = typeof EVIDENCE_EVENTS[keyof typeof EVIDENCE_EVENTS];
export type EscalationEventType = typeof ESCALATION_EVENTS[keyof typeof ESCALATION_EVENTS];
export type InvoiceEventType = typeof INVOICE_EVENTS[keyof typeof INVOICE_EVENTS];
export type PaymentEventType = typeof PAYMENT_EVENTS[keyof typeof PAYMENT_EVENTS];
export type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Helper to get all event names
export const getAllEventNames = (): string[] => {
    return [
        ...Object.values(WORKFLOW_EVENTS),
        ...Object.values(MILESTONE_EVENTS),
        ...Object.values(VERIFICATION_EVENTS),
        ...Object.values(EVIDENCE_EVENTS),
        ...Object.values(ESCALATION_EVENTS),
        ...Object.values(INVOICE_EVENTS),
        ...Object.values(PAYMENT_EVENTS),
        ...Object.values(ANALYTICS_EVENTS),
    ];
};
