/**
 * Sync result interface
 * Returned by all sync operations to indicate success/failure
 */
export interface SyncResult {
    success: boolean;
    externalId?: string;
    message?: string;
    error?: string;
    warnings?: string[];
    metadata?: Record<string, any>;
}

/**
 * Import parameters for fetching data from accounting systems
 */
export interface ImportParams {
    tenantId: string;
    filters?: {
        updatedAfter?: Date;
        createdAfter?: Date;
        limit?: number;
        offset?: number;
        search?: string;
        status?: string[];
    };
}

/**
 * Customer data structure (platform format)
 */
export interface Customer {
    id?: string;
    external_id?: string;
    name: string;
    email?: string;
    phone?: string;
    company_name?: string;
    billing_address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    shipping_address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    tax_id?: string;
    credit_limit?: number;
    payment_terms?: string;
    currency?: string;
    metadata?: Record<string, any>;
}

/**
 * Invoice data structure (platform format)
 */
export interface Invoice {
    id?: string;
    external_id?: string;
    invoice_number: string;
    customer_id: string;
    customer_external_id?: string;
    invoice_date: Date;
    due_date: Date;
    line_items: InvoiceLineItem[];
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    status: string;
    notes?: string;
    terms?: string;
    metadata?: Record<string, any>;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    tax_amount?: number;
    amount: number;
    product_id?: string;
    account_code?: string;
}

/**
 * Payment data structure (platform format)
 */
export interface Payment {
    id?: string;
    external_id?: string;
    invoice_id: string;
    invoice_external_id?: string;
    amount: number;
    payment_date: Date;
    payment_method: string;
    reference_number?: string;
    notes?: string;
    metadata?: Record<string, any>;
}

/**
 * Refund data structure
 */
export interface Refund {
    id?: string;
    external_id?: string;
    payment_id: string;
    payment_external_id?: string;
    amount: number;
    refund_date: Date;
    reason?: string;
    notes?: string;
    metadata?: Record<string, any>;
}

/**
 * Chart of Accounts entry
 */
export interface ChartOfAccount {
    id?: string;
    external_id?: string;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
    parent_code?: string;
    is_active: boolean;
    description?: string;
}

/**
 * General Ledger account
 */
export interface GLAccount {
    id?: string;
    external_id?: string;
    account_code: string;
    account_name: string;
    account_type: string;
    balance: number;
    currency: string;
}

/**
 * Journal Entry
 */
export interface JournalEntry {
    id?: string;
    external_id?: string;
    entry_number: string;
    entry_date: Date;
    description: string;
    lines: JournalEntryLine[];
    total_debit: number;
    total_credit: number;
    status: string;
}

/**
 * Journal Entry Line
 */
export interface JournalEntryLine {
    account_code: string;
    debit_amount: number;
    credit_amount: number;
    description?: string;
    dimension1?: string; // Cost center, department, etc.
    dimension2?: string;
}

/**
 * Bank Entry
 */
export interface BankEntry {
    id?: string;
    external_id?: string;
    transaction_date: Date;
    description: string;
    debit_amount: number;
    credit_amount: number;
    balance: number;
    bank_account_code: string;
    reference_number?: string;
    reconciled: boolean;
}

/**
 * Trial Balance
 */
export interface TrialBalance {
    as_of_date: Date;
    accounts: TrialBalanceAccount[];
    total_debit: number;
    total_credit: number;
}

/**
 * Trial Balance Account
 */
export interface TrialBalanceAccount {
    account_code: string;
    account_name: string;
    debit_balance: number;
    credit_balance: number;
}

/**
 * Base accounting connector interface
 * 
 * All accounting system connectors must implement this interface
 * Provides standardized methods for sync operations across different systems
 * 
 * @example
 * ```typescript
 * class TallyConnector extends BaseAccountingConnector {
 *   async connect(config: AccountingConfig): Promise<void> {
 *     // Implementation specific to Tally
 *   }
 * }
 * ```
 */
export abstract class BaseAccountingConnector {
    /**
     * Connector name (e.g., 'tally', 'zoho', 'quickbooks')
     */
    abstract readonly name: string;

    /**
     * Connector version
     */
    abstract readonly version: string;

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    /**
     * Establish connection to accounting system
     * @param config - Accounting configuration with credentials
     * @throws Error if connection fails
     */
    abstract connect(config: any): Promise<void>;

    /**
     * Disconnect from accounting system
     */
    abstract disconnect(): Promise<void>;

    /**
     * Test connection to accounting system
     * @returns Connection test result with latency
     */
    abstract testConnection(): Promise<{
        success: boolean;
        latency_ms?: number;
        version?: string;
        error?: string;
    }>;

    // ==========================================
    // CUSTOMER/PARTY MASTER
    // ==========================================

