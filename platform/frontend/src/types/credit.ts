export interface CreditScore {
    score: number; // 300-900
    rating: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
    lastUpdated: string;
    factors: {
        name: string;
        impact: 'POSITIVE' | 'NEGATIVE';
        description: string;
    }[];
}

export interface CreditLimit {
    totalLimit: number;
    usedAmount: number;
    availableAmount: number;
    currency: string;
}
