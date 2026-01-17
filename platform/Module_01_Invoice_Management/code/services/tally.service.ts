import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as xml2js from 'xml2js';

export interface TallyInvoice {
    voucherNumber: string;
    date: string;
    ledger: string;
    amount: number;
    narration: string;
    items: Array<{
        stockItem: string;
        quantity: number;
        rate: number;
        amount: number;
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
 * Tally Accounting Integration (India-specific)
 * Sync with Tally Prime via REST/XML API
 */
@Injectable()
export class TallyService {
    private readonly logger = new Logger(TallyService.name);
    private readonly httpClient: AxiosInstance;

    private readonly tallyUrl: string;
    private readonly tallyPort: number;
    private readonly companyName: string;

    constructor(private readonly configService: ConfigService) {
        this.tallyUrl = this.configService.get<string>('TALLY_URL') || 'http://localhost';
        this.tallyPort = this.configService.get<number>('TALLY_PORT') || 9000;
        this.companyName = this.configService.get<string>('TALLY_COMPANY_NAME');

        this.httpClient = axios.create({
            baseURL: `${this.tallyUrl}:${this.tallyPort}`,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/xml',
            },
        });

        this.logger.log('Tally Service initialized');
    }

    /**
     * Sync sales vouchers (invoices) from Tally
     */
    async syncSalesVouchersFromTally(
        fromDate: Date,
        toDate: Date,
    ): Promise<SyncResult> {
        try {
            // Build TDL (Tally Definition Language) XML request
            const xmlRequest = this.buildTDLRequest('Sales', fromDate, toDate);

            const response = await this.httpClient.post('', xmlRequest);

            // Parse XML response
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);

            const vouchers = this.extractVouchers(result);

            this.logger.log(`Fetched ${vouchers.length} sales vouchers from Tally`);

            // In production, save these to database
            return {
                synced: vouchers.length,
                created: vouchers.length,
                updated: 0,
                errors: 0,
            };
        } catch (error) {
            this.logger.error(`Tally sync error: ${error.message}`);
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
     * Push invoice to Tally as sales voucher
     */
    async pushInvoiceToTally(invoiceData: {
        voucherNumber: string;
        date: string;
        partyName: string;
        amount: number;
        narration: string;
        items: Array<{
            stockItem: string;
            quantity: number;
            rate: number;
        }>;
        gstRate?: number;
    }): Promise<{ success: boolean; voucherNumber?: string }> {
        try {
            // Build Tally XML for voucher creation
            const xmlVoucher = this.buildSalesVoucherXML(invoiceData);

            const response = await this.httpClient.post('', xmlVoucher);

            // Check if voucher was created successfully
            const success = response.data.includes('<CREATED>Yes</CREATED>');

            if (success) {
                this.logger.log(`Invoice pushed to Tally: ${invoiceData.voucherNumber}`);
                return {
                    success: true,
                    voucherNumber: invoiceData.voucherNumber,
                };
            }

            return { success: false };
        } catch (error) {
            this.logger.error(`Tally push error: ${error.message}`);
            return { success: false };
        }
    }

    /**
     * Push payment receipt to Tally
     */
    async pushPaymentToTally(paymentData: {
        receiptNumber: string;
        date: string;
        partyName: string;
        amount: number;
        paymentMode: string; // 'Cash', 'Bank', 'UPI', etc.
        narration: string;
        referenceInvoice?: string;
    }): Promise<{ success: boolean }> {
        try {
            const xmlReceipt = this.buildReceiptVoucherXML(paymentData);

            const response = await this.httpClient.post('', xmlReceipt);

            const success = response.data.includes('<CREATED>Yes</CREATED>');

            if (success) {
                this.logger.log(`Payment pushed to Tally: ${paymentData.receiptNumber}`);
            }

            return { success };
        } catch (error) {
            this.logger.error(`Tally payment push error: ${error.message}`);
            return { success: false };
        }
    }

    /**
     * Get ledger balance from Tally
     */
    async getLedgerBalance(ledgerName: string): Promise<number> {
        try {
            const xmlRequest = `
                <ENVELOPE>
                    <HEADER>
                        <VERSION>1</VERSION>
                        <TALLYREQUEST>Export</TALLYREQUEST>
                        <TYPE>Data</TYPE>
                        <ID>LedgerBalance</ID>
                    </HEADER>
                    <BODY>
                        <DESC>
                            <STATICVARIABLES>
                                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            </STATICVARIABLES>
                            <TDL>
                                <TDLMESSAGE>
                                    <REPORT NAME="LedgerBalance">
                                        <FORMS>LedgerBalance</FORMS>
                                    </REPORT>
                                    <FORM NAME="LedgerBalance">
                                        <PARTS>LedgerBalancePart</PARTS>
                                    </FORM>
                                    <PART NAME="LedgerBalancePart">
                                        <LINES>LedgerBalanceLine</LINES>
                                        <REPEAT>LedgerBalanceLine : Ledger</REPEAT>
                                        <SCROLLED>Vertical</SCROLLED>
                                        <FILTER>LedgerFilter</FILTER>
                                    </PART>
                                    <LINE NAME="LedgerBalanceLine">
                                        <FIELD>LedgerName,ClosingBalance</FIELD>
                                    </LINE>
                                    <FIELD NAME="LedgerName">
                                        <SET>$Name</SET>
                                    </FIELD>
                                    <FIELD NAME="ClosingBalance">
                                        <SET>$ClosingBalance</SET>
                                    </FIELD>
                                    <SYSTEM TYPE="Formulae" NAME="LedgerFilter">$$Name = "${ledgerName}"</SYSTEM>
                                </TDLMESSAGE>
                            </TDL>
                        </DESC>
                    </BODY>
                </ENVELOPE>
            `;

            const response = await this.httpClient.post('', xmlRequest);

            // Parse response to extract balance
            // Simplified - actual parsing would be more robust
            const balanceMatch = response.data.match(/<ClosingBalance>([-\d.]+)<\/ClosingBalance>/);
            const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;

            return balance;
        } catch (error) {
            this.logger.error(`Tally ledger balance error: ${error.message}`);
            return 0;
        }
    }

    /**
     * Test Tally connection
     */
    async testConnection(): Promise<boolean> {
        try {
            // Simple request to check if Tally is running and company is loaded
            const xmlRequest = `
                <ENVELOPE>
                    <HEADER>
                        <VERSION>1</VERSION>
                        <TALLYREQUEST>Export</TALLYREQUEST>
                        <TYPE>Data</TYPE>
                        <ID>CompanyInfo</ID>
                    </HEADER>
                    <BODY>
                        <DESC>
                            <STATICVARIABLES>
                                <SVCOMPANY>${this.companyName}</SVCOMPANY>
                            </STATICVARIABLES>
                        </DESC>
                    </BODY>
                </ENVELOPE>
            `;

            const response = await this.httpClient.post('', xmlRequest, { timeout: 5000 });

            return response.status === 200;
        } catch (error) {
            this.logger.error(`Tally connection test failed: ${error.message}`);
            return false;
        }
    }

    // Helper methods

    private buildTDLRequest(voucherType: string, fromDate: Date, toDate: Date): string {
        return `
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Data</TYPE>
                    <ID>VoucherExport</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            <SVCOMPANY>${this.companyName}</SVCOMPANY>
                            <SVCURRENTCOMPANY>${this.companyName}</SVCURRENTCOMPANY>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <REPORT NAME="VoucherList">
                                    <FORMS>VoucherList</FORMS>
                                </REPORT>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
        `;
    }

    private buildSalesVoucherXML(invoiceData: any): string {
        const itemsXML = invoiceData.items.map((item: any) => `
            <ALLINVENTORYENTRIES.LIST>
                <STOCKITEMNAME>${item.stockItem}</STOCKITEMNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <RATE>${item.rate}</RATE>
                <AMOUNT>-${item.rate * item.quantity}</AMOUNT>
                <ACTUALQTY>${item.quantity}</ACTUALQTY>
                <BILLEDQTY>${item.quantity}</BILLEDQTY>
            </ALLINVENTORYENTRIES.LIST>
        `).join('');

        return `
            <ENVELOPE>
                <HEADER>
                    <TALLYREQUEST>Import Data</TALLYREQUEST>
                </HEADER>
                <BODY>
                    <IMPORTDATA>
                        <REQUESTDESC>
                            <REPORTNAME>Vouchers</REPORTNAME>
                            <STATICVARIABLES>
                                <SVCURRENTCOMPANY>${this.companyName}</SVCURRENTCOMPANY>
                            </STATICVARIABLES>
                        </REQUESTDESC>
                        <REQUESTDATA>
                            <TALLYMESSAGE>
                                <VOUCHER VCHTYPE="Sales" ACTION="Create">
                                    <DATE>${invoiceData.date}</DATE>
                                    <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                                    <VOUCHERNUMBER>${invoiceData.voucherNumber}</VOUCHERNUMBER>
                                    <PARTYLEDGERNAME>${invoiceData.partyName}</PARTYLEDGERNAME>
                                    <NARRATION>${invoiceData.narration}</NARRATION>
                                    ${itemsXML}
                                    <LEDGERENTRIES.LIST>
                                        <LEDGERNAME>${invoiceData.partyName}</LEDGERNAME>
                                        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                                        <AMOUNT>${invoiceData.amount}</AMOUNT>
                                    </LEDGERENTRIES.LIST>
                                </VOUCHER>
                            </TALLYMESSAGE>
                        </REQUESTDATA>
                    </IMPORTDATA>
                </BODY>
            </ENVELOPE>
        `;
    }

    private buildReceiptVoucherXML(paymentData: any): string {
        return `
            <ENVELOPE>
                <HEADER>
                    <TALLYREQUEST>Import Data</TALLYREQUEST>
                </HEADER>
                <BODY>
                    <IMPORTDATA>
                        <REQUESTDESC>
                            <REPORTNAME>Vouchers</REPORTNAME>
                            <STATICVARIABLES>
                                <SVCURRENTCOMPANY>${this.companyName}</SVCURRENTCOMPANY>
                            </STATICVARIABLES>
                        </REQUESTDESC>
                        <REQUESTDATA>
                            <TALLYMESSAGE>
                                <VOUCHER VCHTYPE="Receipt" ACTION="Create">
                                    <DATE>${paymentData.date}</DATE>
                                    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
                                    <VOUCHERNUMBER>${paymentData.receiptNumber}</VOUCHERNUMBER>
                                    <NARRATION>${paymentData.narration}</NARRATION>
                                    <LEDGERENTRIES.LIST>
                                        <LEDGERNAME>${paymentData.paymentMode}</LEDGERNAME>
                                        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                                        <AMOUNT>${paymentData.amount}</AMOUNT>
                                    </LEDGERENTRIES.LIST>
                                    <LEDGERENTRIES.LIST>
                                        <LEDGERNAME>${paymentData.partyName}</LEDGERNAME>
                                        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                                        <AMOUNT>-${paymentData.amount}</AMOUNT>
                                    </LEDGERENTRIES.LIST>
                                </VOUCHER>
                            </TALLYMESSAGE>
                        </REQUESTDATA>
                    </IMPORTDATA>
                </BODY>
            </ENVELOPE>
        `;
    }

    private extractVouchers(xmlData: any): TallyInvoice[] {
        // Simplified extraction - actual implementation would parse full XML structure
        // This would iterate through the XML response and extract voucher data
        return [];
    }
}
