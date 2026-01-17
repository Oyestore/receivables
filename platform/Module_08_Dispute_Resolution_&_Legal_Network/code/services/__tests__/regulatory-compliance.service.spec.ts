import { Test, TestingModule } from '@nestjs/testing';
import { RegulatoryComplianceService } from '../regulatory-compliance.service';

describe('RegulatoryComplianceService', () => {
    let service: RegulatoryComplianceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RegulatoryComplianceService],
        }).compile();

        service = module.get<RegulatoryComplianceService>(RegulatoryComplianceService);
    });

    describe('FDCPA Compliance', () => {
        it('should pass for compliant communication within allowed hours', async () => {
            const action = {
                type: 'CALL' as const,
                time: new Date('2025-01-15T10:00:00'), // 10 AM
                frequency: 2,
                customerId: 'cust-123',
            };

            const result = await service.checkFDCPACompliance(action);

            expect(result.compliant).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should fail for communication outside allowed hours', async () => {
            const action = {
                type: 'CALL' as const,
                time: new Date('2025-01-15T22:00:00'), // 10 PM - outside hours
                customerId: 'cust-123',
            };

            const result = await service.checkFDCPACompliance(action);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain(
                expect.stringContaining('FDCPA_TIME_VIOLATION'),
            );
        });

        it('should fail for excessive contact frequency', async () => {
            const action = {
                type: 'EMAIL' as const,
                frequency: 5, // More than 3 per day
                customerId: 'cust-123',
            };

            const result = await service.checkFDCPACompliance(action);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain(
                expect.stringContaining('FDCPA_FREQUENCY_VIOLATION'),
            );
        });

        it('should detect prohibited language', async () => {
            const action = {
                type: 'SMS' as const,
                content: 'Pay now or face arrest',
                customerId: 'cust-123',
            };

            const result = await service.checkFDCPACompliance(action);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain(
                expect.stringContaining('FDCPA_CONTENT_VIOLATION'),
            );
        });
    });

    describe('RBI Compliance', () => {
        it('should pass for valid UPI transaction within limits', async () => {
            const transaction = {
                type: 'UPI' as const,
                amount: 50000,
                purpose: 'Invoice Payment',
                dataLocation: 'INDIA',
            };

            const result = await service.checkRBICompliance(transaction);

            expect(result.compliant).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should fail for UPI transaction exceeding limit', async () => {
            const transaction = {
                type: 'UPI' as const,
                amount: 150000, // Exceeds ₹1 Lakh limit
                purpose: 'Payment',
                dataLocation: 'INDIA',
            };

            const result = await service.checkRBICompliance(transaction);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain(
                expect.stringContaining('RBI_UPI_LIMIT'),
            );
        });

        it('should require KYC for high-value transactions', async () => {
            const transaction = {
                type: 'NEFT' as const,
                amount: 60000,
                purpose: 'Payment',
                dataLocation: 'INDIA',
            };

            const result = await service.checkRBICompliance(transaction);

            expect(result.requirements).toContain(
                expect.stringContaining('KYC verification required'),
            );
        });

        it('should enforce data localization', async () => {
            const transaction = {
                type: 'UPI' as const,
                amount: 10000,
                purpose: 'Payment',
                dataLocation: 'USA', // Not in India
            };

            const result = await service.checkRBICompliance(transaction);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain(
                expect.stringContaining('RBI_DATA_LOCALIZATION'),
            );
        });
    });

    describe('GST Compliance', () => {
        it('should validate correct GST calculation for intra-state', async () => {
            const invoice = {
                gstNumber: '12ABCDE1234F1Z5',
                amount: 10000,
                gstRate: 18,
                cgst: 900,
                sgst: 900,
                state: 'Maharashtra',
                invoiceNumber: 'INV-001',
            };

            const result = await service.validateGSTCompliance(invoice);

            expect(result.compliant).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect GST calculation errors', async () => {
            const invoice = {
                gstNumber: '12ABCDE1234F1Z5',
                amount: 10000,
                gstRate: 18,
                cgst: 800, // Wrong calculation
                sgst: 800,
                state: 'Maharashtra',
                invoiceNumber: 'INV-001',
            };

            const result = await service.validateGSTCompliance(invoice);

            expect(result.compliant).toBe(false);
            expect(result.errors).toContain(
                expect.stringContaining('GST_CALCULATION_ERROR'),
            );
        });

        it('should validate GST number format', async () => {
            const invoice = {
                gstNumber: 'INVALID', // Wrong format
                amount: 10000,
                gstRate: 18,
                cgst: 900,
                sgst: 900,
                state: 'Karnataka',
                invoiceNumber: 'INV-002',
            };

            const result = await service.validateGSTCompliance(invoice);

            expect(result.compliant).toBe(false);
            expect(result.errors).toContain(
                expect.stringContaining('GST_NUMBER_INVALID'),
            );
        });

        it('should prevent mixing CGST/SGST with IGST', async () => {
            const invoice = {
                gstNumber: '12ABCDE1234F1Z5',
                amount: 10000,
                gstRate: 18,
                cgst: 900,
                sgst: 900,
                igst: 1800, // Cannot have both
                state: 'Delhi',
                invoiceNumber: 'INV-003',
            };

            const result = await service.validateGSTCompliance(invoice);

            expect(result.compliant).toBe(false);
            expect(result.errors).toContain(
                expect.stringContaining('GST_TYPE_ERROR'),
            );
        });
    });

    describe('Comprehensive Compliance Audit', () => {
        it('should perform complete audit with scores', async () => {
            const entity = {
                type: 'DISPUTE' as const,
                entityId: 'disp-123',
                tenantId: 'tenant-1',
            };

            const result = await service.performComplianceAudit(entity);

            expect(result).toHaveProperty('overallCompliance');
            expect(result).toHaveProperty('fdcpaScore');
            expect(result).toHaveProperty('rbiScore');
            expect(result).toHaveProperty('gstScore');
            expect(result.fdcpaScore).toBeGreaterThanOrEqual(0);
            expect(result.fdcpaScore).toBeLessThanOrEqual(100);
        });
    });

    describe('Compliance Reporting', () => {
        it('should generate compliance report', async () => {
            const period = {
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-31'),
            };

            const result = await service.generateComplianceReport('tenant-1', period);

            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('violations');
            expect(result).toHaveProperty('trends');
            expect(result).toHaveProperty('pdf');
            expect(result.pdf).toBeInstanceOf(Buffer);
        });
    });
});
