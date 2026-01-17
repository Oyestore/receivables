/**
 * Overdue Invoice Follow-up Workflow
 * 
 * Automated workflow for coordinating overdue invoice collection across multiple modules:
 * - Invoice verification (Module 01)
 * - Customer communication (Module 02)
 * - Payment processing (Module 03)
 * - Credit assessment (Module 06)
 * - Customer health tracking (Module 09)
 * 
 * Implements Dr. Barnard's Theory of Constraints principle:
 * Focus on the most impactful collection actions based on invoice value and customer risk
 */

import { proxyActivities, sleep, defineSignal, setHandler, condition } from '@temporalio/workflow';
import type * as activities from '../activities';

// Proxy all activities with default timeout
const {
    getInvoiceDetails,
    sendEmailNotification,
    sendSMSNotification,
    sendWhatsAppMessage,
    initiatePaymentReminder,
    getCreditScore,
    updateCustomerHealth,
    trackCustomerInteraction,
    updateInvoiceStatus,
    logActivity,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
    retry: {
        maximumAttempts: 3,
        initialInterval: '1s',
        backoffCoefficient: 2,
        maximumInterval: '30s',
    },
});

// ============================================================================
// Workflow Input/Output Types
// ============================================================================

export interface OverdueInvoiceFollowUpInput {
    tenantId: string;
    invoiceId: string;
    customerId: string;
    userId: string;
    correlationId: string;
    options?: {
        skipEmailReminder?: boolean;
        skipSMSReminder?: boolean;
        escalateImmediately?: boolean;
        maxFollowUpAttempts?: number;
    };
}

export interface OverdueInvoiceFollowUpOutput {
    workflowId: string;
    status: 'completed' | 'failed' | 'escalated';
    invoiceDetails: any;
    actionsT

    aken: string[];
    finalStatus: string;
    totalDuration: number;
    errors?: string[];
}

// ============================================================================
// Workflow Signals
// ============================================================================

export const paymentReceivedSignal = defineSignal<[{ paymentId: string; amount: number }]>(
    'paymentReceived'
);

export const manualEscalationSignal = defineSignal<[{ reason: string }]>('manualEscalation');

// ============================================================================
// Main Workflow Implementation
// ============================================================================

