import { Controller, Get, Param, Query, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { PredictiveAnalyticsService } from '../services/predictive-analytics.service';

/**
 * Export Controller
 * 
 * Handles all export functionality
 */
@Controller('api/v1/export')
export class ExportController {
    constructor(
        private readonly exportService: ExportService,
        private readonly predictiveService: PredictiveAnalyticsService,
    ) { }

    /**
     * Export insights as CSV
     */
    @Get('insights/:tenantId/csv')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="insights.csv"')
    async exportInsightsCSV(
        @Param('tenantId') tenantId: string,
        @Res() res: Response,
    ) {
        const csv = await this.exportService.exportInsightsCSV(tenantId);
        res.send(csv);
    }

    /**
     * Export cash flow as CSV
     */
    @Get('cash-flow/:tenantId/csv')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="cash-flow.csv"')
    async exportCashFlowCSV(
        @Param('tenantId') tenantId: string,
        @Query('days') days: string,
        @Res() res: Response,
    ) {
        const daysNum = parseInt(days) || 30;
        const csv = await this.exportService.exportCashFlowCSV(tenantId, daysNum);
        res.send(csv);
    }

    /**
     * Generate business summary report
     */
    @Get('summary/:tenantId')
    @Header('Content-Type', 'text/markdown')
    @Header('Content-Disposition', 'attachment; filename="business-summary.md"')
    async getBusinessSummary(
        @Param('tenantId') tenantId: string,
        @Res() res: Response,
    ) {
        const report = await this.exportService.generateBusinessSummary(tenantId);
        res.send(report);
    }

    /**
     * Export as JSON
     */
    @Get(':dataType/:tenantId/json')
    async exportJSON(
        @Param('tenantId') tenantId: string,
        @Param('dataType') dataType: string,
    ) {
        const data = await this.exportService.exportJSON(tenantId, dataType);

        return {
            success: true,
            type: dataType,
            tenantId,
            exportedAt: new Date(),
            data,
        };
    }

    /**
     * Run scenario and export results
     */
    @Get('scenario/:tenantId')
    async exportScenario(
        @Param('tenantId') tenantId: string,
        @Query('type') type: string,
        @Query('params') params: string,
    ) {
        // Mock scenario export
        return {
            success: true,
            scenario: type,
            parameters: JSON.parse(params || '{}'),
            results: {
                // Would contain actual scenario results
            },
            exportedAt: new Date(),
        };
    }
}
