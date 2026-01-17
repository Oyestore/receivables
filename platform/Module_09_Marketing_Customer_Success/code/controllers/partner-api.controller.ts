import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { PartnerManagementService } from '../services/partner-management.service';
import { APIMarketplaceService } from '../services/api-marketplace.service';

/**
 * Partner Management Controller
 */

@Controller('partners')
export class PartnerController {
    constructor(
        private readonly partnerService: PartnerManagementService,
    ) { }

    @Get('performance/:partnerId')
    async getPartnerPerformance(
        @Param('partnerId') partnerId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const performance = await this.partnerService.getPartnerPerformance(
            partnerId,
            new Date(startDate),
            new Date(endDate),
        );

        return { success: true, data: performance };
    }

    @Get('commissions/:partnerId')
    async getCommissionReport(@Param('partnerId') partnerId: string) {
        const report = await this.partnerService.generateCommissionReport(partnerId);
        return { success: true, data: report };
    }

    @Get('leaderboard')
    async getPartnerLeaderboard(@Query('type') type?: string) {
        const leaderboard = await this.partnerService.getPartnerLeaderboard(type as any);
        return { success: true, data: leaderboard };
    }

    @Post('register')
    async registerPartner(@Body() partnerData: any) {
        const partner = await this.partnerService.registerPartner(partnerData);
        return { success: true, data: partner };
    }
}

/**
 * API Marketplace Controller
 */

@Controller('integrations')
export class IntegrationController {
    constructor(
        private readonly apiService: APIMarketplaceService,
    ) { }

    @Get()
    async listIntegrations(@Query('tenantId') tenantId?: string) {
        const integrations = await this.apiService.getIntegrationCatalog(tenantId);
        return { success: true, data: integrations };
    }

    @Get('usage/:tenantId')
    async getAPIUsage(@Param('tenantId') tenantId: string) {
        const usage = await this.apiService.trackAPIUsage(tenantId, '', 0);
        return { success: true, data: usage };
    }

    @Post('keys')
    async generateAPIKey(@Body() data: { tenantId: string; name: string }) {
        const key = await this.apiService.generateAPIKey(data.tenantId, data.name);
        return { success: true, data: key };
    }

    @Delete('keys/:keyId')
    async revokeAPIKey(@Param('keyId') keyId: string) {
        await this.apiService.revokeAPIKey(keyId);
        return { success: true, message: 'API key revoked' };
    }

    @Get('analytics/:tenantId')
    async getMarketplaceAnalytics(@Param('tenantId') tenantId: string) {
        const analytics = await this.apiService.getMarketplaceAnalytics(tenantId);
        return { success: true, data: analytics };
    }
}
