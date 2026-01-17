import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface QuickBooksTokens {
    accessToken: string;
    refreshToken: string;
    realmId: string;
    expiresAt: Date;
}

export interface QuickBooksInvoice {
    id: string;
    docNumber: string;
    customerRef: { value: string; name: string };
    totalAmt: number;
    balance: number;
    dueDate: string;
    txnDate: string;
    lineItems: Array<{
        description: string;
        amount: number;
        quantity: number;
    }>;
}

export interface SyncResult {
    synced: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails?: string[];
}

/**
 * QuickBooks Accounting Integration
 * Bidirectional sync for invoices, payments, and customers
 */
@Injectable()
export class QuickBooksService {
    private readonly logger = new Logger(QuickBooksService.name);
    private readonly httpClient: AxiosInstance;

    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly environment: 'sandbox' | 'production';

    constructor(private readonly configService: ConfigService) {
        this.clientId = this.configService.get<string>('QUICKBOOKS_CLIENT_ID');
        this.clientSecret = this.configService.get<string>('QUICKBOOKS_CLIENT_SECRET');
        this.redirectUri = this.configService.get<string>('QUICKBOOKS_REDIRECT_URI');
        this.environment = this.configService.get<string>('QUICKBOOKS_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';

        const baseURL = this.environment === 'production'
            ? 'https://quickbooks.api.intuit.com'
            : 'https://sandbox-quickbooks.api.intuit.com';

        this.httpClient = axios.create({
            baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        this.logger.log(`QuickBooks Service initialized (${this.environment})`);
    }

    /**
     * Get OAuth2 authorization URL
     */
    getAuthorizationUrl(state: string): string {
        const authUrl = this.environment === 'production'
            ? 'https://appcenter.intuit.com/connect/oauth2'
            : 'https://appcenter.intuit.com/connect/oauth2';

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'com.intuit.quickbooks.accounting',
            state,
        });

        return `${authUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokens(authorizationCode: string): Promise<QuickBooksTokens> {
        try {
            const response = await axios.post(
                'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authorizationCode,
                    redirect_uri: this.redirectUri,
                }),
                {
                    auth: {
                        username: this.clientId,
                        password: this.clientSecret,
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            this.logger.log('QuickBooks tokens obtained successfully');

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                realmId: response.data.realmId,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
            };
        } catch (error) {
            this.logger.error(`QuickBooks token exchange error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken: string): Promise<QuickBooksTokens> {
        const response = await axios.post(
            'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
            {
                auth: {
                    username: this.clientId,
                    password: this.clientSecret,
                },
            },
        );

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            realmId: response.data.realmId,
            expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        };
    }

    /**
     * Sync invoices from QuickBooks to Platform
     */
    async syncInvoicesFromQuickBooks(
        tokens: QuickBooksTokens,
        sinceDate?: Date,
    ): Promise<SyncResult> {
        try {
            // Build query
            let query = `SELECT * FROM Invoice`;
            if (sinceDate) {
                query += ` WHERE MetaData.LastUpdatedTime > '${sinceDate.toISOString()}'`;
            }
            query += ` MAXRESULTS 1000`;

            const response = await this.httpClient.get(
                `/v3/company/${tokens.realmId}/query`,
                {
                    params: { query },
                    headers: {
                        'Authorization': `Bearer ${tokens.accessToken}`,
                    },
                },
            );

            const invoices: QuickBooksInvoice[] = response.data.QueryResponse.Invoice || [];

            this.logger.log(`Fetched ${invoices.length} invoices from QuickBooks`);

            // In production, save these to database
            // For now, just return count
            return {
                synced: invoices.length,
                created: invoices.length,
                updated: 0,
                errors: 0,
            };
        } catch (error) {
            this.logger.error(`QuickBooks sync error: ${error.message}`);
            return {
                synced: 0,
                created: 0,
                updated: 0,
                errors: 1,
                errorDetails: [error.message],
            };
        }
    }

    /**
     * Push invoice to QuickBooks
     */
    async pushInvoiceToQuickBooks(
        tokens: QuickBooksTokens,
        invoiceData: {
            customerRef: { value: string; name: string };
            docNumber: string;
            txnDate: string;
            dueDate: string;
            lineItems: Array<{
                description: string;
                amount: number;
                quantity: number;
            }>;
        },
    ): Promise<{ id: string; success: boolean }> {
        try {
            const payload = {
                CustomerRef: invoiceData.customerRef,
                DocNumber: invoiceData.docNumber,
                TxnDate: invoiceData.txnDate,
                DueDate: invoiceData.dueDate,
                Line: invoiceData.lineItems.map((item, index) => ({
                    DetailType: 'SalesItemLineDetail',
                    Amount: item.amount,
                    Description: item.description,
                    SalesItemLineDetail: {
                        Qty: item.quantity,
                        UnitPrice: item.amount / item.quantity,
                    },
                })),
            };

            const response = await this.httpClient.post(
                `/v3/company/${tokens.realmId}/invoice`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${tokens.accessToken}`,
                    },
                },
            );

            this.logger.log(`Invoice pushed to QuickBooks: ${response.data.Invoice.Id}`);

            return {
                id: response.data.Invoice.Id,
                success: true,
            };
        } catch (error) {
            this.logger.error(`QuickBooks push invoice error: ${error.message}`);
            return {
                id: null,
                success: false,
            };
        }
    }

    /**
     * Push payment to QuickBooks
     */
    async pushPaymentToQuickBooks(
        tokens: QuickBooksTokens,
        paymentData: {
            customerRef: { value: string };
            totalAmt: number;
            txnDate: string;
            paymentMethodRef?: { value: string };
            linkedInvoices: Array<{
                txnId: string;
                amount: number;
            }>;
        },
    ): Promise<{ id: string; success: boolean }> {
        try {
            const payload = {
                CustomerRef: paymentData.customerRef,
                TotalAmt: paymentData.totalAmt,
                TxnDate: paymentData.txnDate,
                PaymentMethodRef: paymentData.paymentMethodRef,
                Line: paymentData.linkedInvoices.map((invoice) => ({
                    Amount: invoice.amount,
                    LinkedTxn: [{
                        TxnId: invoice.txnId,
                        TxnType: 'Invoice',
                    }],
                })),
            };

            const response = await this.httpClient.post(
                `/v3/company/${tokens.realmId}/payment`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${tokens.accessToken}`,
                    },
                },
            );

            this.logger.log(`Payment pushed to QuickBooks: ${response.data.Payment.Id}`);

            return {
                id: response.data.Payment.Id,
                success: true,
            };
        } catch (error) {
            this.logger.error(`QuickBooks push payment error: ${error.message}`);
            return {
                id: null,
                success: false,
            };
        }
    }

    /**
     * Get customers from QuickBooks
     */
    async getCustomers(tokens: QuickBooksTokens): Promise<any[]> {
        const response = await this.httpClient.get(
            `/v3/company/${tokens.realmId}/query`,
            {
                params: { query: 'SELECT * FROM Customer MAXRESULTS 1000' },
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                },
            },
        );

        return response.data.QueryResponse.Customer || [];
    }

    /**
     * Test connection
     */
    async testConnection(tokens: QuickBooksTokens): Promise<boolean> {
        try {
            await this.httpClient.get(
                `/v3/company/${tokens.realmId}/companyinfo/${tokens.realmId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${tokens.accessToken}`,
                    },
                },
            );
            return true;
        } catch (error) {
            this.logger.error(`QuickBooks connection test failed: ${error.message}`);
            return false;
        }
    }
}
