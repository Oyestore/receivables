import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NetworkCreditIntelligenceService } from './network-credit-intelligence.service';
import { NetworkPatternDetectionService } from './network-pattern-detection.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

/**
 * Network Credit Intelligence Controller
 * 
 * Exposes the 10x Network Effect APIs
 * The game-changing feature that creates monopoly dynamics
 */
@Controller('credit-scoring/network')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NetworkCreditIntelligenceController {
    constructor(
        private readonly networkService: NetworkCreditIntelligenceService,
        private readonly patternService: NetworkPatternDetectionService,
    ) { }

    /**
     * GET Community Credit Score for a Buyer
     * THE PRIMARY VALUE PROP: Cross-tenant credit intelligence
     */
    @Get('score/:buyerPAN')
    @Roles('credit_manager', 'admin', 'finance_manager')
    async getCommunityScore(
        @Param('buyerPAN') buyerPAN: string,
        @Query('tenantId') tenantId: string,
    ) {
        return this.networkService.getCommunityScore(buyerPAN, tenantId);
    }

    /**
     * POST Contribute Payment Observation
     * Privacy-first data contribution
     */
    @Post('contribute')
    async contributeObservation(
        @Body()
        payload: {
            tenantId: string;
            buyerPAN: string;
            paymentData: {
                daysToPay: number;
                invoiceAmount: number;
                transactionDate: Date;
                paidOnTime: boolean;
                hadDispute: boolean;
                industryCode: string;
                region: string;
                revenueClass: string;
            };
        },
    ) {
        await this.networkService.contributePaymentObservation(
            payload.tenantId,
            payload.buyerPAN,
            payload.paymentData,
        );

        return { success: true, message: 'Observation contributed to network' };
    }

    /**
     * POST Register Tenant for Network
     */
    @Post('register')
    async registerTenant(
        @Body() payload: { tenantId: string; tier?: string },
    ) {
        const contribution = await this.networkService.registerTenant(
            payload.tenantId,
            payload.tier || 'STANDARD',
        );

        return {
            success: true,
            contribution,
            message: 'Tenant registered for network intelligence',
        };
    }

    /**
     * GET Network Intelligence Alerts
     */
    @Get('intelligence')
    async getNetworkIntelligence(
        @Query('tenantId') tenantId: string,
        @Query('industryCode') industryCode?: string,
    ) {
        const intelligence = await this.networkService.getNetworkIntelligence(
            tenantId,
            industryCode,
        );

        return {
            count: intelligence.length,
            intelligence,
        };
    }

    /**
     * GET Network Insights Dashboard
     */
    @Get('insights/dashboard/:tenantId')
    async getNetworkInsights(@Param('tenantId') tenantId: string) {
        const insights = await this.patternService.getNetworkInsights(tenantId);

        return insights;
    }

    /**
     * GET Emerging Risk Patterns
     */
    @Get('patterns/emerging-risks')
    async getEmergingRisks(
        @Query('tenantId') tenantId: string,
        @Query('industryCode') industryCode?: string,
    ) {
        const patterns = await this.patternService.detectEmergingRisks(industryCode);

        return {
            count: patterns.length,
            patterns,
        };
    }

    /**
     * GET Industry Payment Trends
     */
    @Get('trends/industry/:industryCode')
    async getIndustryTrends(@Param('industryCode') industryCode: string) {
        const trends = await this.patternService.getIndustryPaymentTrends(industryCode);

        return trends;
    }

    /**
     * GET Peer Benchmarking
     */
    @Get('benchmark/:tenantId')
    async getPeerBenchmark(
        @Param('tenantId') tenantId: string,
        @Query('industryCode') industryCode?: string,
    ) {
        const benchmark = await this.patternService.getPeerBenchmarking(
            tenantId,
            industryCode,
        );

        return benchmark;
    }

    /**
     * GET Trust Score Distribution
     */
    @Get('analytics/trust-distribution')
    async getTrustDistribution(
        @Query('industryCode') industryCode?: string,
        @Query('region') region?: string,
    ) {
        const distribution = await this.patternService.getTrustScoreDistribution(
            industryCode,
            region,
        );

        return distribution;
    }

    /**
     * GET Buyer Risk Comparison
     * Compare a specific buyer against network standards
     */
    @Get('compare/:buyerPAN')
    async compareBuyerToNetwork(
        @Param('buyerPAN') buyerPAN: string,
        @Query('tenantId') tenantId: string,
    ) {
        const comparison = await this.patternService.compareBuyerToNetwork(
            buyerPAN,
            tenantId,
        );

        return comparison;
    }
}
