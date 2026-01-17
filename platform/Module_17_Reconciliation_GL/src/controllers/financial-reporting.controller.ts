import { Controller, Get, Query } from '@nestjs/common';
import { FinancialReportingService } from '../services/financial-reporting.service';

@Controller('gl')
export class FinancialReportingController {
    constructor(private readonly reportingService: FinancialReportingService) { }

    @Get('trial-balance')
    async getTrialBalance(@Query('tenantId') tenantId: string, @Query('date') date: string) {
        return await this.reportingService.getTrialBalance(tenantId, new Date(date));
    }

    @Get('profit-loss')
    async getProfitAndLoss(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return await this.reportingService.getProfitAndLoss(tenantId, new Date(startDate), new Date(endDate));
    }
}
