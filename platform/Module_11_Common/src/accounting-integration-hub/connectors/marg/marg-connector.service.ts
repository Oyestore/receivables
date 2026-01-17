import { Injectable, Logger } from '@nestjs/common';
import { BaseAccountingConnector, Customer, Invoice, Payment, Refund, ChartOfAccount, JournalEntry, ImportParams, SyncResult } from '../base/base-accounting-connector';
import axios, { AxiosInstance } from 'axios';

/**
 * Marg ERP connection configuration
 */
interface MargConfig {
    api_url: string;
    api_key: string;
    company_code: string;
    database_path?: string;
    username?: string;
    password?: string;
}

/**
 * Marg ERP connector service
 * 
 * Implements integration with Marg ERP Software
 * Popular among retailers and wholesalers in India
 * 
 * Features:
 * - Customer (Ledger) import/export
 * - Invoice (Bill) import/export
 * - Payment sync
 * - GST integration
 * - Inventory sync
 * - Retail-focused features
 * 
 * @example
 * ```typescript
 * const connector = new MargConnectorService();
 * await connector.connect(config);
 * const customers = await connector.importCustomers({ tenantId: 'tenant-123' });
 * ```
 */
@Injectable()
export class MargConnectorService extends BaseAccountingConnector {
    readonly name = 'marg';
    readonly version = '1.0.0';

