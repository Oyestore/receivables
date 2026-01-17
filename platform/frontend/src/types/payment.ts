export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

export enum PaymentMethodType {
    CARD = 'CARD',
    UPI = 'UPI',
    BANK_TRANSFER = 'BANK_TRANSFER',
}

export interface Payment {
    id: string;
    amount: number;
    currency: string;
    date: string;
    status: PaymentStatus;
    customerName: string;
    invoiceId: string;
    method: PaymentMethodType;
}

export interface PaymentMethod {
    id: string;
    type: PaymentMethodType;
    last4?: string; // For cards
    upiId?: string; // For UPI
    bankName?: string; // For bank transfer
    isDefault: boolean;
}

export interface Settlement {
    id: string;
    amount: number;
    date: string;
    status: 'PROCESSED' | 'PENDING' | 'FAILED';
    utr?: string;
}
