/**
 * Customer Communication Sequencing Workflow
 * 
 * Orchestrates multi-step, multi-channel communication campaigns
 * Implements intelligent sequencing based on customer response and engagement
 * 
 * Use Cases:
 * - Payment reminder campaigns (escalating urgency)
 * - Onboarding sequences
 * - Re-engagement campaigns
 * - Feedback collection
 * 
 * Features:
 * - Multi-channel support (Email, SMS, WhatsApp)
 * - Time-based delays between communications
 * - Response tracking and adaptive sequencing
 * - A/B testing support
 * - Engagement scoring
 */

import { proxyActivities, sleep, condition } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
    sendEmailNotification,
    sendSMSNotification,
    sendWhatsAppMessage,
    trackCustomerInteraction,
    getCustomerEngagementScore,
    logActivity,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '3 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '5s',
        backoffCoefficient: 2,
        maximumAttempts: 2,
    },
});

export interface CommunicationStep {
    stepNumber: number;
    channel: 'email' | 'sms' | 'whatsapp';
    template: string;
    delayHours: number;
    data: Record<string, any>;
    skipIfEngaged?: boolean; // Skip if customer has engaged
}

export interface CommunicationSequenceInput {
    tenantId: string;
    customerId: string;
    campaignType: 'payment_reminder' | 'onboarding' | 'reengagement' | 'feedback';
    steps: CommunicationStep[];
    userId: string;
    correlationId: string;
    maxDurationHours?: number; // Auto-stop after this duration
}

export interface CommunicationSequenceOutput {
    workflowId: string;
    status: 'completed' | 'stopped' | 'failed';
    stepsExecuted: number;
    stepsSkipped: number;
    channelsUsed: string[];
    customerEngaged: boolean;
    finalEngagementScore: number;
    totalDuration: number;
    errors?: string[];
}

/**
 * Customer Communication Sequencing Workflow
 * 
 * Intelligent multi-step, multi-channel communication orchestration
 */