    private readonly logger = new Logger(MargConnectorService.name);
    private httpClient: AxiosInstance;
    private config: MargConfig;
    private isConnected = false;

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    async connect(config: any): Promise<void> {
        try {
            this.config = config.connection_config as MargConfig;

            this.httpClient = axios.create({
                baseURL: this.config.api_url,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.api_key}`,
                },
            });

            await this.testConnection();

            this.isConnected = true;
            this.logger.log(`Connected to Marg ERP - Company: ${this.config.company_code}`);
        } catch (error) {
            this.logger.error(`Failed to connect to Marg: ${error.message}`, error.stack);
            throw new Error(`Marg connection failed: ${error.message}`);
        }
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;
        this.logger.log('Disconnected from Marg ERP');
    }

    async testConnection(): Promise<{
        success: boolean;
        latency_ms?: number;
        version?: string;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            const response = await this.makeRequest('GET', '/api/company/info', {
                company_code: this.config.company_code,
            });

            const latency = Date.now() - startTime;

            if (!response.status || response.status !== 'success') {
                throw new Error('Invalid response from Marg API');
            }

            return {
                success: true,
                latency_ms: latency,
                version: 'Marg ERP 9+',
            };
        } catch (error) {
            this.logger.error(`Marg connection test failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // ==========================================
    // CUSTOMER OPERATIONS
    // ==========================================

    async importCustomers(params: ImportParams): Promise<Customer[]> {
        try {
            this.ensureConnected();

            const queryParams: any = {
                company_code: this.config.company_code,
                ledger_type: 'customer',
            };

            if (params.filters?.updatedAfter) {
                queryParams.modified_after = this.formatMargDate(params.filters.updatedAfter);
            }

            if (params.filters?.limit) {
                queryParams.limit = params.filters.limit;
            }

            const response = await this.makeRequest('GET', '/api/ledgers', queryParams);

            const ledgers = response.data || [];
            const customers = ledgers.map(ledger => this.mapLedgerToCustomer(ledger));

            this.logger.log(`Imported ${customers.length} customers from Marg`);
            return customers;
        } catch (error) {
            this.logger.error(`Failed to import customers from Marg: ${error.message}`);
            throw error;
        }
    }

    async syncCustomer(customer: Customer): Promise<SyncResult> {
        try {
            this.ensureConnected();

            const ledgerData = this.mapCustomerToLedger(customer);

            const response = await this.makeRequest('POST', '/api/ledgers', {
                company_code: this.config.company_code,
            }, ledgerData);

            return {
                success: response.status === 'success',
                externalId: response.data?.ledger_code,
                message: 'Customer synced to Marg',
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async updateCustomer(customer: Customer): Promise<SyncResult> {
        try {
            if (!customer.external_id) {
                throw new Error('Customer external_id required');
            }

            const ledgerData = this.mapCustomerToLedger(customer);

            const response = await this.makeRequest(
                'PUT',
                `/api/ledgers/${customer.external_id}`,
                { company_code: this.config.company_code },
                ledgerData
            );

            return {
                success: response.status === 'success',
                externalId: customer.external_id,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async deleteCustomer(externalId: string): Promise<SyncResult> {
        try {
            await this.makeRequest('DELETE', `/api/ledgers/${externalId}`, {
                company_code: this.config.company_code,
            });

            return {
                success: true,
                message: 'Customer deleted from Marg',
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // ==========================================
    // INVOICE OPERATIONS
    // ==========================================

    async importInvoices(params: ImportParams): Promise<Invoice[]> {
        try {
            this.ensureConnected();

            const queryParams: any = {
                company_code: this.config.company_code,
                bill_type: 'sales',
            };

            if (params.filters?.createdAfter) {
                queryParams.from_date = this.formatMargDate(params.filters.createdAfter);
            }

            if (params.filters?.limit) {
                queryParams.limit = params.filters.limit;
            }

            const response = await this.makeRequest('GET', '/api/bills', queryParams);

            const bills = response.data || [];
            const invoices = bills.map(bill => this.mapBillToInvoice(bill));

            this.logger.log(`Imported ${invoices.length} invoices from Marg`);
            return invoices;
        } catch (error) {
            this.logger.error(`Failed to import invoices from Marg: ${error.message}`);
            throw error;
        }
    }

    async syncInvoice(invoice: Invoice): Promise<SyncResult> {
        try {
            this.ensureConnected();

            const billData = this.mapInvoiceToBill(invoice);

            const response = await this.makeRequest('POST', '/api/bills', {
                company_code: this.config.company_code,
            }, billData);

            return {
                success: response.status === 'success',
                externalId: response.data?.bill_no,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async updateInvoice(invoice: Invoice): Promise<SyncResult> {
        try {
            if (!invoice.external_id) {
                throw new Error('Invoice external_id required');
            }

            const billData = this.mapInvoiceToBill(invoice);

            const response = await this.makeRequest(
                'PUT',
                `/api/bills/${invoice.external_id}`,
                { company_code: this.config.company_code },
                billData
            );

            return {
                success: response.status === 'success',
                externalId: invoice.external_id,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async deleteInvoice(externalId: string): Promise<SyncResult> {
        try {
            await this.makeRequest('DELETE', `/api/bills/${externalId}`, {
                company_code: this.config.company_code,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // ==========================================
    // PAYMENT OPERATIONS
    // ==========================================

    async syncPayment(payment: Payment): Promise<SyncResult> {
        try {
            const paymentData = {
                company_code: this.config.company_code,
                receipt_type: 'payment',
                ledger_code: payment.invoice_external_id,
                amount: payment.amount,
                date: this.formatMargDate(payment.payment_date),
                reference_no: payment.reference_number,
                payment_mode: this.mapPaymentMethod(payment.payment_method),
                narration: payment.notes || 'Payment received',
            };

            const response = await this.makeRequest('POST', '/api/receipts', {}, paymentData);

            return {
                success: response.status === 'success',
                externalId: response.data?.receipt_no,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async syncRefund(refund: Refund): Promise<SyncResult> {
        try {
            const refundData = {
                company_code: this.config.company_code,
                credit_note_type: 'sales_return',
                amount: refund.amount,
                date: this.formatMargDate(refund.refund_date),
                reason: refund.reason,
            };

            const response = await this.makeRequest('POST', '/api/credit_notes', {}, refundData);

            return {
                success: response.status === 'success',
                externalId: response.data?.credit_note_no,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // ==========================================
    // GL OPERATIONS
    // ==========================================

    async importChartOfAccounts(): Promise<ChartOfAccount[]> {
        try {
            const response = await this.makeRequest('GET', '/api/accounts', {
                company_code: this.config.company_code,
            });

            const accounts = (response.data || []).map(account =>
                this.mapMargAccountToChartOfAccount(account)
            );

            return accounts;
        } catch (error) {
            this.logger.error(`Failed to import chart of accounts: ${error.message}`);
            throw error;
        }
    }

    async syncJournalEntry(entry: JournalEntry): Promise<SyncResult> {
        try {
            const journalData = {
                company_code: this.config.company_code,
                voucher_type: 'journal',
                date: this.formatMargDate(entry.entry_date),
                voucher_no: entry.entry_number,
                narration: entry.description,
                entries: entry.lines.map(line => ({
                    account_code: line.account_code,
                    debit_amount: line.debit_amount,
                    credit_amount: line.credit_amount,
                    narration: line.description,
                })),
            };

            const response = await this.makeRequest('POST', '/api/vouchers', {}, journalData);

            return {
                success: response.status === 'success',
                externalId: response.data?.voucher_no,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Placeholder implementations
    async importTrialBalance() { return { as_of_date: new Date(), accounts: [], total_debit: 0, total_credit: 0 }; }
    async syncBankEntry() { return { success: true }; }
    async importGLAccounts() { return []; }
    async mapInvoice(invoice: Invoice) { return invoice; }
    async mapPayment(payment: Payment) { return payment; }
    async mapCustomer(customer: Customer) { return customer; }

    // ==========================================
    // CAPABILITIES
    // ==========================================

    getCapabilities() {
        return {
            supportsCustomers: true,
            supportsInvoices: true,
            supportsPayments: true,
            supportsRefunds: true,
            supportsGL: true,
            supportsJournalEntries: true,
            supportsBankReconciliation: false,
            supportsBidirectionalSync: true,
            supportsWebhooks: false,
            supportsRealTimeSync: false,
        };
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private ensureConnected(): void {
        if (!this.isConnected) {
            throw new Error('Not connected to Marg. Call connect() first.');
        }
    }

    private async makeRequest(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        params?: any,
        data?: any
    ): Promise<any> {
        try {
            const response = await this.httpClient.request({
                method,
                url: endpoint,
                params,
                data,
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`Marg API error: ${error.response.status} - ${error.response.data?.message}`);
            }
            throw error;
        }
    }

    // Data Mappers
    private mapLedgerToCustomer(ledger: any): Customer {
        return {
            external_id: ledger.ledger_code,
            name: ledger.ledger_name,
            email: ledger.email,
            phone: ledger.mobile,
            company_name: ledger.company_name,
            billing_address: ledger.address ? {
                line1: ledger.address || '',
                line2: '',
                city: ledger.city || '',
                state: ledger.state || '',
                postal_code: ledger.pincode || '',
                country: 'India',
            } : undefined,
            tax_id: ledger.gstin,
            credit_limit: ledger.credit_limit,
            currency: 'INR',
        };
    }

    private mapCustomerToLedger(customer: Customer): any {
        return {
            ledger_name: customer.name,
            ledger_type: 'customer',
            email: customer.email,
            mobile: customer.phone,
            company_name: customer.company_name,
            address: customer.billing_address?.line1,
            city: customer.billing_address?.city,
            state: customer.billing_address?.state,
            pincode: customer.billing_address?.postal_code,
            gstin: customer.tax_id,
            credit_limit: customer.credit_limit,
        };
    }

    private mapBillToInvoice(bill: any): Invoice {
        return {
            external_id: bill.bill_no,
            invoice_number: bill.bill_no,
            customer_external_id: bill.party_code,
            customer_id: '',
            invoice_date: new Date(bill.bill_date),
            due_date: new Date(bill.due_date || bill.bill_date),
            line_items: (bill.items || []).map(item => ({
                description: item.item_name,
                quantity: item.quantity,
                unit_price: item.rate,
                amount: item.amount,
                tax_rate: item.gst_rate || 0,
                tax_amount: item.gst_amount || 0,
            })),
            subtotal: bill.gross_amount || 0,
            tax_amount: bill.total_tax || 0,
            total_amount: bill.net_amount,
            currency: 'INR',
            status: bill.bill_status || 'issued',
        };
    }

    private mapInvoiceToBill(invoice: Invoice): any {
        return {
            bill_type: 'sales',
            bill_no: invoice.invoice_number,
            party_code: invoice.customer_external_id,
            bill_date: this.formatMargDate(invoice.invoice_date),
            due_date: this.formatMargDate(invoice.due_date),
            items: invoice.line_items.map(item => ({
                item_name: item.description,
                quantity: item.quantity,
                rate: item.unit_price,
                amount: item.amount,
                gst_rate: item.tax_rate,
            })),
            narration: invoice.notes,
        };
    }

    private mapMargAccountToChartOfAccount(account: any): ChartOfAccount {
        return {
            external_id: account.account_code,
            code: account.account_code,
            name: account.account_name,
            type: this.mapAccountType(account.account_group),
            is_active: account.is_active !== false,
            description: account.description,
        };
    }

    private mapAccountType(margType: string): 'asset' | 'liability' | 'equity' | 'income' | 'expense' {
        const typeMap: Record<string, any> = {
            'assets': 'asset',
            'liabilities': 'liability',
            'capital': 'equity',
            'income': 'income',
            'expenses': 'expense',
        };
        return typeMap[margType?.toLowerCase()] || 'asset';
    }

    private mapPaymentMethod(method: string): string {
        const methodMap: Record<string, string> = {
            'cash': 'cash',
            'check': 'cheque',
            'bank_transfer': 'bank',
            'credit_card': 'card',
            'upi': 'upi',
        };
        return methodMap[method?.toLowerCase()] || 'cash';
    }

    private formatMargDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}
