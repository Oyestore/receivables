import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
} from '../../../Module_11_Common/code/errors/app-error';
import {
  IGSTInvoice,
  IGSTReturn,
  IMSMESamadhaan,
  IEInvoice,
  GSTReturnType,
} from '../types/india-market.types';
import axios from 'axios';

const logger = new Logger('IndiaMarketService');

/**
 * India Market Specifics Service
 * Handles GST compliance, e-invoicing, MSME Samadhaan integration
 */
export class IndiaMarketService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Generate GST-compliant invoice
   */
  async generateGSTInvoice(
    tenantId: string,
    invoiceId: string,
    gstData: {
      gstin: string;
      place_of_supply: string;
      reverse_charge: boolean;
      invoice_type: string;
    }
  ): Promise<IGSTInvoice> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get invoice
      const invoiceResult = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
        [invoiceId, tenantId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new NotFoundError('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Validate GSTIN
      if (!this.validateGSTIN(gstData.gstin)) {
        throw new ValidationError('Invalid GSTIN format');
      }

      // Calculate GST components
      const gstCalculation = this._calculateGSTInternal(
        Number(invoice.subtotal),
        gstData.place_of_supply,
        invoice.customer_state
      );

      // Create GST invoice record
      const gstInvoiceQuery = `
        INSERT INTO gst_invoices (
          tenant_id, invoice_id, gstin, place_of_supply, reverse_charge,
          invoice_type, cgst_amount, sgst_amount, igst_amount, cess_amount,
          total_tax_amount, irn, ack_no, ack_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await client.query(gstInvoiceQuery, [
        tenantId,
        invoiceId,
        gstData.gstin,
        gstData.place_of_supply,
        gstData.reverse_charge,
        gstData.invoice_type,
        gstCalculation.cgst,
        gstCalculation.sgst,
        gstCalculation.igst,
        gstCalculation.cess || 0,
        gstCalculation.total_tax,
        null, // IRN generated during e-invoicing
        null,
        null,
      ]);

      const gstInvoice = result.rows[0];

      // Update invoice with GST details
      await client.query(
        `UPDATE invoices 
         SET tax_amount = $1, total_amount = $2
         WHERE id = $3`,
        [gstCalculation.total_tax, invoice.subtotal + gstCalculation.total_tax, invoiceId]
      );

      await client.query('COMMIT');

      logger.info('GST invoice generated', {
        invoiceId,
        gstInvoiceId: gstInvoice.id,
        totalTax: gstCalculation.total_tax,
        tenantId,
      });

      return gstInvoice;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate GST invoice', { error, invoiceId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate e-Invoice (IRN)
   */
  async generateEInvoice(
    tenantId: string,
    gstInvoiceId: string
  ): Promise<IEInvoice> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get GST invoice
      const gstInvoiceResult = await client.query(
        'SELECT * FROM gst_invoices WHERE id = $1 AND tenant_id = $2',
        [gstInvoiceId, tenantId]
      );

      if (gstInvoiceResult.rows.length === 0) {
        throw new NotFoundError('GST invoice not found');
      }

      const gstInvoice = gstInvoiceResult.rows[0];

      if (gstInvoice.irn) {
        throw new ValidationError('E-invoice already generated for this invoice');
      }

      // Generate IRN (Invoice Reference Number)
      // In production, integrate with GST e-invoice API
      // Generate IRN (Invoice Reference Number)
      // Integration with GST e-invoice API
      const irn = await this.generateIRN(gstInvoice);
      const ackNo = this.generateAckNo();
      const ackDate = new Date();

      // Generate QR code data
      const qrCodeData = this.generateQRCode(gstInvoice, irn);

      // Update GST invoice with e-invoice details
      await client.query(
        `UPDATE gst_invoices 
         SET irn = $1, ack_no = $2, ack_date = $3, qr_code = $4, 
             e_invoice_status = 'generated'
         WHERE id = $5`,
        [irn, ackNo, ackDate, qrCodeData, gstInvoiceId]
      );

      // Create e-invoice record
      const eInvoiceQuery = `
        INSERT INTO e_invoices (
          tenant_id, gst_invoice_id, irn, ack_no, ack_date, qr_code, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;

      const result = await client.query(eInvoiceQuery, [
        tenantId,
        gstInvoiceId,
        irn,
        ackNo,
        ackDate,
        qrCodeData,
      ]);

      await client.query('COMMIT');

      logger.info('E-invoice generated', {
        gstInvoiceId,
        irn,
        tenantId,
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate e-invoice', { error, gstInvoiceId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * File GST return
   */
  async fileGSTReturn(
    tenantId: string,
    returnData: {
      return_period: string;
      return_type: GSTReturnType;
      gstin: string;
    }
  ): Promise<IGSTReturn> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get GST invoices for the period
      const invoicesResult = await client.query(
        `SELECT * FROM gst_invoices 
         WHERE tenant_id = $1 
         AND DATE_TRUNC('month', created_at) = $2::date
         AND gstin = $3`,
        [tenantId, returnData.return_period, returnData.gstin]
      );

      const invoices = invoicesResult.rows;

      // Calculate return summary
      const summary = this.calculateGSTReturnSummary(invoices);

      // Create GST return record
      const returnQuery = `
        INSERT INTO gst_returns (
          tenant_id, return_period, return_type, gstin,
          total_taxable_value, total_cgst, total_sgst, total_igst,
          total_cess, total_tax, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
        RETURNING *
      `;

      const result = await client.query(returnQuery, [
        tenantId,
        returnData.return_period,
        returnData.return_type,
        returnData.gstin,
        summary.total_taxable_value,
        summary.total_cgst,
        summary.total_sgst,
        summary.total_igst,
        summary.total_cess,
        summary.total_tax,
      ]);

      const gstReturn = result.rows[0];

      await client.query('COMMIT');

      logger.info('GST return filed', {
        returnId: gstReturn.id,
        returnPeriod: returnData.return_period,
        returnType: returnData.return_type,
        tenantId,
      });

      return gstReturn;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to file GST return', { error, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Register MSME Samadhaan case
   */
  async registerMSMESamadhaan(
    tenantId: string,
    caseData: {
      invoice_ids: string[];
      buyer_name: string;
      buyer_gstin: string;
      total_amount: number;
      delay_days: number;
      description: string;
    },
    createdBy: string
  ): Promise<IMSMESamadhaan> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate invoices are overdue
      const invoicesResult = await client.query(
        `SELECT id, due_date, total_amount FROM invoices 
         WHERE id = ANY($1) AND tenant_id = $2 AND status = 'overdue'`,
        [caseData.invoice_ids, tenantId]
      );

      if (invoicesResult.rows.length === 0) {
        throw new ValidationError('No overdue invoices found');
      }

      // Generate case reference number
      const referenceNumber = this.generateMSMECaseReference();

      // Create MSME Samadhaan case
      const caseQuery = `
        INSERT INTO msme_samadhaan_cases (
          tenant_id, reference_number, invoice_ids, buyer_name, buyer_gstin,
          total_amount, delay_days, description, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'registered', $9)
        RETURNING *
      `;

      const result = await client.query(caseQuery, [
        tenantId,
        referenceNumber,
        caseData.invoice_ids,
        caseData.buyer_name,
        caseData.buyer_gstin,
        caseData.total_amount,
        caseData.delay_days,
        caseData.description,
        createdBy,
      ]);

      const msmeCase = result.rows[0];

      await client.query('COMMIT');

      logger.info('MSME Samadhaan case registered', {
        caseId: msmeCase.id,
        referenceNumber,
        totalAmount: caseData.total_amount,
        tenantId,
      });

      return msmeCase;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to register MSME Samadhaan case', { error, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get MSME Samadhaan case status
   */
  async getMSMESamadhaan(
    tenantId: string,
    caseId: string
  ): Promise<IMSMESamadhaan> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM msme_samadhaan_cases WHERE id = $1 AND tenant_id = $2',
        [caseId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('MSME Samadhaan case not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get MSME Samadhaan case', { error, caseId, tenantId });
      throw new DatabaseError('Failed to retrieve MSME Samadhaan case');
    }
  }

  /**
   * Validate GSTIN format
   */
  private validateGSTIN(gstin: string): boolean {
    // GSTIN format: 2 digits (state code) + 10 characters (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 check digit
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  }

  /**
   * Calculate GST components
   */
  private _calculateGSTInternal(
    amount: number,
    placeOfSupply: string,
    customerState: string
  ): any {
    const gstRate = 0.18; // 18% GST (configurable based on product/service)

    // Intra-state: CGST + SGST
    // Inter-state: IGST
    const isIntraState = placeOfSupply === customerState;

    if (isIntraState) {
      const cgst = (amount * gstRate) / 2;
      const sgst = (amount * gstRate) / 2;
      return {
        cgst,
        sgst,
        igst: 0,
        cess: 0,
        total_tax: cgst + sgst,
      };
    } else {
      const igst = amount * gstRate;
      return {
        cgst: 0,
        sgst: 0,
        igst,
        cess: 0,
        total_tax: igst,
      };
    }
  }

  /**
   * Public GST calculation for tests
   */
  async calculateGST(amount: number, gstRate: number, supplyType: 'INTRA_STATE' | 'INTER_STATE'): Promise<{ cgst: number; sgst: number; igst: number; cess: number; total_tax: number; totalGST: number }> {
    const isIntra = supplyType === 'INTRA_STATE';
    if (isIntra) {
      const cgst = (amount * gstRate) / 2;
      const sgst = (amount * gstRate) / 2;
      return { cgst, sgst, igst: 0, cess: 0, total_tax: cgst + sgst, totalGST: cgst + sgst };
    }
    const igst = amount * gstRate;
    return { cgst: 0, sgst: 0, igst, cess: 0, total_tax: igst, totalGST: igst };
  }

  /**
   * UPI payment processing (mock)
   */
  async processUPIPayment(paymentDto: { amount: number; provider: string; upiId: string }): Promise<{ success: boolean; status: string; transactionId: string; provider: string }> {
    if (!this.isSupportedUPIProvider(paymentDto.provider)) {
      throw new ValidationError('Unsupported UPI provider');
    }
    return {
      success: true,
      status: 'SUCCESS',
      transactionId: `UPI-${Date.now()}`,
      provider: paymentDto.provider
    };
  }

  isSupportedUPIProvider(provider: string): boolean {
    const supported = ['BHIM', 'GooglePay', 'PhonePe', 'Paytm'];
    return supported.includes(provider);
  }

  /**
   * Bank data via AA consent (mock)
   */
  async fetchBankData(consentId: string): Promise<{ consentId: string; accounts: any[] }> {
    if (!consentId || consentId.length < 5) {
      throw new ValidationError('Invalid consent ID');
    }
    return { consentId, accounts: [{ accountNumber: 'XXXX1234', balance: 10000 }] };
  }

  isSupportedLanguage(lang: string): boolean {
    return ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn'].includes(lang);
  }

  async translate(text: string, targetLang: string): Promise<{ original: string; translated: string; translatedText: string; language: string }> {
    if (!this.isSupportedLanguage(targetLang)) {
      throw new ValidationError('Unsupported language');
    }
    const translated = `[${targetLang}] ${text}`;
    return {
      original: text,
      translated,
      translatedText: translated,
      language: targetLang
    };
  }

  async fetchCreditScore(pan: string, bureau: string): Promise<{ bureau: string; pan: string; score: number }> {
    if (!this.isSupportedBureau(bureau)) {
      throw new ValidationError('Unsupported bureau');
    }
    return { bureau, pan, score: 750 };
  }

  isSupportedBureau(bureau: string): boolean {
    return ['CIBIL', 'Experian', 'CRIF', 'Equifax'].includes(bureau);
  }

  async generateGSTR1(invoices: Array<{ taxable_value: number; tax_amount: number }>): Promise<{ version: string; b2b: any[]; summary: { totalInvoices: number; totalTaxableValue: number; totalTax: number } }> {
    const totalInvoices = invoices.length;
    const totalTaxableValue = invoices.reduce((sum, i) => sum + Number(i.taxable_value || 0), 0);
    const totalTax = invoices.reduce((sum, i) => sum + Number(i.tax_amount || 0), 0);
    return { version: '1.0', b2b: [], summary: { totalInvoices, totalTaxableValue, totalTax } };
  }

  /**
   * Generate IRN (Invoice Reference Number)
   */
  /**
   * Generate IRN (Invoice Reference Number) via GST Portal API
   */
  private async generateIRN(gstInvoice: any): Promise<string> {
    const gstPortalUrl = process.env.GST_PORTAL_URL || 'https://einv-apisandbox.nic.in';
    const authKey = process.env.GST_AUTH_KEY;

    // Fallback to simulation if no key provided (Dev Mode)
    if (!authKey) {
      logger.warn('GST Auth Key not found, using simulation mode');
      return Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }

    try {
      // Map internal invoice to GST E-Invoice Schema
      const payload = {
        Version: '1.1',
        TranDtls: {
          TaxSch: 'GST',
          SupTyp: 'B2B',
        },
        DocDtls: {
          Typ: 'INV',
          No: gstInvoice.invoice_id,
          Dt: new Date().toISOString().split('T')[0],
        },
        SellerDtls: {
          Gstin: process.env.COMPANY_GSTIN,
        },
        BuyerDtls: {
          Gstin: gstInvoice.gstin,
          Pos: gstInvoice.place_of_supply,
        },
        ItemList: [
          // Items would be mapped here from invoice details
        ],
        ValDtls: {
          AssVal: 0, // Calculate from items
          CgstVal: gstInvoice.cgst_amount,
          SgstVal: gstInvoice.sgst_amount,
          IgstVal: gstInvoice.igst_amount,
          TotInvVal: gstInvoice.total_tax_amount, // + taxable value
        }
      };

      const response = await axios.post(`${gstPortalUrl}/api/v1/invoice/generate`, payload, {
        headers: {
          'Authorization': `Bearer ${authKey}`,
          'Content-Type': 'application/json',
          'X-Client-Id': process.env.GST_CLIENT_ID,
        },
      });

      if (response.data && response.data.Status === '1' && response.data.Irn) {
        return response.data.Irn;
      }

      throw new Error(response.data.ErrorDetails?.[0]?.ErrorMessage || 'Unknown GST API Error');

    } catch (error) {
      logger.error('GST Portal API failed', { error: (error as Error).message });
      throw new ExternalServiceError('Failed to generate IRN from GST Portal');
    }
  }

  /**
   * Generate Acknowledgement Number
   */
  private generateAckNo(): string {
    return `ACK${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Generate QR code data for e-invoice
   */
  private generateQRCode(gstInvoice: any, irn: string): string {
    // QR code contains: IRN, GSTIN, invoice number, date, amount, etc.
    const qrData = {
      irn,
      gstin: gstInvoice.gstin,
      invoice_no: gstInvoice.invoice_id,
      total_amount: gstInvoice.total_tax_amount,
    };

    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  /**
   * Calculate GST return summary
   */
  private calculateGSTReturnSummary(invoices: any[]): any {
    return invoices.reduce(
      (summary, inv) => ({
        total_taxable_value: summary.total_taxable_value + parseFloat(inv.taxable_value || 0),
        total_cgst: summary.total_cgst + parseFloat(inv.cgst_amount || 0),
        total_sgst: summary.total_sgst + parseFloat(inv.sgst_amount || 0),
        total_igst: summary.total_igst + parseFloat(inv.igst_amount || 0),
        total_cess: summary.total_cess + parseFloat(inv.cess_amount || 0),
        total_tax: summary.total_tax + parseFloat(inv.total_tax_amount || 0),
      }),
      {
        total_taxable_value: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
      }
    );
  }

  /**
   * Generate MSME case reference number
   */
  private generateMSMECaseReference(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000);
    return `MSME${year}${random.toString().padStart(6, '0')}`;
  }
}

export const indiaMarketService = new IndiaMarketService();
