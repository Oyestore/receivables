/**
 * Payment Processing Coordination Workflow
 * 
 * Orchestrates end-to-end payment processing across multiple modules:
 * - Payment initiation and tracking (Module 03)
 * - Invoice update on payment (Module 01)
 * - Customer communication (Module 02)
 * - Analytics tracking (Module 04)
 * - Customer health update (Module 09)
 * 
 * Implements:
 * - Multi-step payment verification
 * - Automatic reconciliation
 * - Failure handling and retries
 * - Communication based on payment status
 */

import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
    // Payment activities
    processPayment,
    getPaymentStatus,

    // Invoice activities
    getInvoiceDetails,
    updateInvoiceStatus,

    // Communication activities
    sendEmailNotification,
    sendSMSNotification,

    // Analytics activities
    trackPaymentEvent,

    // Customer success activities
    updateCustomerHealth,
    trackCustomerInteraction,

    // Logging
    logActivity,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '10s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

export interface PaymentProcessingInput {
    tenantId: string;
    invoiceId: string;
    customerId: string;
    amount: number;
    paymentMethod: 'upi' | 'card' | 'bank_transfer' | 'wallet';
    userId: string;
    correlationId: string;
    metadata?: Record<string, any>;
}

export interface PaymentProcessingOutput {
    workflowId: string;
    paymentId?: string;
    status: 'completed' | 'failed' | 'pending';
    invoiceUpdated: boolean;
    notificationsSent: string[];
    reconciliationStatus: 'matched' | 'mismatched' | 'pending';
    totalDuration: number;
    errors?: string[];
}

/**
 * Payment Processing Coordination Workflow
 * 
 * Steps:
 * 1. Validate invoice exists and is payable
 * 2. Initiate payment via payment gateway
 * 3. Poll for payment confirmation (with timeout)
 * 4. Update invoice status on success
 * 5. Send customer notifications
 * 6. Track analytics event
 * 7. Update customer health score
 * 8. Perform reconciliation check
 */
