import { Injectable, Logger } from '@nestjs/common';
import { InsightGenerationService } from './insight-generation.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

/**
 * Export Service
 * 
 * Generate downloadable reports in multiple formats:
 * - PDF (Business summaries with charts)
 * - Excel (Structured data with formatting)
 * - CSV (Simple data export)
 * - JSON (API export)
 */
@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

    constructor(
        private readonly insightService: InsightGenerationService,
        private readonly predictiveService: PredictiveAnalyticsService,
    ) { }

    /**
     * Export insights report as CSV
     */
    async exportInsightsCSV(tenantId: string): Promise<string> {
        try {
            const insights = await this.insightService.generateInsights(tenantId);

            // CSV Header
            let csv = 'Type,Severity,Title,Message,Impact,Confidence,Created At\n';

            // Data rows
            insights.forEach(insight => {
                csv += `"${insight.type}",`;
                csv += `"${insight.severity}",`;
                csv += `"${insight.title}",`;
                csv += `"${insight.message.replace(/"/g, '""')}",`;
                csv += `"${insight.impact || ''}",`;
                csv += `${insight.confidence},`;
                csv += `"${insight.createdAt.toISOString()}"\n`;
            });

            this.logger.log(`Exported ${insights.length} insights to CSV`);
            return csv;
        } catch (error) {
            this.logger.error(`CSV export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export cash flow prediction as CSV
     */
    async exportCashFlowCSV(tenantId: string, days: number = 30): Promise<string> {
        try {
            const prediction = await this.predictiveService.predictCashFlow(tenantId, days);

            let csv = 'Date,Amount,Confidence,Expected In,Expected Out\n';

            prediction.predictions.forEach(p => {
                csv += `"${p.date}",`;
                csv += `${p.amount},`;
                csv += `${p.confidence},`;
                csv += `${p.breakdown.expected_in},`;
                csv += `${p.breakdown.expected_out}\n`;
            });

            this.logger.log(`Exported ${prediction.predictions.length} days cash flow to CSV`);
            return csv;
        } catch (error) {
            this.logger.error(`Cash flow CSV export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * PRODUCTION: Generate business summary report as PDF
     * Uses PDFKit to create professional PDF reports
     */
    async generateBusinessSummaryPDF(tenantId: string): Promise<Buffer> {
        try {
            const insights = await this.insightService.generateInsights(tenantId);
            const briefing = await this.insightService.getMorningBriefing(tenantId);

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const buffers: Buffer[] = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                // Header
                doc.fontSize(24).font('Helvetica-Bold')
                    .fillColor('#667eea')
                    .text('Business Intelligence Report', { align: 'center' });

                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica')
                    .fillColor('#666666')
                    .text(`Tenant: ${tenantId}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });

                doc.moveDown(1);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#667eea');
                doc.moveDown(1);

                // Executive Summary
                doc.fontSize(16).font('Helvetica-Bold')
                    .fillColor('#000000')
                    .text('Executive Summary');

                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica')
                    .fillColor('#333333')
                    .text(briefing.greeting);

                doc.moveDown(0.5);
                doc.fontSize(12).font('Helvetica-Bold')
                    .fillColor('#10b981')
                    .text(`Cash Position: ${briefing.cashPosition}`);

                doc.moveDown(0.5);
                doc.fontSize(12).font('Helvetica-Bold')
                    .fillColor('#000000')
                    .text('Priority Actions:');

                briefing.priorityActions.forEach((action, idx) => {
                    doc.fontSize(11).font('Helvetica')
                        .fillColor('#333333')
                        .text(`${idx + 1}. ${action}`, { indent: 20 });
                });

                doc.moveDown(1);

                // Today's Prediction
                doc.fontSize(14).font('Helvetica-Bold')
                    .fillColor('#667eea')
                    .text('Today\'s Prediction');

                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica')
                    .fillColor('#333333')
                    .text(briefing.prediction);

                doc.moveDown(1);
                doc.addPage();

                // Key Insights
                doc.fontSize(16).font('Helvetica-Bold')
                    .fillColor('#000000')
                    .text(`Key Insights (${insights.length} Total)`);

                doc.moveDown(0.5);

                insights.slice(0, 5).forEach((insight, idx) => {
                    if (doc.y > 700) doc.addPage();

                    doc.fontSize(13).font('Helvetica-Bold')
                        .fillColor('#667eea')
                        .text(`${idx + 1}. ${insight.title}`);

                    doc.fontSize(10).font('Helvetica')
                        .fillColor('#999999')
                        .text(`Type: ${insight.type}  |  Severity: ${insight.severity}  |  Confidence: ${insight.confidence}%`);

                    doc.moveDown(0.3);
                    doc.fontSize(11).font('Helvetica')
                        .fillColor('#333333')
                        .text(insight.message);

                    doc.moveDown(0.3);
                    doc.fontSize(11).font('Helvetica-Bold')
                        .fillColor('#000000')
                        .text(`Impact: ${insight.impact}`);

                    doc.moveDown(0.3);
                    doc.fontSize(10).font('Helvetica-Bold')
                        .text('Recommended Actions:');

                    insight.actions.forEach(action => {
                        doc.fontSize(10).font('Helvetica')
                            .text(`• ${action.label}`, { indent: 15 });
                    });

                    doc.moveDown(0.8);
                    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#dddddd');
                    doc.moveDown(0.8);
                });

                // Highlights
                if (doc.y > 650) doc.addPage();

                doc.fontSize(14).font('Helvetica-Bold')
                    .fillColor('#000000')
                    .text('Highlights');

                doc.moveDown(0.5);
                briefing.highlights.forEach(highlight => {
                    doc.fontSize(11).font('Helvetica')
                        .fillColor('#333333')
                        .text(`• ${highlight}`, { indent: 15 });
                });

                // Footer
                doc.fontSize(8).font('Helvetica')
                    .fillColor('#999999')
                    .text('Generated by Business Intelligence Copilot - Module 04', 50, 780, {
                        align: 'center'
                    });

                doc.end();
            });
        } catch (error) {
            this.logger.error(`PDF generation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * PRODUCTION: Export insights to Excel with formatting
     */
    async exportInsightsExcel(tenantId: string): Promise<Buffer> {
        try {
            const insights = await this.insightService.generateInsights(tenantId);
            const workbook = new ExcelJS.Workbook();

            workbook.creator = 'Business Intelligence Copilot';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Insights', {
                views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
            });

            // Define columns
            worksheet.columns = [
                { key: 'type', header: 'Type', width: 15 },
                { key: 'severity', header: 'Severity', width: 12 },
                { key: 'title', header: 'Title', width: 35 },
                { key: 'message', header: 'Message', width: 50 },
                { key: 'impact', header: 'Impact', width: 30 },
                { key: 'confidence', header: 'Confidence %', width: 15 },
                { key: 'createdAt', header: 'Created At', width: 20 },
            ];

            // Style header row
            worksheet.getRow(1).font = { bold: true, size: 12 };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667EEA' }
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Add data
            insights.forEach(insight => {
                const row = worksheet.addRow({
                    type: insight.type,
                    severity: insight.severity,
                    title: insight.title,
                    message: insight.message,
                    impact: insight.impact || '',
                    confidence: insight.confidence,
                    createdAt: insight.createdAt.toISOString(),
                });

                // Color code severity
                const severityCell = row.getCell('severity');
                if (insight.severity.toString() === 'HIGH') {
                    severityCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFEF4444' }
                    };
                    severityCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                } else if (insight.severity.toString() === 'MEDIUM') {
                    severityCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF59E0B' }
                    };
                    severityCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                }
            });

            // Auto-filter
            worksheet.autoFilter = {
                from: 'A1',
                to: `G${insights.length + 1}`
            };

            this.logger.log(`Exported ${insights.length} insights to Excel`);
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            this.logger.error(`Excel export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * PRODUCTION: Export cash flow prediction to Excel with charts
     */
    async exportCashFlowExcel(tenantId: string, days: number = 30): Promise<Buffer> {
        try {
            const prediction = await this.predictiveService.predictCashFlow(tenantId, days);
            const workbook = new ExcelJS.Workbook();

            workbook.creator = 'Business Intelligence Copilot';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Cash Flow Prediction');

            // Define columns
            worksheet.columns = [
                { key: 'date', header: 'Date', width: 15 },
                { key: 'amount', header: 'Predicted Amount', width: 18 },
                { key: 'confidence', header: 'Confidence', width: 15 },
                { key: 'expectedIn', header: 'Expected In', width: 18 },
                { key: 'expectedOut', header: 'Expected Out', width: 18 },
            ];

            // Style header
            worksheet.getRow(1).font = { bold: true, size: 12 };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' }
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Add data
            prediction.predictions.forEach(p => {
                const row = worksheet.addRow({
                    date: p.date,
                    amount: p.amount,
                    confidence: p.confidence,
                    expectedIn: p.breakdown.expected_in,
                    expectedOut: p.breakdown.expected_out,
                });

                // Color code negative amounts
                const amountCell = row.getCell('amount');
                if (p.amount < 0) {
                    amountCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else {
                    amountCell.font = { color: { argb: 'FF10B981' }, bold: true };
                }
            });

            // Add summary
            const summary = this.calculateCashFlowSummary(prediction.predictions);
            worksheet.addRow([]);
            const summaryRow = worksheet.addRow(['Summary', '', '', '', '']);
            summaryRow.font = { bold: true, size: 12 };

            worksheet.addRow([`Average: ₹${summary.average.toFixed(2)}`]);
            worksheet.addRow([`Lowest: ₹${summary.lowest.toFixed(2)}`]);
            worksheet.addRow([`Highest: ₹${summary.highest.toFixed(2)}`]);
            worksheet.addRow([`Trend: ${summary.trend}`]);

            this.logger.log(`Exported ${prediction.predictions.length} days cash flow to Excel`);
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            this.logger.error(`Cash flow Excel export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export data as JSON
     */
    async exportJSON(tenantId: string, dataType: string): Promise<any> {
        try {
            switch (dataType) {
                case 'insights':
                    return await this.insightService.generateInsights(tenantId);

                case 'cash-flow':
                    return await this.predictiveService.predictCashFlow(tenantId, 30);

                case 'briefing':
                    return await this.insightService.getMorningBriefing(tenantId);

                default:
                    throw new Error(`Unknown data type: ${dataType}`);
            }
        } catch (error) {
            this.logger.error(`JSON export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create downloadable file buffer
     */
    createDownloadBuffer(content: string, type: 'csv' | 'txt' | 'md'): Buffer {
        return Buffer.from(content, 'utf-8');
    }


    /**
     * Calculate summary statistics for cash flow data
     */
    private calculateCashFlowSummary(predictions: Array<{ amount: number; date: string }>) {
        const amounts = predictions.map(p => p.amount);
        const average = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const lowest = Math.min(...amounts);
        const highest = Math.max(...amounts);

        // Calculate trend (comparing first half vs second half)
        const midpoint = Math.floor(amounts.length / 2);
        const firstHalfAvg = amounts.slice(0, midpoint).reduce((sum, a) => sum + a, 0) / midpoint;
        const secondHalfAvg = amounts.slice(midpoint).reduce((sum, a) => sum + a, 0) / (amounts.length - midpoint);
        const trend = secondHalfAvg > firstHalfAvg ? 'Improving' : 'Declining';

        return { average, lowest, highest, trend };
    }

    /**
     * Get file extension for export type
     */

    getFileExtension(type: string): string {
        const extensions = {
            csv: '.csv',
            pdf: '.pdf',
            txt: '.txt',
            json: '.json',
            markdown: '.md',
        };
        return extensions[type] || '.txt';
    }
}