export async function overdueInvoiceFollowUpWorkflow(
    input: OverdueInvoiceFollowUpInput
): Promise<OverdueInvoiceFollowUpOutput> {
    const startTime = Date.now();
    const activityContext = {
        tenantId: input.tenantId,
        userId: input.userId,
        correlationId: input.correlationId,
    };

    const actionsTaken: string[] = [];
    const errors: string[] = [];
    let paymentReceived = false;
    let manuallyEscalated = false;

    // Set up signal handlers
    setHandler(paymentReceivedSignal, ({ paymentId, amount }) => {
        paymentReceived = true;
        actionsTaken.push(`Payment received: ${paymentId} for amount ${amount}`);
    });

    setHandler(manualEscalationSignal, ({ reason }) => {
        manuallyEscalated = true;
        actionsTaken.push(`Manual escalation triggered: ${reason}`);
    });

    try {
        await logActivity('Starting overdue invoice follow-up workflow', {
            invoiceId: input.invoiceId,
            customerId: input.customerId,
        });

        // ========================================================================
        // Step 1: Get Invoice Details
        // ========================================================================
        await logActivity('Fetching invoice details');
        const invoiceDetails = await getInvoiceDetails(activityContext, input.invoiceId);

        const invoiceAmount = invoiceDetails.grand_total || 0;
        const daysOverdue = calculateDaysOverdue(invoiceDetails.due_date);
        const customerEmail = invoiceDetails.customer_email;
        const customerPhone = invoiceDetails.customer_phone;

        actionsTaken.push(`Retrieved invoice: ${input.invoiceId}, Amount: ${invoiceAmount}, Days overdue: ${daysOverdue}`);

        // ========================================================================
        // Step 2: Assess Priority and Risk
        // ========================================================================
        await logActivity('Assessing credit risk and priority');

        const creditScore = await getCreditScore(activityContext, input.customerId);
        const priority = calculatePriority(invoiceAmount, daysOverdue, creditScore.current_score);

        actionsTaken.push(`Credit score: ${creditScore.current_score}, Priority: ${priority}`);

        // ========================================================================
        // Step 3: Track Customer Interaction
        // ========================================================================
        await trackCustomerInteraction(activityContext, {
            customerId: input.customerId,
            interactionType: 'overdue_invoice_follow_up_initiated',
            details: {
                invoiceId: input.invoiceId,
                daysOverdue,
                amount: invoiceAmount,
                priority,
            },
        });

        // ========================================================================
        // Step 4: Execute Communication Strategy Based on Priority
        // ========================================================================
        const maxAttempts = input.options?.maxFollowUpAttempts || 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (paymentReceived || manuallyEscalated) {
                break;
            }

            await logActivity(`Follow-up attempt ${attempt} of ${maxAttempts}`);

            // Priority-based communication sequence
            if (priority === 'critical' || input.options?.escalateImmediately) {
                // Critical: Immediate multi-channel outreach
                await executeCriticalPriorityFollowUp(
                    activityContext,
                    invoiceDetails,
                    customerEmail,
                    customerPhone,
                    attempt,
                    actionsTaken
                );
            } else if (priority === 'high') {
                // High: Email + SMS
                await executeHighPriorityFollowUp(
                    activityContext,
                    invoiceDetails,
                    customerEmail,
                    customerPhone,
                    attempt,
                    actionsTaken,
                    input.options
                );
            } else {
                // Medium/Low: Email only
                await executeMediumPriorityFollowUp(
                    activityContext,
                    invoiceDetails,
                    customerEmail,
                    attempt,
                    actionsTaken,
                    input.options
                );
            }

            // Wait between attempts (increasing intervals)
            if (attempt < maxAttempts) {
                const waitTime = getWaitTime(priority, attempt);
                await logActivity(`Waiting ${waitTime}ms before next attempt`);

                // Wait but allow early completion if payment received
                await condition(() => paymentReceived || manuallyEscalated, waitTime);
            }
        }

        // ========================================================================
        // Step 5: Final Status and Escalation
        // ========================================================================
        let finalStatus: string;
        let workflowStatus: 'completed' | 'failed' | 'escalated';

        if (paymentReceived) {
            finalStatus = 'paid';
            workflowStatus = 'completed';
            await updateInvoiceStatus(activityContext, input.invoiceId, 'paid');

            await updateCustomerHealth(
                activityContext,
                input.customerId,
                calculateHealthScore(creditScore.current_score, true)
            );

            actionsTaken.push('Payment received - workflow completed successfully');
        } else if (manuallyEscalated) {
            finalStatus = 'manually_escalated';
            workflowStatus = 'escalated';
            actionsTaken.push('Manual escalation - transferred to collections team');
        } else {
            // Auto-escalate after max attempts
            finalStatus = 'auto_escalated';
            workflowStatus = 'escalated';

            await updateInvoiceStatus(activityContext, input.invoiceId, 'collections');

            await sendEmailNotification(activityContext, {
                to: process.env.COLLECTIONS_TEAM_EMAIL || 'collections@company.com',
                subject: `Auto-escalation: Invoice ${input.invoiceId}`,
                template: 'collections-escalation',
                data: {
                    invoiceId: input.invoiceId,
                    customerId: input.customerId,
                    amount: invoiceAmount,
                    daysOverdue,
                    attemptsMade: maxAttempts,
                    creditScore: creditScore.current_score,
                },
            });

            await updateCustomerHealth(
                activityContext,
                input.customerId,
                calculateHealthScore(creditScore.current_score, false)
            );

            actionsTaken.push('Auto-escalated to collections after max attempts');
        }

        // ========================================================================
        // Step 6: Return Results
        // ========================================================================
        const totalDuration = Date.now() - startTime;

        await logActivity('Workflow completed', {
            status: workflowStatus,
            finalStatus,
            duration: totalDuration,
            actionsTaken: actionsTaken.length,
        });

        return {
            workflowId: input.correlationId,
            status: workflowStatus,
            invoiceDetails,
            actionsTaken,
            finalStatus,
            totalDuration,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        await logActivity('Workflow failed with error', {
            error: error instanceof Error ? error.message : String(error),
        });

        errors.push(error instanceof Error ? error.message : String(error));

        return {
            workflowId: input.correlationId,
            status: 'failed',
            invoiceDetails: {},
            actionsTaken,
            finalStatus: 'error',
            totalDuration: Date.now() - startTime,
            errors,
        };
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysOverdue(dueDate: string | Date): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculatePriority(
    amount: number,
    daysOverdue: number,
    creditScore: number
): 'critical' | 'high' | 'medium' | 'low' {
    // High-value invoices or severe risk
    if (amount > 100000 || daysOverdue > 60 || creditScore < 500) {
        return 'critical';
    }

    // Moderate value with significant delay or moderate risk
    if (amount > 50000 || daysOverdue > 30 || creditScore < 650) {
        return 'high';
    }

    // Standard invoices with reasonable delay
    if (amount > 10000 || daysOverdue > 15) {
        return 'medium';
    }

    return 'low';
}

function calculateHealthScore(creditScore: number, paymentReceived: boolean): number {
    let healthScore = creditScore / 10; // Base health from credit (0-100)

    if (paymentReceived) {
        healthScore = Math.min(100, healthScore + 10); // Boost for payment
    } else {
        healthScore = Math.max(0, healthScore - 15); // Penalty for non-payment
    }

    return healthScore;
}

function getWaitTime(priority: string, attempt: number): number {
    const baseWait = {
        critical: 2 * 60 * 60 * 1000, // 2 hours
        high: 24 * 60 * 60 * 1000, // 1 day
        medium: 3 * 24 * 60 * 60 * 1000, // 3 days
        low: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return baseWait[priority as keyof typeof baseWait] * attempt;
}

async function executeCriticalPriorityFollowUp(
    context: any,
    invoiceDetails: any,
    email: string,
    phone: string,
    attempt: number,
    actionsTaken: string[]
): Promise<void> {
    // Multi-channel immediate outreach
    await Promise.all([
        sendEmailNotification(context, {
            to: email,
            subject: `URGENT: Payment Required for Invoice ${invoiceDetails.invoice_number}`,
            template: 'critical-payment-reminder',
            data: {
                invoiceNumber: invoiceDetails.invoice_number,
                amount: invoiceDetails.grand_total,
                dueDate: invoiceDetails.due_date,
                attempt,
            },
        }),
        sendSMSNotification(context, {
            phoneNumber: phone,
            message: `URGENT: Invoice ${invoiceDetails.invoice_number} payment of ${invoiceDetails.grand_total} is severely overdue. Please contact us immediately.`,
        }),
        sendWhatsAppMessage(context, {
            phoneNumber: phone,
            template: 'critical_payment_reminder',
            parameters: {
                invoice_number: invoiceDetails.invoice_number,
                amount: invoiceDetails.grand_total,
            },
        }),
    ]);

    actionsTaken.push(`Critical priority follow-up (Attempt ${attempt}): Email, SMS, and WhatsApp sent`);
}

async function executeHighPriorityFollowUp(
    context: any,
    invoiceDetails: any,
    email: string,
    phone: string,
    attempt: number,
    actionsTaken: string[],
    options?: any
): Promise<void> {
    const promises: Promise<void>[] = [];

    if (!options?.skipEmailReminder) {
        promises.push(
            sendEmailNotification(context, {
                to: email,
                subject: `Payment Reminder: Invoice ${invoiceDetails.invoice_number}`,
                template: 'high-priority-payment-reminder',
                data: {
                    invoiceNumber: invoiceDetails.invoice_number,
                    amount: invoiceDetails.grand_total,
                    dueDate: invoiceDetails.due_date,
                    attempt,
                },
            })
        );
    }

    if (!options?.skipSMSReminder) {
        promises.push(
            sendSMSNotification(context, {
                phoneNumber: phone,
                message: `Invoice ${invoiceDetails.invoice_number} payment of ${invoiceDetails.grand_total} is overdue. Please pay at your earliest convenience.`,
            })
        );
    }

    await Promise.all(promises);
    actionsTaken.push(`High priority follow-up (Attempt ${attempt}): Email and SMS sent`);
}

async function executeMediumPriorityFollowUp(
    context: any,
    invoiceDetails: any,
    email: string,
    attempt: number,
    actionsTaken: string[],
    options?: any
): Promise<void> {
    if (!options?.skipEmailReminder) {
        await sendEmailNotification(context, {
            to: email,
            subject: `Payment Reminder: Invoice ${invoiceDetails.invoice_number}`,
            template: 'standard-payment-reminder',
            data: {
                invoiceNumber: invoiceDetails.invoice_number,
                amount: invoiceDetails.grand_total,
                dueDate: invoiceDetails.due_date,
                attempt,
            },
        });

        actionsTaken.push(`Medium priority follow-up (Attempt ${attempt}): Email sent`);
    }
}
