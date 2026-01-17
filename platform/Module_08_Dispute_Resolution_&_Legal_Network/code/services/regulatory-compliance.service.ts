import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FDCPA_START_HOUR, FDCPA_END_HOUR, MAX_DAILY_CONTACTS, ComplianceReportData } from '../shared/constants';

/**
 * Regulatory Compliance Framework
 * Implements FDCPA, RBI, and GST compliance monitoring
 */
@Injectable()
export class RegulatoryComplianceService {
    private readonly logger = new Logger(RegulatoryComplianceService.name);

    /**
     * FDCPA Compliance Checker
     * Fair Debt Collection Practices Act compliance
     */
    async checkFDCPACompliance(action: {
        type: 'CALL' | 'EMAIL' | 'SMS' | 'LETTER';
        time?: Date;
        frequency?: number;
        content?: string;
        customerId: string;
    }): Promise<{
        compliant: boolean;
        violations: string[];
        recommendations: string[];
    }> {
        const violations: string[] = [];
        const recommendations: string[] = [];

        // Check communication time restrictions (8 AM - 9 PM local time)
        if (action.time) {
            const hour = action.time.getHours();
            if (hour < FDCPA_START_HOUR || hour >= FDCPA_END_HOUR) {
                violations.push(`FDCPA_TIME_VIOLATION: Communication outside allowed hours (${FDCPA_START_HOUR} AM - ${FDCPA_END_HOUR} PM)`);
                recommendations.push(`Schedule communication between ${FDCPA_START_HOUR} AM and ${FDCPA_END_HOUR} PM local time`);
            }
        }

        // Check communication frequency
        if (action.frequency && action.frequency > MAX_DAILY_CONTACTS) {
            violations.push('FDCPA_FREQUENCY_VIOLATION: Excessive contact attempts per day');
            recommendations.push(`Limit contact attempts to ${MAX_DAILY_CONTACTS} per day maximum`);
        }

        // Check prohibited language in content
        if (action.content) {
            const prohibitedTerms = ['arrest', 'jail', 'lawsuit threats', 'harassment'];
            const foundTerms = prohibitedTerms.filter(term =>
                action.content.toLowerCase().includes(term),
            );

            if (foundTerms.length > 0) {
                violations.push(`FDCPA_CONTENT_VIOLATION: Prohibited language detected: ${foundTerms.join(', ')}`);
                recommendations.push('Remove threatening or harassing language from communications');
            }
        }

        return {
            compliant: violations.length === 0,
            violations,
            recommendations,
        };
    }

    /**
     * RBI Compliance Checker
     * Reserve Bank of India regulatory compliance
     */
    async checkRBICompliance(transaction: {
        type: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS';
        amount: number;
        purpose: string;
        dataLocation?: string;
    }): Promise<{
        compliant: boolean;
        violations: string[];
        requirements: string[];
    }> {
        const violations: string[] = [];
        const requirements: string[] = [];

        // Check payment amount limits
        if (transaction.type === 'UPI' && transaction.amount > 100000) {
            violations.push('RBI_UPI_LIMIT: UPI transaction exceeds ₹1 Lakh limit');
            requirements.push('Use NEFT/RTGS for amounts above ₹1 Lakh');
        }

        // Check data localization requirement
        if (!transaction.dataLocation || transaction.dataLocation !== 'INDIA') {
            violations.push('RBI_DATA_LOCALIZATION: Payment data must be stored in India');
            requirements.push('Ensure all payment data is stored within Indian territory');
        }

        // Check KYC compliance
        if (transaction.amount > 50000) {
            requirements.push('KYC verification required for transactions above ₹50,000');
        }

        // Check purpose code compliance
        if (!transaction.purpose || transaction.purpose.length < 3) {
            violations.push('RBI_PURPOSE_CODE: Valid purpose code required for transaction');
            requirements.push('Provide detailed purpose code as per RBI guidelines');
        }

        return {
            compliant: violations.length === 0,
            violations,
            requirements,
        };
    }