export async function paymentProcessingWorkflow(
    input: PaymentProcessingInput
): Promise<PaymentProcessingOutput> {
    const startTime = Date.now();
    const notificationsSent: string[] = [];
    const errors: string[] = [];
    let paymentId: string | undefined;
    let invoiceUpdated = false;
    let reconciliationStatus: 'matched' | 'mismatched' | 'pending' = 'pending';

    try {
        await logActivity('Starting payment processing workflow', {
            invoiceId: input.invoiceId,
            amount: input.amount,
            method: input.paymentMethod,
        });

        // Step 1: Validate invoice
        await logActivity('Step 1: Validating invoice', { invoiceId: input.invoiceId });

        const invoice = await getInvoiceDetails({
            tenantId: input.tenantId,
            invoiceId: input.invoiceId,
        });

        if (!invoice || invoice.status === 'paid') {
            throw new Error(`Invoice ${input.invoiceId} is not payable (status: ${invoice?.status})`);
        }

        if (Math.abs(invoice.amount_due - input.amount) > 0.01) {
            await logActivity('Warning: Payment amount mismatch', {
                invoiceAmount: invoice.amount_due,
                paymentAmount: input.amount,
            });
        }

        // Step 2: Initiate payment
        await logActivity('Step 2: Initiating payment', {
            method: input.paymentMethod,
            amount: input.amount,
        });

        const paymentResult = await processPayment({
            tenantId: input.tenantId,
            invoiceId: input.invoiceId,
            customerId: input.customerId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            metadata: input.metadata,
        });

        paymentId = paymentResult.paymentId;

        await logActivity('Payment initiated', {
            paymentId,
            status: paymentResult.status,
        });

        // Step 3: Poll for payment confirmation (max 5 minutes)
        await logActivity('Step 3: Waiting for payment confirmation', { paymentId });

        let paymentStatus = paymentResult.status;
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts * 10 seconds = 5 minutes

        while (paymentStatus === 'pending' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            const statusCheck = await getPaymentStatus({
                tenantId: input.tenantId,
                paymentId: paymentId!,
            });

            paymentStatus = statusCheck.status;
            attempts++;

            await logActivity(`Payment status check (attempt ${attempts})`, {
                status: paymentStatus,
            });
        }

        if (paymentStatus === 'pending') {
            await logActivity('Payment confirmation timeout', {
                paymentId,
                attempts,
            });
            errors.push('Payment confirmation timeout - status still pending');
        }

        // Step 4: Update invoice on successful payment
        if (paymentStatus === 'completed' || paymentStatus === 'success') {
            await logActivity('Step 4: Updating invoice status', { invoiceId: input.invoiceId });

            await updateInvoiceStatus({
                tenantId: input.tenantId,
                invoiceId: input.invoiceId,
                status: 'paid',
                metadata: {
                    paymentId,
                    paidAmount: input.amount,
                    paymentMethod: input.paymentMethod,
                    paidAt: new Date().toISOString(),
                },
            });

            invoiceUpdated = true;

            await logActivity('Invoice marked as paid', { invoiceId: input.invoiceId });

            // Step 5: Send success notifications
            await logActivity('Step 5: Sending payment confirmation notifications', {});

            try {
                await sendEmailNotification({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    template: 'payment_confirmation',
                    data: {
                        invoiceId: input.invoiceId,
                        amount: input.amount,
                        paymentId,
                        paymentMethod: input.paymentMethod,
                    },
                });
                notificationsSent.push('email');
            } catch (error) {
                errors.push(`Email notification failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            try {
                await sendSMSNotification({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    message: `Payment received! ₹${input.amount} for invoice ${input.invoiceId}. Thank you!`,
                });
                notificationsSent.push('sms');
            } catch (error) {
                errors.push(`SMS notification failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            // Step 6: Track analytics event
            await logActivity('Step 6: Tracking payment analytics', {});

            try {
                await trackPaymentEvent({
                    tenantId: input.tenantId,
                    eventType: 'payment_completed',
                    data: {
                        paymentId,
                        invoiceId: input.invoiceId,
                        customerId: input.customerId,
                        amount: input.amount,
                        paymentMethod: input.paymentMethod,
                    },
                });
            } catch (error) {
                errors.push(`Analytics tracking failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            // Step 7: Update customer health score (positive interaction)
            await logActivity('Step 7: Updating customer health score', {});

            try {
                await updateCustomerHealth({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    interactionType: 'payment_completed',
                    impact: 'positive',
                });

                await trackCustomerInteraction({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    interactionType: 'payment',
                    outcome: 'success',
                    metadata: {
                        invoiceId: input.invoiceId,
                        amount: input.amount,
                    },
                });
            } catch (error) {
                errors.push(`Customer health update failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            // Step 8: Reconciliation check
            await logActivity('Step 8: Performing reconciliation check', {});

            if (Math.abs(invoice.amount_due - input.amount) < 0.01) {
                reconciliationStatus = 'matched';
                await logActivity('Reconciliation: Amount matched', {});
            } else {
                reconciliationStatus = 'mismatched';
                await logActivity('Reconciliation: Amount mismatch detected', {
                    expected: invoice.amount_due,
                    received: input.amount,
                    difference: Math.abs(invoice.amount_due - input.amount),
                });
                errors.push(`Reconciliation mismatch: Expected ₹${invoice.amount_due}, received ₹${input.amount}`);
            }

            await logActivity('Payment processing completed successfully', {
                paymentId,
                totalDuration: Date.now() - startTime,
            });

            return {
                workflowId: input.correlationId,
                paymentId,
                status: 'completed',
                invoiceUpdated: true,
                notificationsSent,
                reconciliationStatus,
                totalDuration: Date.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
            };

        } else if (paymentStatus === 'failed') {
            // Payment failed - send failure notification
            await logActivity('Step 4-ALT: Payment failed, sending failure notification', {
                paymentId,
            });

            try {
                await sendEmailNotification({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    template: 'payment_failed',
                    data: {
                        invoiceId: input.invoiceId,
                        amount: input.amount,
                        paymentId,
                    },
                });
                notificationsSent.push('email_failure');
            } catch (error) {
                errors.push(`Failure email notification failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }

            // Track failed payment
            try {
                await trackCustomerInteraction({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    interactionType: 'payment',
                    outcome: 'failure',
                    metadata: {
                        invoiceId: input.invoiceId,
                        amount: input.amount,
                        reason: 'payment_failed',
                    },
                });
            } catch (error) {
                // Non-critical
            }

            await logActivity('Payment processing failed', {
                paymentId,
                status: paymentStatus,
                totalDuration: Date.now() - startTime,
            });

            return {
                workflowId: input.correlationId,
                paymentId,
                status: 'failed',
                invoiceUpdated: false,
                notificationsSent,
                reconciliationStatus: 'pending',
                totalDuration: Date.now() - startTime,
                errors: [`Payment failed with status: ${paymentStatus}`, ...errors],
            };

        } else {
            // Payment still pending after timeout
            await logActivity('Payment processing timed out', {
                paymentId,
                status: paymentStatus,
                totalDuration: Date.now() - startTime,
            });

            return {
                workflowId: input.correlationId,
                paymentId,
                status: 'pending',
                invoiceUpdated: false,
                notificationsSent,
                reconciliationStatus: 'pending',
                totalDuration: Date.now() - startTime,
                errors: [`Payment timeout: Status is ${paymentStatus} after ${attempts} attempts`, ...errors],
            };
        }

    } catch (error) {
        await logActivity('Payment processing workflow error', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            workflowId: input.correlationId,
            paymentId,
            status: 'failed',
            invoiceUpdated: false,
            notificationsSent,
            reconciliationStatus: 'pending',
            totalDuration: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : String(error), ...errors],
        };
    }
}
