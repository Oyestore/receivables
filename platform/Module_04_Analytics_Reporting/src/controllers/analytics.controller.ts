import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
// import { TenantGuard } from '../guards/tenant.guard'; // Assuming existence, or leaving generic

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('revenue')
    async getRevenue(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        // In real app, tenantId mainly comes from JWT User context
        return await this.analyticsService.getRevenueMetrics(tenantId, { startDate, endDate });
    }

    @Get('aging-report')
    async getAgingReport(@Query('tenantId') tenantId: string) {
        return await this.analyticsService.getAgingReport(tenantId);
    }

    @Get('cash-flow')
    async getCashFlow(@Query('tenantId') tenantId: string) {
        return await this.analyticsService.getCashFlowProjection(tenantId);
    }
}
