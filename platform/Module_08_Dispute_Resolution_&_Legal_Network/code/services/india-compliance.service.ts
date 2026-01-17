import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisputeCase } from '../entities/dispute-case.entity';
import { MSMECase } from '../entities/msme-case.entity';
import { CollectionCase } from '../entities/collection-case.entity';

interface MSMECompliance {
    isCompliant: boolean;
    violations: string[];
    recommendations: string[];
    paymentDueDate: Date;
    delayedDays: number;
    penaltyAmount: number; // Compound interest
    msmeStatus: 'registered' | 'unregistered' | 'unknown';
}

interface RBIGuidelines {
    isApplicable: boolean;
    category: 'MSME' | 'Large_Enterprise' | 'Individual';
    paymentTerms: number; // Max allowed days
    currentDelay: number;
    isViolation: boolean;
    recommendations: string[];
}

@Injectable()
export class IndiaComplianceService {
    private readonly logger = new Logger(IndiaComplianceService.name);

    // MSME Act, 2006 parameters
    private readonly MSME_PAYMENT_TERMS_DAYS = 45; // Maximum payment period
    private readonly MSME_COMPOUND_INTEREST_RATE = 3; // 3x bank rate (simplified to 3% monthly)
    private readonly MSME_NOTIFICATION_DAYS = 15; // Days before escalation

    // RBI Guidelines for payment delays
    private readonly RBI_MSME_PAYMENT_DAYS = 45;
    private readonly RBI_LARGE_ENTERPRISE_PAYMENT_DAYS = 60;

    constructor(
        @InjectRepository(DisputeCase)
        private disputeCaseRepo: Repository<DisputeCase>,
        @InjectRepository(MSMECase)
        private msmeCaseRepo: Repository<MSMECase>,
        @InjectRepository(CollectionCase)
        private collectionCaseRepo: Repository<CollectionCase>,
    ) { }

