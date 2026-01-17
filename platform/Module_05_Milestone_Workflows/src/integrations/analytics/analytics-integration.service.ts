import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WorkflowInstance } from '../../entities/workflow-instance.entity';
import { Milestone } from '../../entities/milestone.entity';
import { WorkflowState } from '../../entities/workflow-state.entity';
import { ANALYTICS_EVENTS } from '../../events/event-constants';

/**
 * Analytics Integration Service
 * 
 * Handles all integration with Module 04 (Business Intelligence)
 * - Sends real-time workflow metrics
 * - Emits milestone events for analytics
 * - Provides performance data
 */
@Injectable()
export class AnalyticsIntegrationService {
    private readonly logger = new Logger(AnalyticsIntegrationService.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
        @InjectRepository(WorkflowInstance)
        private readonly workflowInstanceRepository: Repository<WorkflowInstance>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(WorkflowState)
        private readonly workflowStateRepository: Repository<WorkflowState>,
    ) {
        this.logger.log('Analytics Integration initialized');
    }

    /**
     * Send workflow metrics to Module 04
     */
    async sendWorkflowMetrics(workflowInstanceId: string): Promise<void> {
        try {
            const metrics = await this.calculateWorkflowMetrics(workflowInstanceId);

            this.eventEmitter.emit(ANALYTICS_EVENTS.WORKFLOW_METRICS, {
                workflowInstanceId,
                tenantId: metrics.tenantId,
                timestamp: new Date(),
                metrics: {
                    totalMilestones: metrics.totalMilestones,
                    completedMilestones: metrics.completedMilestones,
                    pendingMilestones: metrics.pendingMilestones,
                    overdueMilestones: metrics.overdueMilestones,
                    blockedMilestones: metrics.blockedMilestones,
                    completionPercentage: metrics.completionPercentage,
                    averageCompletionTime: metrics.averageCompletionTime,
                    estimatedCompletionDate: metrics.estimatedCompletionDate,
                    totalValue: metrics.totalValue,
                    paidValue: metrics.paidValue,
                    pendingValue: metrics.pendingValue,
                    onTimePercentage: metrics.onTimePercentage,
                },
            });

            this.logger.log(`Workflow metrics sent for instance: ${workflowInstanceId}`);
        } catch (error) {
            this.logger.error(`Failed to send workflow metrics: ${error.message}`);
        }
    }

