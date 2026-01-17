import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingWorkflow, OnboardingStatus } from '../entities/onboarding-workflow.entity';
import { OnboardingStep, StepStatus } from '../entities/onboarding-step.entity';

@Injectable()
export class OnboardingService {
    constructor(
        @InjectRepository(OnboardingWorkflow)
        private readonly workflowRepository: Repository<OnboardingWorkflow>,
        @InjectRepository(OnboardingStep)
        private readonly stepRepository: Repository<OnboardingStep>,
    ) { }

    async startOnboarding(customerId: string): Promise<OnboardingWorkflow> {
        const existing = await this.workflowRepository.findOne({ where: { customerId } });
        if (existing) {
            throw new BadRequestException('Onboarding already started for this customer');
        }

        const workflow = this.workflowRepository.create({
            customerId,
            status: OnboardingStatus.IN_PROGRESS,
            steps: [
                this.stepRepository.create({ name: 'Complete Profile', order: 1, description: 'Fill in business details' }),
                this.stepRepository.create({ name: 'Upload Documents', order: 2, description: 'Upload KYC documents' }),
                this.stepRepository.create({ name: 'Connect Bank Account', order: 3, description: 'Link primary bank account' }),
            ],
        });

        return this.workflowRepository.save(workflow);
    }

    async completeStep(workflowId: string, stepId: string): Promise<OnboardingWorkflow> {
        const workflow = await this.workflowRepository.findOne({ where: { id: workflowId }, relations: ['steps'] });
        if (!workflow) {
            throw new NotFoundException('Workflow not found');
        }

        const step = workflow.steps.find((s) => s.id === stepId);
        if (!step) {
            throw new NotFoundException('Step not found in workflow');
        }

        step.status = StepStatus.COMPLETED;
        step.completedAt = new Date();
        await this.stepRepository.save(step);

        this.updateProgress(workflow);
        return this.workflowRepository.save(workflow);
    }

    async getProgress(customerId: string): Promise<OnboardingWorkflow> {
        const workflow = await this.workflowRepository.findOne({ where: { customerId }, relations: ['steps'] });
        if (!workflow) {
            throw new NotFoundException('Onboarding not started');
        }
        return workflow;
    }

    async getWorkflow(workflowId: string): Promise<OnboardingWorkflow> {
        const workflow = await this.workflowRepository.findOne({ where: { id: workflowId }, relations: ['steps'] });
        if (!workflow) {
            throw new NotFoundException('Workflow not found');
        }
        return workflow;
    }

    private updateProgress(workflow: OnboardingWorkflow) {
        const total = workflow.steps.length;
        const completed = workflow.steps.filter((s) => s.status === StepStatus.COMPLETED).length;
        workflow.progress = (completed / total) * 100;

        if (workflow.progress === 100) {
            workflow.status = OnboardingStatus.COMPLETED;
        }
    }
}
