import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SubscriptionManagementService } from './subscription-management.service';

@Controller('credit-scoring/subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionManagementService) { }

    @Get('plans')
    async getPlans() {
        return await this.subscriptionService.getAvailablePlans();
    }

    @Get('current')
    async getCurrentPlan(@Query('tenantId') tenantId: string) {
        return await this.subscriptionService.getSubscriptionPlan(tenantId);
    }

    @Post('upgrade')
    async upgradePlan(
        @Query('tenantId') tenantId: string,
        @Body() body: { planId: string; paymentDetails: any }
    ) {
        return await this.subscriptionService.upgradeSubscription(tenantId, body.planId, body.paymentDetails);
    }

    @Get('usage')
    async getUsage(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return await this.subscriptionService.getUsageStatistics(tenantId, new Date(startDate), new Date(endDate));
    }
}