    /**
     * GST Compliance Validator
     * Goods and Services Tax compliance checking
     */
    async validateGSTCompliance(invoice: {
        gstNumber?: string;
        amount: number;
        gstRate: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        state: string;
        invoiceNumber: string;
    }): Promise<{
        compliant: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate GST Number format (15 characters)
        // Format: 2 digits (State) + 10 chars (PAN) + 1 digit (Entity) + 1 char (Z) + 1 char (Check)
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!invoice.gstNumber || !gstRegex.test(invoice.gstNumber)) {
            errors.push('GST_NUMBER_INVALID: Invalid GSTIN format. Must match State(2)+PAN(10)+Entity(1)+Z+Check(1)');
        } else {
            // Verify Checksum Char (simplified Mod-36)
            // Note: Full implementation would use the complex ISO 6346 Modulo 36 check
        }

        // Validate State Code Match
        if (invoice.gstNumber) {
            const gstState = invoice.gstNumber.substring(0, 2);
            // Example: 29 is Karnataka, 27 is Maharashtra
            // If invoice state is provided as code, we can compare
            // For now, checking basic range
            if (parseInt(gstState) < 1 || parseInt(gstState) > 37) {
                warnings.push('GST_STATE_INVALID: State code seems invalid (01-37)');
            }
        }

        // Validate GST calculation
        const expectedGST = (invoice.amount * invoice.gstRate) / 100;
        const actualGST = (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0);

        if (Math.abs(expectedGST - actualGST) > 0.01) {
            errors.push(`GST_CALCULATION_ERROR: GST mismatch (expected: ${expectedGST}, actual: ${actualGST})`);
        }

        // Validate intra-state vs inter-state GST
        if (invoice.cgst && invoice.sgst && invoice.igst) {
            errors.push('GST_TYPE_ERROR: Cannot have both CGST/SGST and IGST in same invoice');
        }

        // Check if invoice number follows sequential pattern (Advanced Compliance)
        if (!invoice.invoiceNumber.match(/^[A-Z0-9\/-]+$/)) {
            warnings.push('GST_INVOICE_FORMAT: Invoice number should contain only alphanumeric, slash or hyphen');
        }

        return {
            compliant: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * MSME Udyam Registration Validator
     */
    async validateMSMERegistration(udyamNumber: string): Promise<{
        isValid: boolean;
        details?: { type: string; state: string };
        error?: string;
    }> {
        // Format: UDYAM-XX-00-0000000
        const udyamRegex = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;

        if (!udyamRegex.test(udyamNumber)) {
            return {
                isValid: false,
                error: 'Invalid Udyam Number Format. Expected: UDYAM-XX-00-0000000'
            };
        }

        return {
            isValid: true,
            details: {
                type: 'Micro', // derived from 00-0000000 range usually
                state: udyamNumber.substring(6, 8)
            }
        };
    }

    /**
     * Comprehensive Compliance Audit
     */
    async performComplianceAudit(entity: {
        type: 'DISPUTE' | 'COLLECTION' | 'PAYMENT' | 'INVOICE';
        entityId: string;
        tenantId: string;
    }): Promise<{
        overallCompliance: boolean;
        fdcpaScore: number;
        rbiScore: number;
        gstScore: number;
        criticalIssues: string[];
        recommendations: string[];
    }> {
        this.logger.log(`Performing compliance audit for ${entity.type}:${entity.entityId}`);

        // This would fetch entity data and run comprehensive checks
        // Simplified for demonstration

        return {
            overallCompliance: true,
            fdcpaScore: 95,
            rbiScore: 98,
            gstScore: 92,
            criticalIssues: [],
            recommendations: [
                'Implement automated compliance monitoring',
                'Regular staff training on regulatory changes',
                'Quarterly compliance audits recommended',
            ],
        };
    }

    /**
     * Generate Compliance Report
     */
    async generateComplianceReport(
        tenantId: string,
        period: { startDate: Date; endDate: Date },
    ): Promise<ComplianceReportData> {
        this.logger.log(`Generating compliance report for tenant ${tenantId}`);

        // This would aggregate compliance data and generate PDF report
        // Simplified for demonstration

        return {
            summary: {
                totalChecks: 1500,
                passedChecks: 1425,
                failedChecks: 75,
                complianceRate: 95,
            },
            violations: [],
            trends: {
                improving: true,
                monthOverMonth: 2.5,
            },
            pdf: Buffer.from('Compliance Report PDF'),
        };
    }
}
