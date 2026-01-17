import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { UAETaxService, UAETaxCategory } from '../Module_13_Cross_Border_Trade/src/services/uae-tax.service';

describe('UAETaxService (Deterministic)', () => {
  let app: INestApplication;
  let tax: UAETaxService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [UAETaxService],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    tax = app.get(UAETaxService);
  });
  afterAll(async () => { await app.close(); });

  it('calculates VAT for standard and zero-rated', () => {
    const std = tax.calculateVAT(100, UAETaxCategory.STANDARD);
    expect(std.vatRate).toBe(5);
    expect(std.vatAmount).toBe(5);
    const zero = tax.calculateVAT(100, UAETaxCategory.ZERO_RATED);
    expect(zero.vatAmount).toBe(0);
  });

  it('validates TRN format', () => {
    expect(tax.isValidTRN('123456789012345')).toBe(true);
    expect(tax.isValidTRN('invalid')).toBe(false);
  });

  it('generates invoice totals', () => {
    const invoice = tax.generateUAEInvoice({
      supplierName: 'Supplier',
      supplierTRN: '123456789012345',
      supplierAddress: 'Dubai',
      buyerName: 'Buyer',
      buyerAddress: 'Abu Dhabi',
      invoiceNumber: 'INV-1',
      invoiceDate: new Date('2025-01-01'),
      supplyDate: new Date('2025-01-02'),
      lineItems: [
        { description: 'Item', quantity: 2, unitPrice: 100, taxCategory: UAETaxCategory.STANDARD }
      ],
      currency: 'AED'
    });
    expect(invoice.totals.totalExcludingVAT).toBe(200);
    expect(invoice.totals.totalVAT).toBe(10);
    expect(invoice.totals.totalIncludingVAT).toBe(210);
    expect(typeof invoice.qrCode).toBe('string');
  });

  it('determines tax category and VAT return summary', () => {
    const cat = tax.determineTaxCategory({ isExport: true, isGCCBuyer: false, buyerHasTRN: false, isFreeZone: false, supplyType: 'goods' });
    expect(cat).toBe(UAETaxCategory.ZERO_RATED);
    const summary = tax.calculateVATReturnSummary([
      { amount: 100, vatAmount: 5, category: UAETaxCategory.STANDARD, type: 'sales' },
      { amount: 50, vatAmount: 2.5, category: UAETaxCategory.STANDARD, type: 'purchase' },
    ]);
    expect(summary.outputVAT).toBeGreaterThan(0);
    expect(['PAYABLE','REFUND']).toContain(summary.payableOrRefund);
  });
});
