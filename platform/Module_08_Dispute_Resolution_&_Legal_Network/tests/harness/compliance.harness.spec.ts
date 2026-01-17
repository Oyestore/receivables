
import { Test, TestingModule } from '@nestjs/testing';
import { RegulatoryComplianceService } from '../../code/services/regulatory-compliance.service';
import { Logger } from '@nestjs/common';

/**
 * Deterministic Harness for Dispute Resolution & Legal Network Module
 * (Regulatory Compliance)
 * 
 * Scenarios:
 * 1. FDCPA Compliance Check (Time, Frequency, Content)
 * 2. RBI Compliance Check (UPI Limits, Data Localization)
 * 3. GST Compliance Validator (Format, Calculation)
 */
describe('Compliance Module Harness', () => {
    let complianceService: RegulatoryComplianceService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RegulatoryComplianceService,
                Logger,
            ],
        }).compile();

        complianceService = module.get<RegulatoryComplianceService>(RegulatoryComplianceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('FDCPA Compliance', () => {
        it('should detect time violation', async () => {
            const action = {
                type: 'CALL' as const,
                time: new Date('2023-01-01T23:00:00'), // 11 PM
                customerId: 'cust-1',
            };
            const result = await complianceService.checkFDCPACompliance(action);
            expect(result.compliant).toBe(false);
            expect(result.violations[0]).toContain('FDCPA_TIME_VIOLATION');
        });

        it('should detect prohibited language', async () => {
            const action = {
                type: 'EMAIL' as const,
                content: 'We will send you to jail if you do not pay',
                customerId: 'cust-1',
            };
            const result = await complianceService.checkFDCPACompliance(action);
            expect(result.compliant).toBe(false);
            expect(result.violations[0]).toContain('FDCPA_CONTENT_VIOLATION');
        });
    });

    describe('RBI Compliance', () => {
        it('should check UPI limit', async () => {
            const transaction = {
                type: 'UPI' as const,
                amount: 150000, // > 1 Lakh
                purpose: 'Payment',
                dataLocation: 'INDIA',
            };
            const result = await complianceService.checkRBICompliance(transaction);
            expect(result.compliant).toBe(false);
            expect(result.violations[0]).toContain('RBI_UPI_LIMIT');
        });

        it('should check data localization', async () => {
            const transaction = {
                type: 'NEFT' as const,
                amount: 1000,
                purpose: 'Payment',
                dataLocation: 'USA',
            };
            const result = await complianceService.checkRBICompliance(transaction);
            expect(result.compliant).toBe(false);
            expect(result.violations[0]).toContain('RBI_DATA_LOCALIZATION');
        });
    });

    describe('GST Compliance', () => {
        it('should validate GST number format', async () => {
            const invoice = {
                gstNumber: 'INVALID',
                amount: 1000,
                gstRate: 18,
                state: 'Delhi',
                invoiceNumber: 'INV-001',
            };
            const result = await complianceService.validateGSTCompliance(invoice);
            expect(result.compliant).toBe(false);
            expect(result.errors[0]).toContain('GST_NUMBER_INVALID');
        });

        it('should validate GST calculation', async () => {
            const invoice = {
                gstNumber: '22AAAAA0000A1Z5',
                amount: 1000,
                gstRate: 18, // Expected tax 180
                cgst: 90,
                sgst: 90,
                igst: 0,
                state: 'Delhi',
                invoiceNumber: 'INV-001',
            };
            const result = await complianceService.validateGSTCompliance(invoice);
            expect(result.compliant).toBe(true);
        });

        it('should detect GST mismatch', async () => {
            const invoice = {
                gstNumber: '22AAAAA0000A1Z5',
                amount: 1000,
                gstRate: 18, // Expected tax 180
                cgst: 80, // Wrong
                sgst: 80,
                igst: 0,
                state: 'Delhi',
                invoiceNumber: 'INV-001',
            };
            const result = await complianceService.validateGSTCompliance(invoice);
            expect(result.compliant).toBe(false);
            expect(result.errors[0]).toContain('GST_CALCULATION_ERROR');
        });
    });
});
