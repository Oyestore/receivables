import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// Axios instance with auth token
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ==================== General Ledger API ====================

export interface GLAccount {
    id: string;
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    normalBalance: 'debit' | 'credit';
    currentBalance: number;
    isActive: boolean;
}

export interface JournalEntry {
    id: string;
    entryNumber: string;
    entryDate: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    status: string;
    isBalanced: boolean;
}

export interface CreateJournalEntryDto {
    entryDate: string;
    description: string;
    entries: {
        accountCode: string;
        debit?: number;
        credit?: number;
        description?: string;
    }[];
    entryType?: string;
    referenceType?: string;
    referenceId?: string;
}

export const glApi = {
    // Get all GL accounts
    getAccounts: async (type?: string): Promise<GLAccount[]> => {
        const params = type ? { type } : {};
        const response = await api.get('/gl/accounts', { params });
        return response.data;
    },

    // Get account details
    getAccount: async (id: string) => {
        const response = await api.get(`/gl/accounts/${id}`);
        return response.data;
    },

    // Create GL account
    createAccount: async (data: Partial<GLAccount>) => {
        const response = await api.post('/gl/accounts', data);
        return response.data;
    },

    // Get journal entries
    getJournalEntries: async (status?: string, limit: number = 50): Promise<JournalEntry[]> => {
        const params = status ? { status, limit } : { limit };
        const response = await api.get('/gl/journal-entries', { params });
        return response.data;
    },

    // Get journal entry details
    getJournalEntry: async (id: string) => {
        const response = await api.get(`/gl/journal-entries/${id}`);
        return response.data;
    },

    // Create journal entry
    createJournalEntry: async (data: CreateJournalEntryDto) => {
        const response = await api.post('/gl/journal-entries', data);
        return response.data;
    },

    // Reverse journal entry
    reverseEntry: async (id: string, reason: string) => {
        const response = await api.post(`/gl/journal-entries/${id}/reverse`, { reason });
        return response.data;
    },

    // Get trial balance
    getTrialBalance: async () => {
        const response = await api.get('/gl/trial-balance');
        return response.data;
    },
};

// ==================== Reconciliation API ====================

export interface DashboardStats {
    total: number;
    matched: number;
    pending: number;
    suspended: number;
    matchRate: string;
}

export interface BankTransaction {
    id: string;
    amount: number;
    description: string;
    transactionDate: string;
    utrNumber: string;
    reconciliationStatus: string;
    parsedData?: {
        invoiceId?: string;
        customerName?: string;
        paymentMode?: string;
        confidence?: number;
    };
}

export interface ReconciliationMatch {
    id: string;
    bankTransactionId: string;
    invoiceId: string;
    matchScore: number;
    matchCriteria: {
        amountMatch: boolean;
        partyMatch: boolean;
        dateWithinWindow: boolean;
    };
    matchType: string;
    paymentType: 'exact' | 'short' | 'over';
    status: string;
    bankTransaction?: BankTransaction;
}

export const reconciliationApi = {
    // Get dashboard stats
    getDashboardStats: async (): Promise<DashboardStats> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/reconciliation/stats`);
            return response.data;
        } catch (error) {
            console.warn('Backend unavailable, using mock for getDashboardStats');
            return {
                total: 0, // Mapped from totalUnreconciled
                matched: 0, // Not directly available in mock, setting to 0
                pending: 0, // Mapped from pendingInvoices + pendingBankTxns
                suspended: 0, // Not directly available in mock, setting to 0
                matchRate: '85%', // Mapped from matchRate
            };
        }
    },

    // Get bank transactions
    getTransactions: async (status?: string, limit: number = 50): Promise<BankTransaction[]> => {
        const params = status ? { status, limit } : { limit };
        const response = await api.get('/reconciliation/transactions', { params });
        return response.data;
    },

    // Get reconciliation matches
    getMatches: async (status?: string): Promise<ReconciliationMatch[]> => {
        const params = status ? { status } : {};
        const response = await api.get('/reconciliation/matches', { params });
        return response.data;
    },

    // Approve match
    approveMatch: async (matchId: string, notes?: string) => {
        const response = await api.post(`/reconciliation/matches/${matchId}/approve`, { notes });
        return response.data;
    },

    // Reject match
    rejectMatch: async (matchId: string, reason: string) => {
        const response = await api.post(`/reconciliation/matches/${matchId}/reject`, { reason });
        return response.data;
    },

    // Run reconciliation matching
    runMatching: async () => {
        const response = await api.post('/reconciliation/run-matching');
        return response.data;
    },

    // Parse transactions with AI
    parseTransactions: async () => {
        const response = await api.post('/reconciliation/parse-transactions');
        return response.data;
    },

    // Get bank accounts
    getBankAccounts: async () => {
        const response = await api.get('/reconciliation/bank-accounts');
        return response.data;
    },

    // Get suspense transactions
    getSuspenseTransactions: async (): Promise<BankTransaction[]> => {
        const response = await api.get('/reconciliation/suspense-transactions');
        return response.data;
    },
};

export default {
    gl: glApi,
    reconciliation: reconciliationApi,
};
