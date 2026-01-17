import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { InsightGenerationService } from '../services/insight-generation.service';
import { EventIngestionService } from '../services/event-ingestion.service';
import { BusinessIntelligenceGateway } from '../gateway/business-intelligence.gateway';

/**
 * Business Intelligence Controller
 * 
 * REST API for the Business Intelligence Copilot
 */
@Controller('api/v1/intelligence')
export class BusinessIntelligenceController {
    constructor(
        private readonly insightService: InsightGenerationService,
        private readonly eventService: EventIngestionService,
        private readonly wsGateway: BusinessIntelligenceGateway,
    ) { }

    /**
     * Get current insights for tenant
     */
    @Get('insights/:tenantId')
    async getInsights(@Param('tenantId') tenantId: string) {
        const insights = await this.insightService.generateInsights(tenantId);

        return {
            success: true,
            data: insights,
            count: insights.length,
            timestamp: new Date(),
        };
    }

    /**
     * Get morning briefing
     */
    @Get('morning-briefing/:tenantId')
    async getMorningBriefing(@Param('tenantId') tenantId: string) {
        const briefing = await this.insightService.getMorningBriefing(tenantId);

        return {
            success: true,
            data: briefing,
            timestamp: new Date(),
        };
    }

    /**
     * Get business metrics
     */
    @Get('metrics/:tenantId')
    async getMetrics(@Param('tenantId') tenantId: string) {
        // Mock metrics for Phase 1
        return {
            success: true,
            data: {
                cashFlow: {
                    current: 1250000,
                    change: 15,
                    trend: 'up',
                    forecast: [
                        { date: '2026-01-16', amount: 1300000 },
                        { date: '2026-01-17', amount: 1350000 },
                        { date: '2026-01-18', amount: 1280000 },
                    ],
                },
                revenue: {
                    today: 250000,
                    thisWeek: 1500000,
                    thisMonth: 4600000,
                    target: 5000000,
                },
                pending: {
                    invoices: 12,
                    amount: 850000,
                    overdue: 3,
                },
                payments: {
                    completed: 45,
                    pending: 8,
                    failed: 2,
                },
            },
        };
    }

    /**
     * Get event statistics
     */
    @Get('events/stats/:tenantId')
    async getEventStats(@Param('tenantId') tenantId: string) {
        const stats = await this.eventService.getEventStats(tenantId);

        return {
            success: true,
            data: stats,
        };
    }

    /**
     * Get events for date range
     */
    @Get('events/:tenantId')
    async getEvents(
        @Param('tenantId') tenantId: string,
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('types') types?: string,
    ) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const eventTypes = types ? types.split(',') : undefined;

        const events = await this.eventService.getEvents(
            tenantId,
            startDate,
            endDate,
            eventTypes,
        );

        return {
            success: true,
            data: events,
            count: events.length,
        };
    }

    /**
     * Execute action from insight
     */
    @Post('actions/:actionId')
    async executeAction(
        @Param('actionId') actionId: string,
        @Body() payload: any,
    ) {
        // Action execution logic
        return {
            success: true,
            message: `Action ${actionId} executed`,
            data: payload,
        };
    }

    /**
     * Get WebSocket connection status
     */
    @Get('connections/:tenantId')
    async getConnectionStatus(@Param('tenantId') tenantId: string) {
        const count = this.wsGateway.getConnectedClientCount(tenantId);

        return {
            success: true,
            connected: count,
            active: count > 0,
        };
    }
}
