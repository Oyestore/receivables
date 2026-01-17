import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomerFeedbackNPSService, SurveyType } from '../services/customer-feedback-nps.service';
import { ExpansionOpportunityService } from '../services/expansion-opportunity.service';
import { CommunicationHubService, CommunicationType, MessagePriority, CommunicationChannel } from '../services/communication-hub.service';
import { CustomerHealthService } from '../services/customer-health.service';

/**
 * Customer Success Controller
 * 
 * REST API endpoints for Phase 9.2 customer success services
 */

@Controller('api/v1/customer-success')
export class CustomerSuccessController {
    constructor(
        private readonly feedbackService: CustomerFeedbackNPSService,
        private readonly expansionService: ExpansionOpportunityService,
        private readonly communicationService: CommunicationHubService,
        private readonly healthService: CustomerHealthService,
    ) { }

    // ========================================================================
    // HEALTH & CHURN ENDPOINTS
    // ========================================================================

    @Get('health/:customerId')
    async getHealthMetrics(@Param('customerId') customerId: string) {
        // Find tenantId from context or assumption (mocking tenant-123 for now if request doesn't have it)
        const tenantId = 'tenant-123';
        return this.healthService.calculateHealthScore(tenantId, customerId, (this.healthService as any).getMockData());
    }

    @Get('churn/predict/:customerId')
    async getChurnPrediction(@Param('customerId') customerId: string) {
        const health = await this.healthService.calculateHealthScore('tenant-123', customerId, (this.healthService as any).getMockData());
        return {
            customerId,
            churnRisk: health.churnRiskScore,
            riskLevel: health.healthCategory === 'at_risk' ? 'High' : 'Low',
            prediction: health.churnRiskScore > 70 ? 'Likely to Stay' : 'Risk of Churn'
        };
    }

    @Get('churn/at-risk/:tenantId')
    async getAtRiskCustomers(@Param('tenantId') tenantId: string) {
        return this.healthService.identifyAtRiskCustomers(tenantId);
    }

    @Get('health/portfolio/:tenantId')
    async getPortfolioHealthSummary(@Param('tenantId') tenantId: string) {
        // Mock customer list for summary
        return this.healthService.getPortfolioHealthSummary(tenantId, ['c1', 'c2', 'c3', 'c4', 'c5']);
    }

    // ========================================================================
    // FEEDBACK & NPS ENDPOINTS
    // ========================================================================

    @Post('surveys/send')
    @HttpCode(HttpStatus.OK)
    async sendSurvey(
        @Body() body: {
            tenantId: string;
            customerId: string;
            surveyType: SurveyType;
            context?: Record<string, any>;
        },
    ) {
        return this.feedbackService.sendSurvey(
            body.tenantId,
            body.customerId,
            body.surveyType,
            body.context,
        );
    }

    @Post('surveys/:surveyId/responses')
    @HttpCode(HttpStatus.CREATED)
    async submitSurveyResponse(
        @Param('surveyId') surveyId: string,
        @Body() body: {
            customerId: string;
            responses: Array<{
                questionId: string;
                answer: string | number;
            }>;
        },
    ) {
        return this.feedbackService.processSurveyResponse(
            surveyId,
            body.customerId,
            body.responses,
        );
    }

    @Get('metrics/nps')
    async getNPSMetrics(
        @Query('tenantId') tenantId: string,
        @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    ) {
        return this.feedbackService.calculateNPSMetrics(tenantId, period);
    }

    @Get('insights/feedback')
    async getFeedbackInsights(
        @Query('tenantId') tenantId: string,
        @Query('timeframe') timeframe: number = 30,
    ) {
        return this.feedbackService.getFeedbackInsights(tenantId, timeframe);
    }

    @Get('metrics/csat/trends')
    async getCSATTrends(
        @Query('tenantId') tenantId: string,
        @Query('months') months: number = 6,
    ) {
        return this.feedbackService.getCSATTrends(tenantId, months);
    }