    /**
     * Import customers from accounting system
     * @param params - Import parameters with filters
     * @returns Array of customers in platform format
     */
    abstract importCustomers(params: ImportParams): Promise<Customer[]>;

    /**
     * Sync single customer to accounting system
     * @param customer - Customer data in platform format
     * @returns Sync result with external ID
     */
    abstract syncCustomer(customer: Customer): Promise<SyncResult>;

    /**
     * Update existing customer in accounting system
     * @param customer - Customer data with external_id
     * @returns Sync result
     */
    abstract updateCustomer(customer: Customer): Promise<SyncResult>;

    /**
     * Delete customer from accounting system (if supported)
     * @param externalId - External customer ID
     * @returns Sync result
     */
    abstract deleteCustomer(externalId: string): Promise<SyncResult>;

    // ==========================================
    // INVOICE/SALES VOUCHER
    // ==========================================

    /**
     * Import invoices from accounting system
     * @param params - Import parameters
     * @returns Array of invoices in platform format
     */
    abstract importInvoices(params: ImportParams): Promise<Invoice[]>;

    /**
     * Sync invoice to accounting system
     * @param invoice - Invoice data in platform format
     * @returns Sync result with external ID
     */
    abstract syncInvoice(invoice: Invoice): Promise<SyncResult>;

    /**
     * Update existing invoice
     * @param invoice - Invoice data with external_id
     * @returns Sync result
     */
    abstract updateInvoice(invoice: Invoice): Promise<SyncResult>;

    /**
     * Delete invoice (if supported)
     * @param externalId - External invoice ID
     * @returns Sync result
     */
    abstract deleteInvoice(externalId: string): Promise<SyncResult>;

    // ==========================================
    // PAYMENT/RECEIPT VOUCHER
    // ==========================================

    /**
     * Sync payment receipt to accounting system
     * @param payment - Payment data in platform format
     * @returns Sync result with external ID
     */
    abstract syncPayment(payment: Payment): Promise<SyncResult>;

    /**
     * Sync refund to accounting system
     * @param refund - Refund data in platform format
     * @returns Sync result
     */
    abstract syncRefund(refund: Refund): Promise<SyncResult>;

    // ==========================================
    // GL & RECONCILIATION (Module 17)
    // ==========================================

    /**
     * Import chart of accounts
     * @returns Array of chart of account entries
     */
    abstract importChartOfAccounts(): Promise<ChartOfAccount[]>;

    /**
     * Sync journal entry to accounting system
     * @param entry - Journal entry data
     * @returns Sync result
     */
    abstract syncJournalEntry(entry: JournalEntry): Promise<SyncResult>;

    /**
     * Import trial balance
     * @param asOfDate - Date for trial balance
     * @returns Trial balance data
     */
    abstract importTrialBalance(asOfDate?: Date): Promise<TrialBalance>;

    /**
     * Sync bank entry for reconciliation
     * @param entry - Bank entry data
     * @returns Sync result
     */
    abstract syncBankEntry(entry: BankEntry): Promise<SyncResult>;

    /**
     * Import GL accounts
     * @returns Array of GL accounts
     */
    abstract importGLAccounts(): Promise<GLAccount[]>;

    // ==========================================
    // DATA MAPPING
    // ==========================================

    /**
     * Map platform invoice to accounting system format
     * @param platformInvoice - Invoice in platform format
     * @returns Invoice in accounting system format
     */
    abstract mapInvoice(platformInvoice: Invoice): any;

    /**
     * Map platform payment to accounting system format
     * @param platformPayment - Payment in platform format
     * @returns Payment in accounting system format
     */
    abstract mapPayment(platformPayment: Payment): any;

    /**
     * Map platform customer to accounting system format
     * @param platformCustomer - Customer in platform format
     * @returns Customer in accounting system format
     */
    abstract mapCustomer(platformCustomer: Customer): any;

    // ==========================================
    // UTILITIES
    // ==========================================

    /**
     * Get connector capabilities
     * @returns Object describing what this connector supports
     */
    getCapabilities(): {
        supportsCustomers: boolean;
        supportsInvoices: boolean;
        supportsPayments: boolean;
        supportsRefunds: boolean;
        supportsGL: boolean;
        supportsJournalEntries: boolean;
        supportsBankReconciliation: boolean;
        supportsBidirectionalSync: boolean;
        supportsWebhooks: boolean;
        supportsRealTimeSync: boolean;
    } {
        // Default implementation - override in specific connectors
        return {
            supportsCustomers: true,
            supportsInvoices: true,
            supportsPayments: true,
            supportsRefunds: true,
            supportsGL: true,
            supportsJournalEntries: true,
            supportsBankReconciliation: true,
            supportsBidirectionalSync: true,
            supportsWebhooks: false,
            supportsRealTimeSync: false,
        };
    }
}
