import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowState, WorkflowTransition, WorkflowStateType, TransitionType } from '../entities/workflow-state.entity';
import { DisputeCase } from '../entities/dispute-case.entity';

@Injectable()
export class WorkflowEngineService {
    private readonly logger = new Logger(WorkflowEngineService.name);

    constructor(
        @InjectRepository(WorkflowState)
        private workflowStateRepo: Repository<WorkflowState>,
        @InjectRepository(WorkflowTransition)
        private workflowTransitionRepo: Repository<WorkflowTransition>,
        @InjectRepository(DisputeCase)
        private disputeCaseRepo: Repository<DisputeCase>,
    ) { }

    /**
     * Initialize workflow for a new dispute
     */
    async initializeWorkflow(
        disputeId: string,
        tenantId: string,
        initialStateName: string = 'Draft',
        createdBy: string,
    ): Promise<WorkflowState> {
        const state = this.workflowStateRepo.create({
            disputeId,
            tenantId,
            name: initialStateName,
            stateType: WorkflowStateType.INITIAL,
            isCurrent: true,
            sequence: 0,
            enteredAt: new Date(),
            enteredBy: createdBy,
        });

        const saved = await this.workflowStateRepo.save(state);
        this.logger.log(`Initialized workflow for dispute ${disputeId} in state: ${initialStateName}`);
        return saved;
    }

    /**
     * Transition to next state
     */
    async transition(
        disputeId: string,
        tenantId: string,
        transitionId: string,
        performedBy: string,
        metadata?: Record<string, any>,
    ): Promise<WorkflowState> {
        // Get current state
        const currentState = await this.getCurrentState(disputeId, tenantId);
        if (!currentState) {
            throw new NotFoundException(`No current workflow state found for dispute ${disputeId}`);
        }

        // Get transition
        const transition = await this.workflowTransitionRepo.findOne({
            where: { id: transitionId, tenantId },
        });

        if (!transition) {
            throw new NotFoundException(`Transition ${transitionId} not found`);
        }

        // Validate transition
        if (transition.fromStateId !== currentState.id) {
            throw new BadRequestException(
                `Invalid transition: expected from state ${transition.fromStateId}, current is ${currentState.id}`,
            );
        }

        if (!transition.isEnabled) {
            throw new BadRequestException(`Transition ${transitionId} is disabled`);
        }

        // Check conditions
        if (transition.conditions && transition.conditions.length > 0) {
            const conditionsMet = await this.evaluateConditions(
                transition.conditions,
                disputeId,
                tenantId,
                metadata,
            );
            if (!conditionsMet) {
                throw new BadRequestException(`Transition conditions not met`);
            }
        }

        // Exit current state
        currentState.isCurrent = false;
        currentState.exitedAt = new Date();
        currentState.exitedBy = performedBy;
        await this.workflowStateRepo.save(currentState);

        // Enter new state
        const newState = this.workflowStateRepo.create({
            disputeId,
            tenantId,
            name: `State_${transition.toStateId}`, // Should lookup actual state name
            stateType: WorkflowStateType.IN_PROGRESS,
            isCurrent: true,
            sequence: currentState.sequence + 1,
            enteredAt: new Date(),
            enteredBy: performedBy,
            metadata,
        });

        const saved = await this.workflowStateRepo.save(newState);

        // Execute transition actions
        if (transition.actions && transition.actions.length > 0) {
            await this.executeActions(transition.actions, disputeId, tenantId);
        }

        this.logger.log(`Transitioned dispute ${disputeId} from ${currentState.name} to ${newState.name}`);
        return saved;
    }

    /**
     * Get current workflow state
     */
    async getCurrentState(disputeId: string, tenantId: string): Promise<WorkflowState | null> {
        return this.workflowStateRepo.findOne({
            where: { disputeId, tenantId, isCurrent: true },
        });
    }

    /**
     * Get workflow history
     */
    async getWorkflowHistory(disputeId: string, tenantId: string): Promise<WorkflowState[]> {
        return this.workflowStateRepo.find({
            where: { disputeId, tenantId },
            order: { sequence: 'ASC' },
        });
    }

