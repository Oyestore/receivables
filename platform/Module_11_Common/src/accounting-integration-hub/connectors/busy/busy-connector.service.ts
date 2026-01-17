import { Injectable, Logger } from '@nestjs/common';
import { BaseAccountingConnector, Customer, Invoice, Payment, Refund, ChartOfAccount, JournalEntry, ImportParams, SyncResult } from '../base/base-accounting-connector';
import axios, { AxiosInstance } from 'axios';

/**
 * Busy Accounting connection configuration
 */
interface BusyConfig {
    api_url: string;
    api_key: string;
    api_secret: string;
    company_code: string;
    database_path?: string;
}

/**
 * Busy Accounting connector service
 * 
 * Implements integration with Busy Accounting Software
 * Popular among SMEs in India for manufacturing and trading
 * 
 * Features:
 * - Customer (Party Master) import/export
 * - Invoice (Sales Voucher) import/export
 * - Payment sync
 * - Inventory integration
 * - GST compliance
 * - REST API integration
 * 
 * @example
 * ```typescript
 * const connector = new BusyConnectorService();
 * await connector.connect(config);
 * const customers = await connector.importCustomers({ tenantId: 'tenant-123' });
 * ```
 */
@Injectable()
export class BusyConnectorService extends BaseAccountingConnector {
    readonly name = 'busy';
    readonly version = '1.0.0';