    // ========================================================================
    // EXPANSION OPPORTUNITY ENDPOINTS
    // ========================================================================

    @Post('opportunities/identify')
    @HttpCode(HttpStatus.OK)
    async identifyExpansionOpportunities(
        @Body() body: {
            tenantId: string;
            customerId: string;
            customerData: {
                currentMRR: number;
                currentPlan: string;
                usageMetrics: Record<string, any>;
                healthScore: number;
                tenure: number;
                engagementLevel: 'high' | 'medium' | 'low';
            };
        },
    ) {
        return this.expansionService.identifyOpportunities(
            body.tenantId,
            body.customerId,
            body.customerData,
        );
    }

    @Post('opportunities/score')
    @HttpCode(HttpStatus.OK)
    async calculateExpansionScore(
        @Body() body: {
            customerId: string;
            customerData: {
                healthScore: number;
                npsScore?: number;
                usageGrowth: number;
                productAdoption: number;
                supportSatisfaction: number;
                paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
            };
        },
    ) {
        return this.expansionService.calculateExpansionScore(
            body.customerId,
            body.customerData,
        );
    }

    @Post('renewals/forecast')
    @HttpCode(HttpStatus.OK)
    async getRenewalForecast(
        @Body() body: {
            customerId: string;
            contractData: {
                renewalDate: Date;
                currentMRR: number;
                contractLength: number;
                healthScore: number;
                churnRisk: number;
            };
        },
    ) {
        return this.expansionService.getRenewalForecast(
            body.customerId,
            body.contractData,
        );
    }

    @Get('pipeline/expansion')
    async getExpansionPipeline(
        @Query('tenantId') tenantId: string,
    ) {
        return this.expansionService.getExpansionPipeline(tenantId);
    }

    // ========================================================================
    // COMMUNICATION ENDPOINTS
    // ========================================================================

    @Post('communications/send')
    @HttpCode(HttpStatus.OK)
    async sendMessage(
        @Body() body: {
            customerId: string;
            message: {
                type: CommunicationType;
                priority: MessagePriority;
                subject: string;
                content: string;
                templateId?: string;
                personalizations?: Record<string, string>;
                metadata?: Record<string, any>;
            };
        },
    ) {
        return this.communicationService.sendMessage(
            body.customerId,
            body.message,
        );
    }

    @Get('communications/preferences/:customerId')
    async getCustomerPreferences(
        @Param('customerId') customerId: string,
    ) {
        return this.communicationService.getCustomerPreferences(customerId);
    }

    @Post('communications/preferences/:customerId')
    @HttpCode(HttpStatus.OK)
    async updateCustomerPreferences(
        @Param('customerId') customerId: string,
        @Body() updates: any,
    ) {
        return this.communicationService.updateCustomerPreferences(
            customerId,
            updates,
        );
    }

    @Get('communications/history/:customerId')
    async getConversationHistory(
        @Param('customerId') customerId: string,
        @Query('limit') limit: number = 50,
    ) {
        return this.communicationService.getConversationHistory(
            customerId,
            limit,
        );
    }

    @Get('communications/analytics')
    async getCommunicationAnalytics(
        @Query('tenantId') tenantId: string,
        @Query('timeframe') timeframe: number = 30,
    ) {
        return this.communicationService.getCommunicationAnalytics(
            tenantId,
            timeframe,
        );
    }

    @Post('campaigns/orchestrate')
    @HttpCode(HttpStatus.CREATED)
    async orchestrateCampaign(
        @Body() campaign: {
            name: string;
            type: CommunicationType;
            audience: string[];
            steps: Array<{
                delay: number;
                channel: CommunicationChannel;
                templateId: string;
                personalizations?: Record<string, string>;
            }>;
        },
    ) {
        return this.communicationService.orchestrateCampaign(campaign);
    }
}
