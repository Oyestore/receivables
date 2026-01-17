import { Injectable, Logger } from '@nestjs/common';

/**
 * Automated Playbook Service
 * Executes automated customer success workflows based on triggers and conditions
 * 
 * Gap Resolution: Phase 9.2 - Missing automated playbook engine
 */

export enum PlaybookTrigger {
    HEALTH_SCORE_DROP = 'health_score_drop',
    CHURN_RISK_HIGH = 'churn_risk_high',
    PAYMENT_DELAY = 'payment_delay',
    LOW_ENGAGEMENT = 'low_engagement',
    MILESTONE_ACHIEVED = 'milestone_achieved',
    FEATURE_NOT_ADOPTED = 'feature_not_adopted',
    USAGE_SPIKE = 'usage_spike',
}

export enum PlaybookAction {
    SEND_EMAIL = 'send_email',
    ASSIGN_CSM = 'assign_csm',
    SCHEDULE_CALL = 'schedule_call',
    OFFER_TRAINING = 'offer_training',
    SEND_SURVEY = 'send_survey',
    ESCALATE = 'escalate',
    TRIGGER_CAMPAIGN = 'trigger_campaign',
}

export interface PlaybookStep {
    stepId: string;
    action: PlaybookAction;
    delay: number;                  // milliseconds, 0 for immediate
    conditions?: {
        field: string;
        operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
        value: any;
    }[];
    config: Record<string, any>;     // Action-specific configuration
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    trigger: PlaybookTrigger;
    customerSegment?: string;        // Optional target segment
    active: boolean;
    steps: PlaybookStep[];
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface PlaybookExecution {
    executionId: string;
    playbookId: string;
    customerId: string;
    tenantId: string;
    triggeredAt: Date;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    currentStep: number;
    completedSteps: string[];
    results: Array<{
        stepId: string;
        success: boolean;
        output?: any;
        error?: string;
    }>;
}

@Injectable()
export class AutomatedPlaybookService {
    private readonly logger = new Logger(AutomatedPlaybookService.name);
    private readonly playbooks: Map<string, Playbook> = new Map();

    constructor() {
        this.initializeDefaultPlaybooks();
    }

    /**
     * Execute playbook based on trigger
     */
    async executePlaybook(
        tenantId: string,
        customerId: string,
        trigger: PlaybookTrigger,
        context: Record<string, any>,
    ): Promise<PlaybookExecution> {
        const playbook = this.getPlaybookForTrigger(trigger);

        if (!playbook || !playbook.active) {
            this.logger.warn(`No active playbook found for trigger: ${trigger}`);
            return null;
        }

        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const execution: PlaybookExecution = {
            executionId,
            playbookId: playbook.id,
            customerId,
            tenantId,
            triggeredAt: new Date(),
            status: 'running',
            currentStep: 0,
            completedSteps: [],
            results: [],
        };

        this.logger.log(
            `Executing playbook: ${playbook.name} for customer: ${customerId}`,
        );

        // Execute steps (async, don't wait)
        this.executeSteps(execution, playbook, context).catch(error => {
            this.logger.error(
                `Playbook execution failed: ${executionId} - ${error.message}`,
            );
        });

        return execution;
    }

    /**
     * Register custom playbook
     */
    registerPlaybook(playbook: Playbook): void {
        this.playbooks.set(playbook.id, playbook);
        this.logger.log(`Registered playbook: ${playbook.name} (${playbook.id})`);
    }

    /**
     * Get all active playbooks
     */
    getActivePlaybooks(): Playbook[] {
        return Array.from(this.playbooks.values()).filter(p => p.active);
    }

    /**
     * Pause/resume playbook
     */
    togglePlaybook(playbookId: string, active: boolean): void {
        const playbook = this.playbooks.get(playbookId);
        if (playbook) {
            playbook.active = active;
            this.logger.log(`Playbook ${playbookId} ${active ? 'activated' : 'paused'}`);
        }
    }

    // Private methods

