/**
 * Workflow Event Definitions
 * 
 * Events emitted by Module 05 to notify other modules
 * of workflow and milestone state changes
 */

export class WorkflowCreatedEvent {
    constructor(
        public readonly workflowId: string,
        public readonly tenantId: string,
        public readonly workflowType: string,
        public readonly customerId: string,
        public readonly totalValue: number,
        public readonly currency: string,
        public readonly metadata: Record<string, any>,
        public readonly createdAt: Date = new Date(),
    ) { }
}

export class WorkflowStartedEvent {
    constructor(
        public readonly workflowInstanceId: string,
        public readonly workflowDefinitionId: string,
        public readonly tenantId: string,
        public readonly initiatedBy: string,
        public readonly estimatedDuration: number, // in days
        public readonly startedAt: Date = new Date(),
    ) { }
}

export class WorkflowCompletedEvent {
    constructor(
        public readonly workflowInstanceId: string,
        public readonly tenantId: string,
        public readonly completedAt: Date,
        public readonly totalDurationMinutes: number,
        public readonly successRate: number,
        public readonly totalValue: number,
    ) { }
}

export class MilestoneCreatedEvent {
    constructor(
        public readonly milestoneId: string,
        public readonly workflowInstanceId: string,
        public readonly tenantId: string,
        public readonly milestoneName: string,
        public readonly paymentAmount: number,
        public readonly currency: string,
        public readonly dueDate: Date,
        public readonly autoGenerateInvoice: boolean,
        public readonly autoReleasePayment: boolean,
        public readonly metadata: Record<string, any>,
    ) { }
}

export class MilestoneCompletedEvent {
    constructor(
        public readonly milestoneId: string,
        public readonly workflowInstanceId: string,
        public readonly tenantId: string,
        public readonly completedAt: Date,
        public readonly evidenceIds: string[],
        public readonly verificationRequired: boolean,
        public readonly autoGenerateInvoice: boolean,
        public readonly paymentAmount: number,
        public readonly currency: string,
        public readonly customerId: string,
        public readonly metadata: Record<string, any>,
    ) { }
}

export class MilestoneVerificationRequestedEvent {
    constructor(
        public readonly verificationId: string,
        public readonly milestoneId: string,
        public readonly tenantId: string,
        public readonly requestedBy: string,
        public readonly evidenceCount: number,
        public readonly verificationDeadline: Date,
        public readonly metadata: Record<string, any>,
    ) { }
}

export class VerificationApprovedEvent {
    constructor(
        public readonly verificationId: string,
        public readonly milestoneId: string,
        public readonly workflowInstanceId: string,
        public readonly tenantId: string,
        public readonly approvedBy: string,
        public readonly approvedAt: Date,
        public readonly approvalAmount: number,
        public readonly currency: string,
        public readonly releasePayment: boolean,
        public readonly invoiceId: string | null,
        public readonly metadata: Record<string, any>,
    ) { }
}

export class VerificationRejectedEvent {
    constructor(
        public readonly verificationId: string,
        public readonly milestoneId: string,
        public readonly tenantId: string,
        public readonly rejectedBy: string,
        public readonly rejectedAt: Date,
        public readonly reason: string,
        public readonly feedback: string,
    ) { }
}

export class EvidenceUploadedEvent {
    constructor(
        public readonly evidenceId: string,
        public readonly milestoneId: string,
        public readonly tenantId: string,
        public readonly uploadedBy: string,
        public readonly fileType: string,
        public readonly fileSize: number,
        public readonly fileUrl: string,
        public readonly needsAIVerification: boolean,
    ) { }
}

export class EscalationCreatedEvent {
    constructor(
        public readonly escalationId: string,
        public readonly milestoneId: string,
        public readonly workflowInstanceId: string,
        public readonly tenantId: string,
        public readonly escalationLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        public readonly reason: string,
        public readonly assignedTo: string[],
        public readonly createdAt: Date = new Date(),
    ) { }
}

// Events from other modules that Module 05 listens to
export class InvoiceCreatedEvent {
    constructor(
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly customerId: string,
        public readonly amount: number,
        public readonly currency: string,
        public readonly dueDate: Date,
        public readonly metadata: {
            milestoneId?: string;
            workflowId?: string;
            autoGenerated?: boolean;
        },
    ) { }
}

export class InvoicePaidEvent {
    constructor(
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly paidAmount: number,
        public readonly paidAt: Date,
        public readonly paymentMethod: string,
        public readonly metadata: {
            milestoneId?: string;
        },
    ) { }
}

export class PaymentReleasedEvent {
    constructor(
        public readonly paymentId: string,
        public readonly tenantId: string,
        public readonly amount: number,
        public readonly recipientId: string,
        public readonly releasedAt: Date,
        public readonly metadata: {
            verificationId?: string;
            milestoneId?: string;
            workflowId?: string;
        },
    ) { }
}

export class PaymentCompletedEvent {
    constructor(
        public readonly paymentId: string,
        public readonly tenantId: string,
        public readonly completedAt: Date,
        public readonly metadata: {
            milestoneId?: string;
        },
    ) { }
}

export class PaymentFailedEvent {
    constructor(
        public readonly paymentId: string,
        public readonly tenantId: string,
        public readonly failureReason: string,
        public readonly metadata: {
            milestoneId?: string;
            verificationId?: string;
        },
    ) { }
}
