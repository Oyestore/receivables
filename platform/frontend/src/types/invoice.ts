export enum InvoiceStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    VIEWED = 'viewed',
    PAID = 'paid',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}

export enum JourneyStage {
    CREATED = '1_CREATED',
    SENT = '2_SENT',
    VIEWED = '3_VIEWED',
    ACCEPTED = '4_ACCEPTED',
    PENDING = '5_PENDING',
    DUE_SOON = '6_DUE_SOON',
    OVERDUE = '7_OVERDUE',
    CHASING = '8_CHASING',
    CRITICAL = '9_CRITICAL',
    PAID = '10_PAID',
}

export interface InvoiceLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    discountAmount: number;
    itemSubTotal: number;
}

export interface Invoice {
    id: string;
    tenantId: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: InvoiceStatus;

    // Customer
    customerId?: string;
    customerName?: string;
    customerEmail?: string;

    // Financials
    currency: string;
    subTotal: number;
    totalTaxAmount: number;
    totalDiscountAmount: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;

    // Tracking
    sentAt?: string;
    viewedAt?: string;
    paidAt?: string;

    // Journey Framework
    journeyStage: JourneyStage;
    isStuck: boolean;
    stuckReason?: string;
    daysStuck: number;

    lineItems: InvoiceLineItem[];
    createdAt: string;
    updatedAt: string;
}