    /**
     * Send milestone event to analytics
     */
    async sendMilestoneEvent(
        eventType: string,
        milestoneId: string,
        metadata: Record<string, any>,
    ): Promise<void> {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
            });

            if (!milestone) {
                return;
            }

            this.eventEmitter.emit(ANALYTICS_EVENTS.MILESTONE_EVENT, {
                eventType,
                milestoneId,
                workflowInstanceId: milestone.workflowInstanceId,
                tenantId: milestone.tenantId,
                timestamp: new Date(),
                milestoneData: {
                    name: milestone.name,
                    type: milestone.type,
                    status: milestone.status,
                    paymentAmount: milestone.paymentAmount,
                    completionPercentage: milestone.completionPercentage,
                    dueDate: milestone.dueDate,
                    isOverdue: milestone.dueDate ? new Date() > milestone.dueDate : false,
                },
                metadata,
            });
        } catch (error) {
            this.logger.error(`Failed to send milestone event: ${error.message}`);
        }
    }

    /**
     * Send performance data to analytics
     */
    async sendPerformanceData(tenantId: string, timeRange: string = '30d'): Promise<void> {
        try {
            const performanceData = await this.calculatePerformanceMetrics(tenantId, timeRange);

            this.eventEmitter.emit(ANALYTICS_EVENTS.PERFORMANCE_DATA, {
                tenantId,
                timestamp: new Date(),
                timeRange,
                performance: {
                    workflowsCompleted: performanceData.workflowsCompleted,
                    milestonesCompleted: performanceData.milestonesCompleted,
                    averageWorkflowDuration: performanceData.averageWorkflowDuration,
                    averageMilestoneDuration: performanceData.averageMilestoneDuration,
                    successRate: performanceData.successRate,
                    onTimeDeliveryRate: performanceData.onTimeDeliveryRate,
                    escalationRate: performanceData.escalationRate,
                    totalValueProcessed: performanceData.totalValueProcessed,
                    averageVerificationTime: performanceData.averageVerificationTime,
                },
            });

            this.logger.log(`Performance data sent for tenant: ${tenantId}, range: ${timeRange}`);
        } catch (error) {
            this.logger.error(`Failed to send performance data: ${error.message}`);
        }
    }

    /**
     * Calculate workflow metrics
     */
    private async calculateWorkflowMetrics(workflowInstanceId: string): Promise<any> {
        const instance = await this.workflowInstanceRepository.findOne({
            where: { id: workflowInstanceId, isDeleted: false },
            relations: ['milestones'],
        });

        if (!instance) {
            throw new Error(`Workflow instance ${workflowInstanceId} not found`);
        }

        const milestones = instance.milestones || [];
        const now = new Date();

        const totalMilestones = milestones.length;
        const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
        const pendingMilestones = milestones.filter(m => m.status === 'PENDING').length;
        const overdueMilestones = milestones.filter(m => m.dueDate && m.dueDate < now && m.status !== 'COMPLETED').length;
        const blockedMilestones = milestones.filter(m => m.status === 'BLOCKED').length;

        const completionPercentage = totalMilestones > 0
            ? (completedMilestones / totalMilestones) * 100
            : 0;

        // Calculate average completion time for completed milestones
        const completedWithTimes = milestones.filter(m =>
            m.status === 'COMPLETED' && m.startedAt && m.completedAt
        );
        const averageCompletionTime = completedWithTimes.length > 0
            ? completedWithTimes.reduce((sum, m) => {
                const duration = m.completedAt.getTime() - m.startedAt.getTime();
                return sum + duration;
            }, 0) / completedWithTimes.length / (1000 * 60 * 60 * 24) // Convert to days
            : 0;

        // Estimate completion date based on current velocity
        let estimatedCompletionDate = null;
        if (completedMilestones > 0 && pendingMilestones > 0) {
            const avgDaysPerMilestone = averageCompletionTime || 7; // Default to 7 days
            const remainingDays = pendingMilestones * avgDaysPerMilestone;
            estimatedCompletionDate = new Date();
            estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + remainingDays);
        }

        // Calculate financial metrics
        const totalValue = milestones.reduce((sum, m) => sum + (m.paymentAmount || 0), 0);
        const paidValue = milestones
            .filter(m => m.paymentStatus === 'COMPLETED')
            .reduce((sum, m) => sum + (m.paidAmount || 0), 0);
        const pendingValue = totalValue - paidValue;

        // Calculate on-time percentage
        const completedWithDueDates = milestones.filter(m =>
            m.status === 'COMPLETED' && m.dueDate && m.completedAt
        );
        const onTimeMilestones = completedWithDueDates.filter(m =>
            m.completedAt <= m.dueDate
        ).length;
        const onTimePercentage = completedWithDueDates.length > 0
            ? (onTimeMilestones / completedWithDueDates.length) * 100
            : 100;

        return {
            tenantId: instance.tenantId,
            totalMilestones,
            completedMilestones,
            pendingMilestones,
            overdueMilestones,
            blockedMilestones,
            completionPercentage,
            averageCompletionTime,
            estimatedCompletionDate,
            totalValue,
            paidValue,
            pendingValue,
            onTimePercentage,
        };
    }

    /**
     * Calculate performance metrics for tenant
     */
    private async calculatePerformanceMetrics(tenantId: string, timeRange: string): Promise<any> {
        const days = this.parseTimeRange(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Workflows completed in time range
        const completedWorkflows = await this.workflowInstanceRepository
            .createQueryBuilder('workflow')
            .where('workflow.tenantId = :tenantId', { tenantId })
            .andWhere('workflow.status = :status', { status: 'COMPLETED' })
            .andWhere('workflow.completedAt >= :startDate', { startDate })
            .andWhere('workflow.isDeleted = :isDeleted', { isDeleted: false })
            .getMany();

        // Milestones completed in time range
        const completedMilestones = await this.milestoneRepository
            .createQueryBuilder('milestone')
            .where('milestone.tenantId = :tenantId', { tenantId })
            .andWhere('milestone.status = :status', { status: 'COMPLETED' })
            .andWhere('milestone.completedAt >= :startDate', { startDate })
            .andWhere('milestone.isDeleted = :isDeleted', { isDeleted: false })
            .getMany();

        // Average workflow duration
        const workflowDurations = completedWorkflows
            .filter(w => w.startedAt && w.completedAt)
            .map(w => (w.completedAt.getTime() - w.startedAt.getTime()) / (1000 * 60 * 60 * 24));
        const averageWorkflowDuration = workflowDurations.length > 0
            ? workflowDurations.reduce((sum, d) => sum + d, 0) / workflowDurations.length
            : 0;

        // Average milestone duration
        const milestoneDurations = completedMilestones
            .filter(m => m.startedAt && m.completedAt)
            .map(m => (m.completedAt.getTime() - m.startedAt.getTime()) / (1000 * 60 * 60 * 24));
        const averageMilestoneDuration = milestoneDurations.length > 0
            ? milestoneDurations.reduce((sum, d) => sum + d, 0) / milestoneDurations.length
            : 0;

        // Success rate
        const totalWorkflows = await this.workflowInstanceRepository.count({
            where: {
                tenantId,
                createdAt: MoreThanOrEqual(startDate),
                isDeleted: false,
            },
        });
        const successRate = totalWorkflows > 0
            ? (completedWorkflows.length / totalWorkflows) * 100
            : 0;

        // On-time delivery rate
        const onTimeMilestones = completedMilestones.filter(m =>
            m.dueDate && m.completedAt && m.completedAt <= m.dueDate
        ).length;
        const onTimeDeliveryRate = completedMilestones.length > 0
            ? (onTimeMilestones / completedMilestones.length) * 100
            : 0;

        // Escalation rate (placeholder - would need escalation data)
        const escalationRate = 5; // TODO: Calculate from actual escalation data

        // Total value processed
        const totalValueProcessed = completedMilestones.reduce((sum, m) =>
            sum + (m.paidAmount || 0), 0
        );

        // Average verification time (placeholder)
        const averageVerificationTime = 2; // TODO: Calculate from verification data

        return {
            workflowsCompleted: completedWorkflows.length,
            milestonesCompleted: completedMilestones.length,
            averageWorkflowDuration,
            averageMilestoneDuration,
            successRate,
            onTimeDeliveryRate,
            escalationRate,
            totalValueProcessed,
            averageVerificationTime,
        };
    }

    /**
     * Parse time range string to days
     */
    private parseTimeRange(timeRange: string): number {
        const match = timeRange.match(/^(\d+)([dwmy])$/);
        if (!match) {
            return 30; // Default to 30 days
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'd':
                return value;
            case 'w':
                return value * 7;
            case 'm':
                return value * 30;
            case 'y':
                return value * 365;
            default:
                return 30;
        }
    }
}