    private async executeSteps(
        execution: PlaybookExecution,
        playbook: Playbook,
        context: Record<string, any>,
    ): Promise<void> {
        for (let i = 0; i < playbook.steps.length; i++) {
            const step = playbook.steps[i];

            // Check conditions
            if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
                this.logger.debug(`Step ${step.stepId} conditions not met, skipping`);
                continue;
            }

            // Apply delay
            if (step.delay > 0) {
                await this.delay(step.delay);
            }

            // Execute action
            try {
                const result = await this.executeAction(
                    execution.tenantId,
                    execution.customerId,
                    step,
                    context,
                );

                execution.results.push({
                    stepId: step.stepId,
                    success: true,
                    output: result,
                });

                execution.completedSteps.push(step.stepId);
                execution.currentStep = i + 1;

                this.logger.debug(
                    `Completed step ${step.stepId} for execution ${execution.executionId}`,
                );
            } catch (error) {
                execution.results.push({
                    stepId: step.stepId,
                    success: false,
                    error: error.message,
                });

                this.logger.error(
                    `Step ${step.stepId} failed: ${error.message}`,
                );

                // Continue with next step even if one fails
            }
        }

        execution.status = 'completed';
        this.logger.log(`Playbook execution completed: ${execution.executionId}`);
    }

    private async executeAction(
        tenantId: string,
        customerId: string,
        step: PlaybookStep,
        context: Record<string, any>,
    ): Promise<any> {
        switch (step.action) {
            case PlaybookAction.SEND_EMAIL:
                return this.sendEmail(customerId, step.config);

            case PlaybookAction.ASSIGN_CSM:
                return this.assignCSM(customerId, step.config);

            case PlaybookAction.SCHEDULE_CALL:
                return this.scheduleCall(customerId, step.config);

            case PlaybookAction.OFFER_TRAINING:
                return this.offerTraining(customerId, step.config);

            case PlaybookAction.SEND_SURVEY:
                return this.sendSurvey(customerId, step.config);

            case PlaybookAction.ESCALATE:
                return this.escalate(customerId, step.config, context);

            case PlaybookAction.TRIGGER_CAMPAIGN:
                return this.triggerCampaign(customerId, step.config);

            default:
                throw new Error(`Unknown action: ${step.action}`);
        }
    }

