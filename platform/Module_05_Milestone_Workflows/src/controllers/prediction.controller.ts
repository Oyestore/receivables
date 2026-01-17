import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PredictionService, PredictionResult, HighRiskMilestone } from '../services/prediction.service';
import { RiskMonitoringService, RiskScore, RiskAlert } from '../services/risk-monitoring.service';

/**
 * Prediction Controller
 * 
 * API endpoints for AI-powered predictions and risk monitoring
 */
@Controller('api/v1/predictions')
@ApiTags('Predictions & Risk Monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PredictionController {
    constructor(
        private readonly predictionService: PredictionService,
        private readonly riskMonitoringService: RiskMonitoringService,
    ) { }

    /**
     * Get prediction for a single milestone
     */
    @Get('milestone/:milestoneId')
    @ApiOperation({ summary: 'Get AI prediction for milestone completion' })
    @ApiResponse({ status: 200, description: 'Prediction retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Milestone not found' })
    @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
    @ApiQuery({ name: 'useCache', required: false, description: 'Use cached prediction' })
    async getMilestonePrediction(
        @Param('milestoneId') milestoneId: string,
        @Query('useCache') useCache: string,
    ): Promise<PredictionResult> {
        const useCacheFlag = useCache !== 'false';
        return this.predictionService.predictMilestoneCompletion(milestoneId, useCacheFlag);
    }

    /**
     * Get predictions for all milestones in a workflow
     */
    @Get('workflow/:workflowInstanceId')
    @ApiOperation({ summary: 'Get predictions for all milestones in workflow' })
    @ApiResponse({ status: 200, description: 'Predictions retrieved successfully' })
    @ApiParam({ name: 'workflowInstanceId', description: 'Workflow instance ID' })
    async getWorkflowPredictions(
        @Param('workflowInstanceId') workflowInstanceId: string,
    ): Promise<PredictionResult[]> {
        return this.predictionService.predictAllWorkflowMilestones(workflowInstanceId);
    }

    /**
     * Get high-risk milestones for current user's tenant
     */
    @Get('high-risk')
    @ApiOperation({ summary: 'Get all high-risk milestones for tenant' })
    @ApiResponse({ status: 200, description: 'High-risk milestones retrieved' })
    async getHighRiskMilestones(
        @CurrentUser('tenantId') tenantId: string,
    ): Promise<HighRiskMilestone[]> {
        return this.predictionService.detectHighRiskMilestones(tenantId);
    }

    /**
     * Trigger manual prediction update
     */
    @Post('update')
    @HttpCode(HttpStatus.ACCEPTED)
    @Roles('admin', 'manager')
    @ApiOperation({ summary: 'Manually trigger prediction update for all active workflows' })
    @ApiResponse({ status: 202, description: 'Prediction update triggered' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async triggerPredictionUpdate(): Promise<{ message: string }> {
        // Trigger async update (don't await)
        this.predictionService.updateAllPredictions().catch(err => {
            console.error('Manual prediction update failed:', err);
        });

        return { message: 'Prediction update triggered successfully' };
    }

    /**
     * Get risk score for a milestone
     */
    @Get('risk-score/:milestoneId')
    @ApiOperation({ summary: 'Get comprehensive risk score for milestone' })
    @ApiResponse({ status: 200, description: 'Risk score calculated successfully' })
    @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
    async getMilestoneRiskScore(
        @Param('milestoneId') milestoneId: string,
    ): Promise<RiskScore> {
        return this.riskMonitoringService.calculateRiskScore(milestoneId);
    }

    /**
     * Get all risk alerts for tenant
     */
    @Get('risk-alerts')
    @ApiOperation({ summary: 'Get all risk alerts for tenant' })
    @ApiResponse({ status: 200, description: 'Risk alerts retrieved successfully' })
    async getRiskAlerts(
        @CurrentUser('tenantId') tenantId: string,
    ): Promise<RiskAlert[]> {
        return this.riskMonitoringService.monitorAllActiveMilestones(tenantId);
    }

    /**
     * Get prediction accuracy metrics
     */
    @Get('accuracy/stats')
    @Roles('admin')
    @ApiOperation({ summary: 'Get prediction accuracy statistics' })
    @ApiResponse({ status: 200, description: 'Accuracy stats retrieved' })
    async getPredictionAccuracyStats(
        @CurrentUser('tenantId') tenantId: string,
    ): Promise<{
        totalPredictions: number;
        accuratePredictions: number;
        accuracyPercentage: number;
        averageDeviation: number;
    }> {
        // TODO: Implement accuracy stats calculation
        return {
            totalPredictions: 0,
            accuratePredictions: 0,
            accuracyPercentage: 0,
            averageDeviation: 0,
        };
    }
}