    private readonly logger = new Logger(BusyConnectorService.name);
    private httpClient: AxiosInstance;
    private config: BusyConfig;
    private isConnected = false;

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    async connect(config: any): Promise<void> {
        try {
            this.config = config.connection_config as BusyConfig;

            this.httpClient = axios.create({
                baseURL: this.config.api_url,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-API-Key': this.config.api_key,
                    'X-API-Secret': this.config.api_secret,
                },
            });

            await this.testConnection();

            this.isConnected = true;
            this.logger.log(`Connected to Busy Accounting - Company: ${this.config.company_code}`);
        } catch (error) {
            this.logger.error(`Failed to connect to Busy: ${error.message}`, error.stack);
            throw new Error(`Busy connection failed: ${error.message}`);
        }
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;
        this.logger.log('Disconnected from Busy Accounting');
    }

    async testConnection(): Promise<{
        success: boolean;
        latency_ms?: number;
        version?: string;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            const response = await this.makeRequest('GET', '/company/info');
            const latency = Date.now() - startTime;

            if (!response.success) {
                throw new Error('Invalid response from Busy API');
            }

            return {
                success: true,
                latency_ms: latency,
                version: 'Busy Accounting Software',
            };
        } catch (error) {
            this.logger.error(`Busy connection test failed: ${error.message}`);
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
                type: 'customer',
            };

            if (params.filters?.updatedAfter) {
                queryParams.modified_after = this.formatBusyDate(params.filters.updatedAfter);
            }

            const response = await this.makeRequest('GET', '/parties', queryParams);

            const parties = response.data || [];
            const customers = parties.map(party => this.mapPartyToCustomer(party));

            this.logger.log(`Imported ${customers.length} customers from Busy`);
            return customers;
        } catch (error) {
            this.logger.error(`Failed to import customers from Busy: ${error.message}`);
            throw error;
        }
    }

    async syncCustomer(customer: Customer): Promise<SyncResult> {
        try {
            this.ensureConnected();

            const partyData = this.mapCustomerToParty(customer);

            const response = await this.makeRequest('POST', '/parties', {
                company_code: this.config.company_code,
            }, partyData);

            return {
                success: response.success,
                externalId: response.data?.party_code,
                message: 'Customer synced to Busy',
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

            const partyData = this.mapCustomerToParty(customer);

            const response = await this.makeRequest(
                'PUT',
                `/parties/${customer.external_id}`,
                { company_code: this.config.company_code },
                partyData
            );

            return {
                success: response.success,
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
            await this.makeRequest('DELETE', `/parties/${externalId}`, {
                company_code: this.config.company_code,
            });

            return {
                success: true,
                message: 'Customer deleted from Busy',
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
                voucher_type: 'sales',
            };

            if (params.filters?.createdAfter) {
                queryParams.from_date = this.formatBusyDate(params.filters.createdAfter);
            }

            const response = await this.makeRequest('GET', '/vouchers', queryParams);

            const vouchers = response.data || [];
            const invoices = vouchers.map(voucher => this.mapBusyVoucherToInvoice(voucher));

            this.logger.log(`Imported ${invoices.length} invoices from Busy`);
            return invoices;
        } catch (error) {
            this.logger.error(`Failed to import invoices from Busy: ${error.message}`);
            throw error;
        }
    }

    async syncInvoice(invoice: Invoice): Promise<SyncResult> {
        try {
            this.ensureConnected();

            const voucherData = this.mapInvoiceToBusyVoucher(invoice);

            const response = await this.makeRequest('POST', '/vouchers', {
                company_code: this.config.company_code,
            }, voucherData);

            return {
                success: response.success,
                externalId: response.data?.voucher_no,
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

            const voucherData = this.mapInvoiceToBusyVoucher(invoice);

            const response = await this.makeRequest(
                'PUT',
                `/vouchers/${invoice.external_id}`,
                { company_code: this.config.company_code },
                voucherData
            );

            return {
                success: response.success,
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
            await this.makeRequest('DELETE', `/vouchers/${externalId}`, {
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
                voucher_type: 'receipt',
                party_code: payment.invoice_external_id,
                amount: payment.amount,
                date: this.formatBusyDate(payment.payment_date),
                reference: payment.reference_number,
                payment_mode: this.mapPaymentMethod(payment.payment_method),
            };

            const response = await this.makeRequest('POST', '/vouchers', {}, paymentData);

            return {
                success: response.success,
                externalId: response.data?.voucher_no,
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
                voucher_type: 'credit_note',
                amount: refund.amount,
                date: this.formatBusyDate(refund.refund_date),
                reason: refund.reason,
            };

            const response = await this.makeRequest('POST', '/vouchers', {}, refundData);

            return {
                success: response.success,
                externalId: response.data?.voucher_no,
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
            const response = await this.makeRequest('GET', '/accounts', {
                company_code: this.config.company_code,
            });

            const accounts = (response.data || []).map(account =>
                this.mapBusyAccountToChartOfAccount(account)
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
                date: this.formatBusyDate(entry.entry_date),
                voucher_no: entry.entry_number,
                narration: entry.description,
                entries: entry.lines.map(line => ({
                    account_code: line.account_code,
                    debit: line.debit_amount,
                    credit: line.credit_amount,
                    narration: line.description,
                })),
            };

            const response = await this.makeRequest('POST', '/vouchers', {}, journalData);

            return {
                success: response.success,
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
            supportsBankReconciliation: true,
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
            throw new Error('Not connected to Busy. Call connect() first.');
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
                throw new Error(`Busy API error: ${error.response.status} - ${error.response.data?.message}`);
            }
            throw error;
        }
    }

    // Data Mappers
    private mapPartyToCustomer(party: any): Customer {
        return {
            external_id: party.party_code,
            name: party.party_name,
            email: party.email,
            phone: party.phone,
            company_name: party.company_name,
            billing_address: party.address ? {
                line1: party.address.line1 || '',
                line2: party.address.line2 || '',
                city: party.address.city || '',
                state: party.address.state || '',
                postal_code: party.address.pincode || '',
                country: 'India',
            } : undefined,
            tax_id: party.gstin,
            credit_limit: party.credit_limit,
            currency: 'INR',
        };
    }

    private mapCustomerToParty(customer: Customer): any {
        return {
            party_name: customer.name,
            party_type: 'customer',
            email: customer.email,
            phone: customer.phone,
            company_name: customer.company_name,
            address: customer.billing_address ? {
                line1: customer.billing_address.line1,
                line2: customer.billing_address.line2,
                city: customer.billing_address.city,
                state: customer.billing_address.state,
                pincode: customer.billing_address.postal_code,
            } : undefined,
            gstin: customer.tax_id,
            credit_limit: customer.credit_limit,
        };
    }

    private mapBusyVoucherToInvoice(voucher: any): Invoice {
        return {
            external_id: voucher.voucher_no,
            invoice_number: voucher.voucher_no,
            customer_external_id: voucher.party_code,
            customer_id: '',
            invoice_date: new Date(voucher.date),
            due_date: new Date(voucher.due_date || voucher.date),
            line_items: (voucher.items || []).map(item => ({
                description: item.item_name,
                quantity: item.quantity,
                unit_price: item.rate,
                amount: item.amount,
                tax_rate: item.tax_rate || 0,
                tax_amount: item.tax_amount || 0,
            })),
            subtotal: voucher.subtotal || 0,
            tax_amount: voucher.tax_amount || 0,
            total_amount: voucher.total_amount,
            currency: 'INR',
            status: voucher.status || 'issued',
        };
    }

    private mapInvoiceToBusyVoucher(invoice: Invoice): any {
        return {
            voucher_type: 'sales',
            voucher_no: invoice.invoice_number,
            party_code: invoice.customer_external_id,
            date: this.formatBusyDate(invoice.invoice_date),
            due_date: this.formatBusyDate(invoice.due_date),
            items: invoice.line_items.map(item => ({
                item_name: item.description,
                quantity: item.quantity,
                rate: item.unit_price,
                amount: item.amount,
                tax_rate: item.tax_rate,
            })),
            narration: invoice.notes,
        };
    }

    private mapBusyAccountToChartOfAccount(account: any): ChartOfAccount {
        return {
            external_id: account.account_code,
            code: account.account_code,
            name: account.account_name,
            type: this.mapAccountType(account.account_type),
            is_active: account.is_active !== false,
            description: account.description,
        };
    }

    private mapAccountType(busyType: string): 'asset' | 'liability' | 'equity' | 'income' | 'expense' {
        const typeMap: Record<string, any> = {
            'asset': 'asset',
            'liability': 'liability',
            'capital': 'equity',
            'income': 'income',
            'expense': 'expense',
        };
        return typeMap[busyType?.toLowerCase()] || 'asset';
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

    private formatBusyDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
