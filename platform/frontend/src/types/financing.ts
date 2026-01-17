export interface FinancingOffer {
    id: string;
    invoiceId: string;
    amount: number;
    interestRate: number;
    tenureDays: number;
    provider: string;
    status: 'AVAILABLE' | 'ACCEPTED' | 'REJECTED';
}

export interface LoanApplication {
    id: string;
    invoiceIds: string[];
    totalAmount: number;
    provider: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
    submittedAt: string;
}
