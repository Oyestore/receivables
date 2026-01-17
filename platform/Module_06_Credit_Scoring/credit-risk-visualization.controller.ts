import { Controller, Get, Param, Query } from '@nestjs/common';
import { CreditRiskVisualizationService } from './credit-risk-visualization.service';

@Controller('credit-scoring/visualization')
export class CreditRiskVisualizationController {
    constructor(private readonly vizService: CreditRiskVisualizationService) { }

    @Get('dashboard/:buyerId')
    async getDashboard(
        @Param('buyerId') buyerId: string,
        @Query('tenantId') tenantId: string
    ) {
        return await this.vizService.generateCreditRiskDashboard(buyerId, tenantId);
    }

    @Get('options')
    async getOptions(@Query('tenantId') tenantId: string) {
        return await this.vizService.getVisualizationOptions(tenantId);
    }

    @Get('report/:buyerId/pdf')
    async getPdfReport(
        @Param('buyerId') buyerId: string,
        @Query('tenantId') tenantId: string
    ) {
        return await this.vizService.generatePdfReport(buyerId, tenantId);
    }

    @Get('report/:buyerId/excel')
    async getExcelReport(
        @Param('buyerId') buyerId: string,
        @Query('tenantId') tenantId: string
    ) {
        return await this.vizService.generateExcelReport(buyerId, tenantId);
    }
}
