export interface DisputeCase {
    id: string;
    invoiceId: string;
    customerName: string;
    reason: string;
    status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
    createdAt: string;
}

export interface DisputeMessage {
    id: string;
    sender: 'SME' | 'CUSTOMER' | 'SUPPORT';
    text: string;
    timestamp: string;
}