export async function customerCommunicationSequenceWorkflow(
    input: CommunicationSequenceInput
): Promise<CommunicationSequenceOutput> {
    const startTime = Date.now();
    const errors: string[] = [];
    const channelsUsed = new Set<string>();
    let stepsExecuted = 0;
    let stepsSkipped = 0;
    let customerEngaged = false;
    let finalEngagementScore = 0;

    try {
        await logActivity('Starting communication sequence workflow', {
            customerId: input.customerId,
            campaignType: input.campaignType,
            totalSteps: input.steps.length,
        });

        // Sort steps by step number
        const sortedSteps = [...input.steps].sort((a, b) => a.stepNumber - b.stepNumber);

        for (const step of sortedSteps) {
            // Check max duration
            if (input.maxDurationHours) {
                const elapsedHours = (Date.now() - startTime) / (1000 * 60 * 60);
                if (elapsedHours >= input.maxDurationHours) {
                    await logActivity('Campaign stopped: Max duration reached', {
                        maxHours: input.maxDurationHours,
                        elapsedHours,
                    });
                    break;
                }
            }

            // Wait for delay (except first step)
            if (step.stepNumber > 1 && step.delayHours > 0) {
                await logActivity(`Waiting ${step.delayHours} hours before step ${step.stepNumber}`, {});
                await sleep(step.delayHours * 60 * 60 * 1000);
            }

            // Check engagement before sending (if configured)
            if (step.skipIfEngaged) {
                const engagementResult = await getCustomerEngagementScore({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                });

                if (engagementResult.score > 70 || engagementResult.recentEngagement) {
                    await logActivity(`Skipping step ${step.stepNumber}: Customer already engaged`, {
                        engagementScore: engagementResult.score,
                    });
                    stepsSkipped++;
                    customerEngaged = true;
                    continue;
                }
            }

            // Execute communication step
            await logActivity(`Executing step ${step.stepNumber}: ${step.channel}`, {
                template: step.template,
            });

            try {
                switch (step.channel) {
                    case 'email':
                        await sendEmailNotification({
                            tenantId: input.tenantId,
                            customerId: input.customerId,
                            template: step.template,
                            data: step.data,
                        });
                        channelsUsed.add('email');
                        break;

                    case 'sms':
                        // For SMS, construct message from template
                        const smsMessage = this.constructSMSMessage(step.template, step.data);
                        await sendSMSNotification({
                            tenantId: input.tenantId,
                            customerId: input.customerId,
                            message: smsMessage,
                        });
                        channelsUsed.add('sms');
                        break;

                    case 'whatsapp':
                        await sendWhatsAppMessage({
                            tenantId: input.tenantId,
                            customerId: input.customerId,
                            template: step.template,
                            data: step.data,
                        });
                        channelsUsed.add('whatsapp');
                        break;
                }

                stepsExecuted++;

                await logActivity(`Step ${step.stepNumber} completed`, {
                    channel: step.channel,
                });

                // Track interaction
                await trackCustomerInteraction({
                    tenantId: input.tenantId,
                    customerId: input.customerId,
                    interactionType: 'communication_sent',
                    metadata: {
                        campaignType: input.campaignType,
                        step: step.stepNumber,
                        channel: step.channel,
                        template: step.template,
                    },
                });

            } catch (error) {
                const errorMsg = `Step ${step.stepNumber} failed: ${error instanceof Error ? error.message : 'Unknown'}`;
                errors.push(errorMsg);
                await logActivity('Step execution error', { error: errorMsg });
                // Continue with next step despite error
            }
        }

        // Get final engagement score
        try {
            const finalEngagement = await getCustomerEngagementScore({
                tenantId: input.tenantId,
                customerId: input.customerId,
            });
            finalEngagementScore = finalEngagement.score;
            customerEngaged = finalEngagement.score > 60 || finalEngagement.recentEngagement;
        } catch (error) {
            errors.push('Failed to get final engagement score');
        }

        await logActivity('Communication sequence completed', {
            stepsExecuted,
            stepsSkipped,
            channelsUsed: Array.from(channelsUsed),
            customerEngaged,
            totalDuration: Date.now() - startTime,
        });

        return {
            workflowId: input.correlationId,
            status: 'completed',
            stepsExecuted,
            stepsSkipped,
            channelsUsed: Array.from(channelsUsed),
            customerEngaged,
            finalEngagementScore,
            totalDuration: Date.now() - startTime,
            errors: errors.length > 0 ? errors : undefined,
        };

    } catch (error) {
        await logActivity('Communication sequence workflow error', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            workflowId: input.correlationId,
            status: 'failed',
            stepsExecuted,
            stepsSkipped,
            channelsUsed: Array.from(channelsUsed),
            customerEngaged,
            finalEngagementScore,
            totalDuration: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : String(error), ...errors],
        };
    }
}

// Helper function to construct SMS message from template
function constructSMSMessage(template: string, data: Record<string, any>): string {
    const templates: Record<string, string> = {
        payment_reminder_gentle: `Hi! Friendly reminder: Invoice ${data.invoiceId} for ₹${data.amount} is due. Please pay at your earliest convenience. Thank you!`,
        payment_reminder_urgent: `URGENT: Invoice ${data.invoiceId} for ₹${data.amount} is overdue by ${data.daysOverdue} days. Please pay immediately to avoid late fees.`,
        payment_reminder_final: `FINAL NOTICE: Invoice ${data.invoiceId} (₹${data.amount}) is ${data.daysOverdue} days overdue. Pay within 24 hours to avoid collections.`,
        onboarding_welcome: `Welcome to our platform! We're excited to have you. Click ${data.link} to complete your profile.`,
        feedback_request: `Thank you for your payment! We'd love your feedback. Rate your experience: ${data.link}`,
    };

    return templates[template] || `Communication regarding ${data.subject || 'your account'}`;
}