    private evaluateConditions(
        conditions: PlaybookStep['conditions'],
        context: Record<string, any>,
    ): boolean {
        return conditions.every(condition => {
            const value = this.getNestedValue(context, condition.field);

            switch (condition.operator) {
                case 'equals':
                    return value === condition.value;
                case 'greater_than':
                    return value > condition.value;
                case 'less_than':
                    return value < condition.value;
                case 'contains':
                    return String(value).includes(String(condition.value));
                default:
                    return false;
            }
        });
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Action implementations (mock)

    private async sendEmail(customerId: string, config: any): Promise<void> {
        this.logger.log(`Sending email to ${customerId}: ${config.template}`);
        // TODO: Integrate with Module 11 communication service
    }

    private async assignCSM(customerId: string, config: any): Promise<void> {
        this.logger.log(`Assigning CSM to ${customerId}: ${config.csmId || 'auto'}`);
        // TODO: Integrate with CSM assignment logic
    }

    private async scheduleCall(customerId: string, config: any): Promise<void> {
        this.logger.log(`Scheduling call for ${customerId}`);
        // TODO: Integrate with calendar system
    }

    private async offerTraining(customerId: string, config: any): Promise<void> {
        this.logger.log(`Offering training to ${customerId}: ${config.trainingType}`);
        // TODO: Send training invitation
    }

    private async sendSurvey(customerId: string, config: any): Promise<void> {
        this.logger.log(`Sending survey to ${customerId}: ${config.surveyType}`);
        // TODO: Integrate with survey system
    }

    private async escalate(
        customerId: string,
        config: any,
        context: Record<string, any>,
    ): Promise<void> {
        this.logger.warn(
            `Escalating customer ${customerId} - ${context.reason || 'high risk'}`,
        );
        // TODO: Create escalation ticket
    }

    private async triggerCampaign(customerId: string, config: any): Promise<void> {
        this.logger.log(`Triggering campaign for ${customerId}: ${config.campaignId}`);
        // TODO: Integrate with campaign service
    }

    private getPlaybookForTrigger(trigger: PlaybookTrigger): Playbook | undefined {
        return Array.from(this.playbooks.values()).find(
            p => p.trigger === trigger && p.active,
        );
    }

    // Default playbooks initialization

    private initializeDefaultPlaybooks(): void {
        // Playbook 1: High churn risk intervention
        this.registerPlaybook({
            id: 'pb_churn_intervention',
            name: 'High Churn Risk Intervention',
            description: 'Automated intervention for customers at high risk of churning',
            trigger: PlaybookTrigger.CHURN_RISK_HIGH,
            active: true,
            priority: 'critical',
            steps: [
                {
                    stepId: 'step1',
                    action: PlaybookAction.ASSIGN_CSM,
                    delay: 0,
                    config: { priority: 'urgent' },
                },
                {
                    stepId: 'step2',
                    action: PlaybookAction.SEND_EMAIL,
                    delay: 3600000, // 1 hour
                    config: { template: 'retention_outreach' },
                },
                {
                    stepId: 'step3',
                    action: PlaybookAction.SCHEDULE_CALL,
                    delay: 43200000, // 12 hours
                    config: { urgency: 'high' },
                },
                {
                    stepId: 'step4',
                    action: PlaybookAction.ESCALATE,
                    delay: 172800000, // 2 days
                    conditions: [
                        { field: 'response_received', operator: 'equals', value: false },
                    ],
                    config: { level: 'senior_management' },
                },
            ],
        });

        //Playbook 2: Low engagement recovery
        this.registerPlaybook({
            id: 'pb_low_engagement',
            name: 'Low Engagement Recovery',
            description: 'Re-engage customers with low platform usage',
            trigger: PlaybookTrigger.LOW_ENGAGEMENT,
            active: true,
            priority: 'medium',
            steps: [
                {
                    stepId: 'step1',
                    action: PlaybookAction.SEND_EMAIL,
                    delay: 0,
                    config: { template: 'tips_and_tricks' },
                },
                {
                    stepId: 'step2',
                    action: PlaybookAction.OFFER_TRAINING,
                    delay: 86400000, // 1 day
                    config: { trainingType: 'quick_start' },
                },
                {
                    stepId: 'step3',
                    action: PlaybookAction.SEND_SURVEY,
                    delay: 259200000, // 3 days
                    config: { surveyType: 'engagement' },
                },
            ],
        });

        // Playbook 3: Feature adoption campaign
        this.registerPlaybook({
            id: 'pb_feature_adoption',
            name: 'Feature Adoption Campaign',
            description: 'Encourage adoption of underutilized features',
            trigger: PlaybookTrigger.FEATURE_NOT_ADOPTED,
            active: true,
            priority: 'low',
            steps: [
                {
                    stepId: 'step1',
                    action: PlaybookAction.SEND_EMAIL,
                    delay: 0,
                    config: { template: 'feature_highlight' },
                },
                {
                    stepId: 'step2',
                    action: PlaybookAction.TRIGGER_CAMPAIGN,
                    delay: 172800000, // 2 days
                    config: { campaignId: 'feature_education' },
                },
            ],
        });

        // Playbook 4: Success milestone celebration
        this.registerPlaybook({
            id: 'pb_milestone_celebration',
            name: 'Milestone Celebration',
            description: 'Celebrate customer achievements and encourage referrals',
            trigger: PlaybookTrigger.MILESTONE_ACHIEVED,
            active: true,
            priority: 'low',
            steps: [
                {
                    stepId: 'step1',
                    action: PlaybookAction.SEND_EMAIL,
                    delay: 0,
                    config: { template: 'milestone_congratulations' },
                },
                {
                    stepId: 'step2',
                    action: PlaybookAction.TRIGGER_CAMPAIGN,
                    delay: 86400000, // 1 day
                    config: { campaignId: 'referral_request' },
                },
            ],
        });

        this.logger.log(`Initialized ${this.playbooks.size} default playbooks`);
    }
}
