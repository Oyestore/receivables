/**
 * Module 07 Event Definitions
 * 
 * Events emitted by Module 07 for cross-module communication
 * Other modules can subscribe to these events
 */

// ============================================
// Application Events
// ============================================

export class ApplicationCreatedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly financingType: string,
        public readonly amount: number,
        public readonly invoiceIds?: string[],
    ) { }
}

export class ApplicationSubmittedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly partnerIds: string[],
        public readonly submittedAt: Date,
    ) { }
}

export class ApplicationApprovedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly partnerId: string,
        public readonly approvedAmount: number,
        public readonly interestRate: number,
        public readonly approvedAt: Date,
    ) { }
}

export class ApplicationRejectedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly partnerId: string,
        public readonly rejectionReason: string,
        public readonly rejectedAt: Date,
    ) { }
}

export class ApplicationDisbursedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly partnerId: string,
        public readonly disbursedAmount: number,
        public readonly disbursedAt: Date,
    ) { }
}

// ============================================
// Discount Offer Events (Dynamic Discounting)
// ============================================

export class DiscountOfferCreatedEvent {
    constructor(
        public readonly offerId: string,
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly buyerId: string,
        public readonly supplierId: string,
        public readonly discountRate: number,
        public readonly expiryDate: Date,
    ) { }
}

export class DiscountOfferAcceptedEvent {
    constructor(
        public readonly offerId: string,
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly buyerId: string,
        public readonly supplierId: string,
        public readonly discountedAmount: number,
        public readonly acceptedAt: Date,
    ) { }
}

export class DiscountOfferRejectedEvent {
    constructor(
        public readonly offerId: string,
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly supplierId: string,
        public readonly rejectedAt: Date,
    ) { }
}

export class DiscountOfferExpiredEvent {
    constructor(
        public readonly offerId: string,
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly expiredAt: Date,
    ) { }
}

// ============================================
// Partner Integration Events
// ============================================

export class PartnerOfferReceivedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly partnerId: string,
        public readonly offerId: string,
        public readonly amount: number,
        public readonly interestRate: number,
        public readonly receivedAt: Date,
    ) { }
}

export class PartnerStatusUpdatedEvent {
    constructor(
        public readonly applicationId: string,
        public readonly partnerId: string,
        public readonly externalApplicationId: string,
        public readonly oldStatus: string,
        public readonly newStatus: string,
        public readonly updatedAt: Date,
    ) { }
}

// ============================================
// Credit Note Events (Module 01 Integration)
// ============================================

export class CreditNoteRequiredEvent {
    constructor(
        public readonly invoiceId: string,
        public readonly tenantId: string,
        public readonly reason: 'early_payment_discount' | 'financing_discount',
        public readonly discountAmount: number,
        public readonly originalAmount: number,
        public readonly newAmount: number,
    ) { }
}

// ============================================
// Credit Scoring Events (Module 06 Integration)
// ============================================

export class FinancingActivityEvent {
    constructor(
        public readonly tenantId: string,
        public readonly userId: string,
        public readonly activityType: 'application_submitted' | 'loan_approved' | 'loan_disbursed' | 'loan_repaid',
        public readonly amount: number,
        public readonly partnerId: string,
        public readonly timestamp: Date,
        public readonly metadata?: Record<string, any>,
    ) { }
}

// ============================================
// Event Names (for EventEmitter2)
// ============================================

export const FINANCING_EVENTS = {
    // Application lifecycle
    APPLICATION_CREATED: 'financing.application.created',
    APPLICATION_SUBMITTED: 'financing.application.submitted',
    APPLICATION_APPROVED: 'financing.application.approved',
    APPLICATION_REJECTED: 'financing.application.rejected',
    APPLICATION_DISBURSED: 'financing.application.disbursed',

    // Discount offers
    DISCOUNT_OFFER_CREATED: 'financing.discount.created',
    DISCOUNT_OFFER_ACCEPTED: 'financing.discount.accepted',
    DISCOUNT_OFFER_REJECTED: 'financing.discount.rejected',
    DISCOUNT_OFFER_EXPIRED: 'financing.discount.expired',

    // Partner integration
    PARTNER_OFFER_RECEIVED: 'financing.partner.offer_received',
    PARTNER_STATUS_UPDATED: 'financing.partner.status_updated',

    // Cross-module integration
    CREDIT_NOTE_REQUIRED: 'financing.credit_note.required',
    FINANCING_ACTIVITY: 'financing.activity.recorded',
} as const;

export type FinancingEventName = typeof FINANCING_EVENTS[keyof typeof FINANCING_EVENTS];