    /**
     * Get available transitions
     */
    async getAvailableTransitions(disputeId: string, tenantId: string): Promise<WorkflowTransition[]> {
        const currentState = await this.getCurrentState(disputeId, tenantId);
        if (!currentState) {
            return [];
        }

        return this.workflowTransitionRepo.find({
            where: {
                fromStateId: currentState.id,
                tenantId,
                isEnabled: true,
            },
            order: { priority: 'DESC' },
        });
    }

    /**
     * Automated transition scheduler (runs every 5 minutes)
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async processAutomatedTransitions(): Promise<void> {
        this.logger.debug('Processing automated workflow transitions...');

        // Get all active workflows
        const activeStates = await this.workflowStateRepo.find({
            where: { isCurrent: true },
        });

        for (const state of activeStates) {
            try {
                // Get automatic transitions
                const autoTransitions = await this.workflowTransitionRepo.find({
                    where: {
                        fromStateId: state.id,
                        tenantId: state.tenantId,
                        type: TransitionType.AUTOMATIC,
                        isEnabled: true,
                    },
                });

                for (const transition of autoTransitions) {
                    // Check if conditions are met
                    if (transition.conditions) {
                        const conditionsMet = await this.evaluateConditions(
                            transition.conditions,
                            state.disputeId,
                            state.tenantId,
                        );
                        if (conditionsMet) {
                            await this.transition(
                                state.disputeId,
                                state.tenantId,
                                transition.id,
                                'SYSTEM',
                            );
                        }
                    }
                }
            } catch (error) {
                this.logger.error(`Error processing automated transition for state ${state.id}: ${error.message}`);
            }
        }
    }

    /**
     * Evaluate transition conditions
     */
    private async evaluateConditions(
        conditions: Array<{
            field?: string;
            operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
            value?: any;
            expression?: string;
        }>,
        disputeId: string,
        tenantId: string,
        metadata?: Record<string, any>,
    ): Promise<boolean> {
        // Simple implementation - in production, use a proper expression evaluator
        for (const condition of conditions) {
            if (condition.expression) {
                // Would use a safe expression evaluator here
                // For now, return true
                continue;
            }

            if (condition.field && condition.operator && condition.value !== undefined) {
                // Get field value from dispute or metadata
                const fieldValue = metadata?.[condition.field];

                switch (condition.operator) {
                    case '==':
                        if (fieldValue !== condition.value) return false;
                        break;
                    case '!=':
                        if (fieldValue === condition.value) return false;
                        break;
                    case '>':
                        if (!(fieldValue > condition.value)) return false;
                        break;
                    case '<':
                        if (!(fieldValue < condition.value)) return false;
                        break;
                    case '>=':
                        if (!(fieldValue >= condition.value)) return false;
                        break;
                    case '<=':
                        if (!(fieldValue <= condition.value)) return false;
                        break;
                    case 'contains':
                        if (!String(fieldValue).includes(String(condition.value))) return false;
                        break;
                }
            }
        }

        return true;
    }

    /**
     * Execute transition actions
     */
    private async executeActions(
        actions: Array<{
            type: 'notification' | 'email' | 'sms' | 'webhook' | 'function';
            config: Record<string, any>;
        }>,
        disputeId: string,
        tenantId: string,
    ): Promise<void> {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'notification':
                        // Would integrate with M11 NotificationService
                        this.logger.log(`Sending notification for dispute ${disputeId}`);
                        break;
                    case 'email':
                        // Would integrate with M11 EmailService
                        this.logger.log(`Sending email for dispute ${disputeId}`);
                        break;
                    case 'sms':
                        // Would integrate with M11 SMSService
                        this.logger.log(`Sending SMS for dispute ${disputeId}`);
                        break;
                    case 'webhook':
                        // Would call external webhook
                        this.logger.log(`Calling webhook for dispute ${disputeId}`);
                        break;
                    case 'function':
                        // Would execute custom function
                        this.logger.log(`Executing function for dispute ${disputeId}`);
                        break;
                }
            } catch (error) {
                this.logger.error(`Error executing action ${action.type}: ${error.message}`);
            }
        }
    }
}
