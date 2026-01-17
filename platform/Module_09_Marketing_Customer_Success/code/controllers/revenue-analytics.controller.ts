import { Controller, Get, Query, Param } from '@nestjs/common';
import { RevenueAnalyticsService } from '../services/revenue-analytics.service';

/**
 * Revenue Analytics Controller
 * 
 * Exposes MRR/ARR tracking, forecasting, and revenue optimization endpoints
 */

@Controller('analytics/revenue')
export class RevenueAnalyticsController {
    constructor(
        private readonly revenueAnalyticsService: RevenueAnalyticsService,
    ) { }

    /**
     * Get comprehensive revenue metrics
     */
    @Get('metrics')
    async getRevenueMetrics(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const metrics = await this.revenueAnalyticsService.getRevenueMetrics(
            tenantId,
            new Date(startDate),
            new Date(endDate),
        );

        return {
            success: true,
            data: metrics,
        };
    }

    /**
     * Get revenue forecast
     */
    @Get('forecast')
    async getRevenueForecast(
        @Query('tenantId') tenantId: string,
        @Query('months') months: number = 12,
    ) {
        const forecast = await this.revenueAnalyticsService.forecastRevenue(
            tenantId,
            months,
        );

        return {
            success: true,
            data: forecast,
        };
    }

    /**
     * Get cohort retention analysis
     */
    @Get('cohorts/:tenantId')
    async getCohortAnalysis(@Param('tenantId') tenantId: string) {
        const cohortData = await this.revenueAnalyticsService.analyzeCohortRetention(
            tenantId,
        );

        return {
            success: true,
            data: cohortData,
        };
    }

    /**
     * Get revenue optimization opportunities
     */
    @Get('opportunities/:tenantId')
    async getOptimizationOpportunities(@Param('tenantId') tenantId: string) {
        const opportunities = await this.revenueAnalyticsService.identifyOptimizationOpportunities(
            tenantId,
        );

        return {
            success: true,
            data: opportunities,
        };
    }

    /**
     * Get executive revenue dashboard data
     */
    @Get('dashboard/:tenantId')
    async getExecutiveDashboard(@Param('tenantId') tenantId: string) {
        const dashboard = await this.revenueAnalyticsService.getExecutiveDashboard(
            tenantId,
        );

        return {
            success: true,
            data: dashboard,
        };
    }
}
