import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import { StepStatus } from '../entities/onboarding-step.entity';
import { NotificationIntegrationService } from '../services/notification-integration.service';
import { AnalyticsIntegrationService } from '../services/analytics-integration.service';

@Controller('onboarding')
export class OnboardingController {
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly notificationService: NotificationIntegrationService,
        private readonly analyticsService: AnalyticsIntegrationService,
    ) { }

    @Post('start')
    async startOnboarding(@Body() body: { customerId: string; customerEmail: string }) {
        const workflow = await this.onboardingService.startOnboarding(
            body.customerId
        );

        // Send welcome notification
        await this.notificationService.sendOnboardingNotification(
            workflow.steps[0],
            body.customerEmail
        );

        return workflow;
    }

    @Get(':workflowId')
    async getWorkflow(@Param('workflowId') workflowId: string) {
        return this.onboardingService.getWorkflow(workflowId);
    }

    @Put(':workflowId/steps/:stepId/complete')
    async completeStep(
        @Param('workflowId') workflowId: string,
        @Param('stepId') stepId: string,
        @Body() body: { data?: any }
    ) {
        const updatedWorkflow = await this.onboardingService.completeStep(
            workflowId,
            stepId
        );

        // Find next step to notify about
        const nextStep = updatedWorkflow.steps.find(s => s.status === StepStatus.PENDING);
        if (nextStep) {
            const workflow = await this.onboardingService.getWorkflow(workflowId);
            await this.notificationService.sendOnboardingNotification(
                nextStep,
                'customer@example.com'
            );
        }

        // Track analytics
        await this.analyticsService.trackLeadConversion(
            updatedWorkflow.customerId,
            'onboarding_step_completed',
            'onboarding_in_progress'
        );

        return updatedWorkflow;
    }

    @Get(':workflowId/progress')
    async getProgress(@Param('workflowId') workflowId: string) {
        const workflow = await this.onboardingService.getWorkflow(workflowId);

        const totalSteps = workflow.steps.length;
        const completedSteps = workflow.steps.filter(s => s.status === StepStatus.COMPLETED).length;
        const progressPercentage = (completedSteps / totalSteps) * 100;

        return {
            workflowId,
            totalSteps,
            completedSteps,
            progressPercentage,
            currentStep: workflow.steps.find(s => s.status === StepStatus.PENDING),
            status: workflow.status,
        };
    }
}