    /**
     * Check MSME Act compliance for a dispute
     */
    async checkMSMECompliance(disputeId: string, tenantId: string): Promise<MSMECompliance> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new Error(`Dispute ${disputeId} not found`);
        }

        // Check if buyer is MSME registered
        const msmeStatus = await this.checkMSMERegistration(tenantId);

        // Calculate payment due date (assuming invoice date + 45 days)
        const paymentDueDate = new Date(dispute.createdAt);
        paymentDueDate.setDate(paymentDueDate.getDate() + this.MSME_PAYMENT_TERMS_DAYS);

        // Calculate delayed days
        const today = new Date();
        const delayedDays = Math.max(
            0,
            Math.floor((today.getTime() - paymentDueDate.getTime()) / (1000 * 60 * 60 * 24)),
        );

        // Calculate penalty (compound interest)
        const penaltyAmount = this.calculateMSMEPenalty(
            Number(dispute.disputedAmount),
            delayedDays,
        );

        // Check violations
        const violations: string[] = [];
        const recommendations: string[] = [];

        if (msmeStatus === 'registered') {
            if (delayedDays > 0) {
                violations.push(
                    `Payment delayed by ${delayedDays} days beyond MSME Act limit of ${this.MSME_PAYMENT_TERMS_DAYS} days`,
                );
                violations.push(`Compound interest penalty of ₹${penaltyAmount.toLocaleString()} applicable`);
                recommendations.push('Immediate payment required to avoid legal action under MSME Act');
                recommendations.push('Buyer may face MSME Samadhaan escalation');
            }

            if (delayedDays > this.MSME_NOTIFICATION_DAYS) {
                recommendations.push('File complaint with MSME Samadhaan portal');
                recommendations.push('Notify buyer of potential legal proceedings');
            }

            if (delayedDays > 90) {
                violations.push('Case eligible for facilitation/conciliation/arbitration under MSME Act');
                recommendations.push('Recommend filing with Micro and Small Enterprises Facilitation Council');
            }
        }

        const isCompliant = violations.length === 0;

        if (!isCompliant) {
            this.logger.warn(
                `MSME compliance violations found for dispute ${dispute.caseNumber}: ${violations.length} violations`,
            );
        }

        return {
            isCompliant,
            violations,
            recommendations,
            paymentDueDate,
            delayedDays,
            penaltyAmount,
            msmeStatus,
        };
    }

    /**
     * Check RBI guidelines compliance
     */
    async checkRBICompliance(disputeId: string, tenantId: string): Promise<RBIGuidelines> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new Error(`Dispute ${disputeId} not found`);
        }

        // Determine category
        const msmeStatus = await this.checkMSMERegistration(dispute.customerId);
        const category = msmeStatus === 'registered' ? 'MSME' : 'Large_Enterprise';

        // Get applicable payment terms
        const paymentTerms =
            category === 'MSME'
                ? this.RBI_MSME_PAYMENT_DAYS
                : this.RBI_LARGE_ENTERPRISE_PAYMENT_DAYS;

        // Calculate current delay
        const invoiceDate = dispute.createdAt;
        const today = new Date();
        const currentDelay = Math.floor(
            (today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const isViolation = currentDelay > paymentTerms;
        const isApplicable = true; // RBI guidelines apply to all

        const recommendations: string[] = [];

        if (isViolation) {
            recommendations.push(
                `Payment exceeds RBI guidelines of ${paymentTerms} days for ${category}`,
            );
            recommendations.push('Escalate to senior management for resolution');

            if (category === 'MSME') {
                recommendations.push('Consider MSME Act provisions for recovery');
            } else {
                recommendations.push('Initiate formal collection procedures');
            }
        } else {
            const daysRemaining = paymentTerms - currentDelay;
            if (daysRemaining < 15) {
                recommendations.push(`Only ${daysRemaining} days remaining within RBI guidelines`);
                recommendations.push('Send payment reminder immediately');
            }
        }

        return {
            isApplicable,
            category,
            paymentTerms,
            currentDelay,
            isViolation,
            recommendations,
        };
    }

    /**
     * Generate MSME Samadhaan portal submission data
     */
    async generateMSMESamaadhaanSubmission(disputeId: string, tenantId: string): Promise<{
        submissionData: Record<string, any>;
        requiredDocuments: string[];
        estimatedProcessingDays: number;
    }> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new Error(`Dispute ${disputeId} not found`);
        }

        const compliance = await this.checkMSMECompliance(disputeId, tenantId);

        const submissionData = {
            // Supplier details
            supplierName: 'Your Company Name', // TODO: Get from tenant
            supplierUdyamNumber: 'UDYAM-XX-XX-XXXXXXX', // TODO: Get from tenant
            supplierGSTIN: 'YOUR_GSTIN', // TODO: Get from tenant

            // Buyer details
            buyerName: dispute.customerName,
            buyerGSTIN: '', // TODO: Get from customer profile

            // Invoice details
            invoiceNumber: dispute.invoiceId,
            invoiceDate: dispute.createdAt,
            invoiceAmount: dispute.disputedAmount,
            dueDate: compliance.paymentDueDate,

            // Delay details
            delayedDays: compliance.delayedDays,
            penaltyAmount: compliance.penaltyAmount,

            // Complaint details
            complaintType: 'delayed_payment',
            description: dispute.description || `Payment delayed for invoice ${dispute.invoiceId}`,
        };

        const requiredDocuments = [
            'Udyam Registration Certificate',
            'Purchase Order / Work Order',
            'Tax Invoice / Bill of Supply',
            'Proof of Delivery (Delivery Challan / Transport Receipt)',
            'Acceptance of Goods/Services by Buyer',
            'Communication regarding payment delay',
        ];

        // MSME Samadhaan processing timeline: 90 days for conciliation, 90 days for arbitration
        const estimatedProcessingDays = 90;

        this.logger.log(`Generated MSME Samadhaan submission for dispute ${dispute.caseNumber}`);

        return {
            submissionData,
            requiredDocuments,
            estimatedProcessingDays,
        };
    }

    /**
     * Calculate MSME Act penalty (compound interest)
     */
    private calculateMSMEPenalty(principalAmount: number, delayedDays: number): number {
        if (delayedDays <= 0) return 0;

        // Compound interest: A = P(1 + r/n)^(nt)
        // Simplified: 3% monthly compounded daily
        const monthlyRate = this.MSME_COMPOUND_INTEREST_RATE / 100;
        const dailyRate = monthlyRate / 30;
        const compoundFactor = Math.pow(1 + dailyRate, delayedDays);

        const totalAmount = principalAmount * compoundFactor;
        const penalty = totalAmount - principalAmount;

        return Math.round(penalty * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Check MSME registration status for the Tenant (Supplier)
     * Returns 'registered' if the Tenant has a recorded Udyam number in previous cases.
     */
    private async checkMSMERegistration(tenantId: string): Promise<'registered' | 'unregistered' | 'unknown'> {
        try {
            // Check if there is any MSME Case where the current tenant (implied via DisputeCase) has specified Udyam number
            const previousCase = await this.msmeCaseRepo.findOne({
                where: {
                    disputeCase: {
                        tenantId: tenantId
                    }
                },
                relations: ['disputeCase'],
                order: { createdAt: 'DESC' }
            });

            if (previousCase && previousCase.supplierUdyamNumber) {
                return 'registered';
            }

            return 'unknown';
        } catch (e) {
            this.logger.error(`Failed to check MSME registration: ${(e as Error).message}`);
            return 'unknown';
        }
    }

    /**
     * Auto-file MSME Samadhaan complaint
     */
    async autoFileMSMEComplaint(disputeId: string, tenantId: string): Promise<{
        filed: boolean;
        referenceNumber?: string;
        filedDate?: Date;
        error?: string;
    }> {
        try {
            const compliance = await this.checkMSMECompliance(disputeId, tenantId);

            if (compliance.isCompliant) {
                return {
                    filed: false,
                    error: 'No MSME violations found - complaint not required',
                };
            }

            if (compliance.msmeStatus !== 'registered') {
                return {
                    filed: false,
                    error: 'MSME registration not verified',
                };
            }

            // Generate submission data
            const submission = await this.generateMSMESamaadhaanSubmission(disputeId, tenantId);

            // TODO: Integrate with actual MSME Samadhaan API
            // For now, simulate filing
            const referenceNumber = `MSEFC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const filedDate = new Date();

            this.logger.log(`Filed MSME Samadhaan complaint: ${referenceNumber}`);

            return {
                filed: true,
                referenceNumber,
                filedDate,
            };
        } catch (error) {
            this.logger.error(`Failed to file MSME complaint: ${(error as Error).message}`);
            return {
                filed: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Get India-specific legal remedies
     */
    async getIndiaLegalRemedies(disputeId: string, tenantId: string): Promise<{
        remedies: Array<{
            type: string;
            description: string;
            timeline: string;
            cost: string;
            successRate: number;
            requirements: string[];
        }>;
        recommendedRemedy: string;
    }> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new Error(`Dispute ${disputeId} not found`);
        }

        const amount = Number(dispute.disputedAmount);
        const compliance = await this.checkMSMECompliance(disputeId, tenantId);

        const remedies: Array<{
            type: string;
            description: string;
            timeline: string;
            cost: string;
            successRate: number;
            requirements: string[];
        }> = [];

        // MSME Samadhaan
        if (compliance.msmeStatus === 'registered') {
            remedies.push({
                type: 'MSME Samadhaan',
                description: 'File complaint with Micro and Small Enterprises Facilitation Council',
                timeline: '90 days for conciliation/arbitration',
                cost: 'Minimal filing fee',
                successRate: 75,
                requirements: compliance.msmeStatus === 'registered' ? [
                    'Valid Udyam Registration',
                    'Invoice and delivery proof',
                ] : ['MSME registration required'],
            });
        }

        // Arbitration
        remedies.push({
            type: 'Arbitration',
            description: 'Independent arbitration as per Arbitration and Conciliation Act, 1996',
            timeline: '6-12 months',
            cost: '2-5% of disputed amount',
            successRate: 70,
            requirements: [
                'Arbitration clause in agreement',
                'Appointment of arbitrator',
            ],
        });

        // Civil Suit
        if (amount > 100000) {
            remedies.push({
                type: 'Civil Suit',
                description: 'File suit in District/High Court',
                timeline: '2-5 years',
                cost: `Court fees + legal fees (${amount < 1000000 ? '5-10%' : '3-7%'} of amount)`,
                successRate: 65,
                requirements: [
                    'Proper cause of action',
                    'Complete documentation',
                    'Legal representation',
                ],
            });
        }

        // Summary Suit (for amounts > 3 lakhs)
        if (amount > 300000) {
            remedies.push({
                type: 'Summary Suit (Order XXXVII CPC)',
                description: 'Expedited civil suit for clear debt cases',
                timeline: '6-18 months',
                cost: 'Court fees + moderate legal fees',
                successRate: 80,
                requirements: [
                    'Written contract',
                    'Clear debt',
                    'No disputed facts',
                ],
            });
        }

        // Recovery Certificate under MSME Act
        if (compliance.msmeStatus === 'registered' && compliance.delayedDays > 90) {
            remedies.push({
                type: 'Recovery Certificate',
                description: 'Recovery as arrears of land revenue under MSME Act',
                timeline: '3-6 months after MSEFC award',
                cost: 'Minimal',
                successRate: 90,
                requirements: [
                    'MSEFC award/decision',
                    'Non-compliance by buyer',
                ],
            });
        }

        // Determine recommended remedy
        let recommendedRemedy = 'Civil Suit';

        if (compliance.msmeStatus === 'registered' && compliance.delayedDays > this.MSME_NOTIFICATION_DAYS) {
            recommendedRemedy = 'MSME Samadhaan';
        } else if (amount > 300000 && dispute.evidence && dispute.evidence.documents && dispute.evidence.documents.length >= 3) {
            recommendedRemedy = 'Summary Suit (Order XXXVII CPC)';
        } else if (amount > 100000) {
            recommendedRemedy = 'Arbitration';
        }

        return {
            remedies,
            recommendedRemedy,
        };
    }
}
