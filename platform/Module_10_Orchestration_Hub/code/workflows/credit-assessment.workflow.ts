/**
 * Credit Assessment Automation Workflow
 * 
 * Automates comprehensive credit assessment for new and existing customers
 * Coordinates across multiple modules to gather data and make credit decisions
 * 
 * Steps:
 * 1. Gather customer data (Module 01 - transaction history)
 * 2. Fetch payment history (Module 03 - payment patterns)
 * 3. Run credit scoring models (Module 06 - AI-driven scoring)
 * 4. Check external credit bureaus (if configured)
 * 5. Apply business rules and constraints
 * 6. Calculate recommended credit limit
 * 7. Route for approval if needed
 * 8. Update customer credit profile
 * 9. Notify relevant teams
 * 
 * Features:
 * - Automated data aggregation
 * - ML-based credit scoring
 * - Manual review routing for edge cases
 * - Configurable approval thresholds
 * - Audit trail generation
 */

import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
    // Customer & Invoice data
    getCustomerTransactionHistory,
    getInvoicesByCustomer,

    // Payment history
    getCustomerPaymentHistory,
    calculatePaymentReliability,

    // Credit scoring
    getCreditScore,
    assessCreditRisk,
    calculateOptimalCreditLimit,

    // Notifications
    sendEmailNotification,

    // Logging
    logActivity,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
    retry: {
        initialInterval: '2s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

// Signal for manual approval
export const manualApprovalSignal = defineSignal<[{ approved: boolean; approvedBy: string; comments?: string }]>('manualApproval');

export interface CreditAssessmentInput {
    tenantId: string;
    customerId: string;
    assessmentType: 'new_customer' | 'periodic_review' | 'limit_increase_request';
    requestedCreditLimit?: number;
    userId: string;
    correlationId: string;
    requireManualApproval?: boolean;
}

export interface CreditAssessmentOutput {
    workflowId: string;
    status: 'approved' | 'rejected' | 'manual_review_required' | 'failed';
    creditScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedCreditLimit: number;
    currentCreditLimit?: number;
    approvedCreditLimit?: number;
    paymentReliabilityScore: number;
    manualReviewRequired: boolean;
    manuallyApproved?: boolean;
    approvalComments?: string;
    assessmentFactors: {
        transactionVolume: number;
        paymentHistory: string;
        averageInvoiceValue: number;
        overdueRate: number;
        totalOutstanding: number;
    };
    totalDuration: number;
    errors?: string[];
}

/**
 * Credit Assessment Automation Workflow
 */
export async function creditAssessmentWorkflow(
    input: CreditAssessmentInput
): Promise<CreditAssessmentOutput> {
    const startTime = Date.now();
    const errors: string[] = [];
    let manualReviewRequired = false;
    let manuallyApproved: boolean | undefined;
    let approvalComments: string | undefined;

    // Set up manual approval signal handler
    setHandler(manualApprovalSignal, ({ approved, approvedBy, comments }) => {
        manuallyApproved = approved;
        approvalComments = comments || `Manually ${approved ? 'approved' : 'rejected'} by ${approvedBy}`;
        logActivity('Manual approval received', {
            approved,
            approvedBy,
            comments,
        });
    });

    try {
        await logActivity('Starting credit assessment workflow', {
            customerId: input.customerId,
            assessmentType: input.assessmentType,
        });

        // Step 1: Gather customer transaction history
        await logActivity('Step 1: Gathering customer transaction data', {});

        const transactionHistory = await getCustomerTransactionHistory({
            tenantId: input.tenantId,
            customerId: input.customerId,
            periodMonths: 12,
        });

        const invoices = await getInvoicesByCustomer({
            tenantId: input.tenantId,
            customerId: input.customerId,
        });

        await logActivity('Transaction data gathered', {
            totalTransactions: transactionHistory.transactionCount,
            totalInvoices: invoices.length,
        });

        // Step 2: Fetch payment history
        await logActivity('Step 2: Analyzing payment history', {});

        const paymentHistory = await getCustomerPaymentHistory({
            tenantId: input.tenantId,
            customerId: input.customerId,
            periodMonths: 12,
        });

        const paymentReliability = await calculatePaymentReliability({
            tenantId: input.tenantId,
            customerId: input.customerId,
            paymentHistory,
        });

        await logActivity('Payment analysis complete', {
            reliabilityScore: paymentReliability.score,
            onTimePaymentRate: paymentReliability.onTimeRate,
        });

        // Step 3: Run credit scoring models
        await logActivity('Step 3: Running credit scoring models', {});

        const creditScoreResult = await getCreditScore({
            tenantId: input.tenantId,
            customerId: input.customerId,
        });

        const riskAssessment = await assessCreditRisk({
            tenantId: input.tenantId,
            customerId: input.customerId,
            transactionVolume: transactionHistory.totalVolume,
            paymentReliability: paymentReliability.score,
            currentScore: creditScoreResult.score,
        });

        await logActivity('Credit scoring complete', {
            creditScore: creditScoreResult.score,
            riskLevel: riskAssessment.riskLevel,
        });

        // Step 4: Calculate assessment factors
        const totalOutstanding = invoices
            .filter(inv => ['sent', 'overdue', 'partially_paid'].includes(inv.status))
            .reduce((sum, inv) => sum + inv.amount_due, 0);

        const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
        const overdueRate = invoices.length > 0 ? (overdueInvoices / invoices.length) * 100 : 0;

        const averageInvoiceValue =
            invoices.length > 0
                ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length
                : 0;

        const assessmentFactors = {
            transactionVolume: transactionHistory.totalVolume,
            paymentHistory: paymentReliability.onTimeRate >= 90 ? 'excellent' :
                paymentReliability.onTimeRate >= 75 ? 'good' :
                    paymentReliability.onTimeRate >= 60 ? 'fair' : 'poor',
            averageInvoiceValue,
            overdueRate,
            totalOutstanding,
        };

        await logActivity('Assessment factors calculated', assessmentFactors);

        // Step 5: Calculate recommended credit limit
        await logActivity('Step 5: Calculating optimal credit limit', {});

        const optimalLimit = await calculateOptimalCreditLimit({
            tenantId: input.tenantId,
            customerId: input.customerId,
            creditScore: creditScoreResult.score,
            riskLevel: riskAssessment.riskLevel,
            averageMonthlyVolume: transactionHistory.totalVolume / 12,
            paymentReliability: paymentReliability.score,
        });

        await logActivity('Optimal credit limit calculated', {
            recommendedLimit: optimalLimit.amount,
            requestedLimit: input.requestedCreditLimit,
        });

        // Step 6: Determine if manual review is needed
        manualReviewRequired =
            input.requireManualApproval ||
            riskAssessment.riskLevel === 'high' ||
            riskAssessment.riskLevel === 'critical' ||
            (input.requestedCreditLimit && input.requestedCreditLimit > optimalLimit.amount * 1.2) ||
            creditScoreResult.score < 600 ||
            paymentReliability.score < 60;

        if (manualReviewRequired) {
            await logActivity('Manual review required', {
                reasons: [
                    input.requireManualApproval && 'Manual approval explicitly requested',
                    (riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical') && 'High/Critical risk level',
                    (input.requestedCreditLimit && input.requestedCreditLimit > optimalLimit.amount * 1.2) && 'Requested limit significantly exceeds recommended',
                    creditScoreResult.score < 600 && 'Low credit score',
                    paymentReliability.score < 60 && 'Low payment reliability',
                ].filter(Boolean),
            });

            // Send notification to credit team
            await sendEmailNotification({
                tenantId: input.tenantId,
                to: 'credit-team@company.com', // Would be configurable
                template: 'credit_assessment_manual_review',
                data: {
                    customerId: input.customerId,
                    assessmentType: input.assessmentType,
                    creditScore: creditScoreResult.score,
                    riskLevel: riskAssessment.riskLevel,
                    recommendedLimit: optimalLimit.amount,
                    requestedLimit: input.requestedCreditLimit,
                    workflowId: input.correlationId,
                },
            });

            // Wait for manual approval (with 48-hour timeout)
            await logActivity('Waiting for manual approval (48-hour timeout)', {});

            const approvalDeadline = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
            while (manuallyApproved === undefined && Date.now() < approvalDeadline) {
                await sleep(5 * 60 * 1000); // Check every 5 minutes
            }

            if (manuallyApproved === undefined) {
                await logActivity('Manual approval timeout - assessment pending', {});

                return {
                    workflowId: input.correlationId,
                    status: 'manual_review_required',
                    creditScore: creditScoreResult.score,
                    riskLevel: riskAssessment.riskLevel,
                    recommendedCreditLimit: optimalLimit.amount,
                    paymentReliabilityScore: paymentReliability.score,
                    manualReviewRequired: true,
                    assessmentFactors,
                    totalDuration: Date.now() - startTime,
                    errors: ['Manual approval timeout - assessment pending review'],
                };
            }
        }

        // Step 7: Final decision
        await logActivity('Step 7: Making final credit decision', {});

        let finalStatus: 'approved' | 'rejected';
        let approvedLimit: number;

        if (manualReviewRequired) {
            finalStatus = manuallyApproved! ? 'approved' : 'rejected';
            approvedLimit = manuallyApproved! ? (input.requestedCreditLimit || optimalLimit.amount) : 0;
        } else {
            // Auto-approve if:
            // - Risk level is low or medium
            // - Credit score >= 650
            // - Payment reliability >= 70
            // - No excessive outstanding
            const autoApprove =
                (riskAssessment.riskLevel === 'low' || riskAssessment.riskLevel === 'medium') &&
                creditScoreResult.score >= 650 &&
                paymentReliability.score >= 70 &&
                totalOutstanding < optimalLimit.amount * 0.8;

            finalStatus = autoApprove ? 'approved' : 'rejected';
            approvedLimit = autoApprove ? optimalLimit.amount : 0;
        }

        await logActivity('Credit assessment completed', {
            finalStatus,
            approvedLimit,
            manuallyReviewed: manualReviewRequired,
        });

        // Step 8: Send notification
        await sendEmailNotification({
            tenantId: input.tenantId,
            customerId: input.customerId,
            template: finalStatus === 'approved' ? 'credit_limit_approved' : 'credit_limit_rejected',
            data: {
                creditLimit: approvedLimit,
                creditScore: creditScoreResult.score,
                riskLevel: riskAssessment.riskLevel,
            },
        });

        return {
            workflowId: input.correlationId,
            status: finalStatus,
            creditScore: creditScoreResult.score,
            riskLevel: riskAssessment.riskLevel,
            recommendedCreditLimit: optimalLimit.amount,
            approvedCreditLimit: approvedLimit,
            paymentReliabilityScore: paymentReliability.score,
            manualReviewRequired,
            manuallyApproved,
            approvalComments,
            assessmentFactors,
            totalDuration: Date.now() - startTime,
            errors: errors.length > 0 ? errors : undefined,
        };

    } catch (error) {
        await logActivity('Credit assessment workflow error', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            workflowId: input.correlationId,
            status: 'failed',
            creditScore: 0,
            riskLevel: 'critical',
            recommendedCreditLimit: 0,
            paymentReliabilityScore: 0,
            manualReviewRequired: false,
            assessmentFactors: {
                transactionVolume: 0,
                paymentHistory: 'unknown',
                averageInvoiceValue: 0,
                overdueRate: 0,
                totalOutstanding: 0,
            },
            totalDuration: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : String(error), ...errors],
        };
    }
}
