import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as Papa from 'papaparse';

@Injectable()
export class MultiFormatService {
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // EXPORT METHODS

    async exportInvoices(
        invoiceIds: string[],
        format: 'pdf' | 'excel' | 'csv' | 'json' | 'xml',
        tenantId: string,
    ): Promise<Buffer | string> {
        const invoices = await this.invoiceRepo.findByIds(invoiceIds, {
            where: { tenant_id: tenantId },
            relations: ['line_items'],
        });

        switch (format) {
            case 'pdf':
                return this.exportToPDF(invoices);
            case 'excel':
                return this.exportToExcel(invoices);
            case 'csv':
                return this.exportToCSV(invoices);
            case 'json':
                return this.exportToJSON(invoices);
            case 'xml':
                return this.exportToXML(invoices);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    async exportToPDF(invoices: Invoice[]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Title
            doc.fontSize(20).text('Invoice Export', { align: 'center' });
            doc.moveDown();

            // Each invoice
            invoices.forEach((invoice, index) => {
                if (index > 0) doc.addPage();

                doc.fontSize(16).text(`Invoice #${invoice.number}`);
                doc.fontSize(12);
                doc.text(`Date: ${invoice.issue_date?.toLocaleDateString()}`);
                doc.text(`Due: ${invoice.due_date?.toLocaleDateString()}`);
                doc.text(`Status: ${invoice.status}`);
                doc.text(`Amount: ${invoice.currency} ${invoice.grand_total}`);
                doc.moveDown();

                // Line items
                if (invoice.line_items?.length) {
                    doc.fontSize(14).text('Items:');
                    invoice.line_items.forEach((item) => {
                        doc.fontSize(10).text(
                            `- ${item.description}: ${item.quantity} × ${item.unit_price} = ${item.line_total}`,
                        );
                    });
                }
            });

            doc.end();
        });
    }

    async exportToExcel(invoices: Invoice[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Invoices');

        // Headers
        worksheet.columns = [
            { header: 'Number', key: 'number', width: 15 },
            { header: 'Client ID', key: 'client_id', width: 20 },
            { header: 'Issue Date', key: 'issue_date', width: 12 },
            { header: 'Due Date', key: 'due_date', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Subtotal', key: 'sub_total', width: 12 },
            { header: 'Tax', key: 'total_tax_amount', width: 12 },
            { header: 'Total', key: 'grand_total', width: 12 },
            { header: 'Paid', key: 'amount_paid', width: 12 },
            { header: 'Balance', key: 'balance_due', width: 12 },
        ];

        // Data
        invoices.forEach((inv) => {
            worksheet.addRow({
                number: inv.number,
                client_id: inv.client_id,
                issue_date: inv.issue_date,
                due_date: inv.due_date,
                status: inv.status,
                sub_total: inv.sub_total,
                total_tax_amount: inv.total_tax_amount,
                grand_total: inv.grand_total,
                amount_paid: inv.amount_paid,
                balance_due: inv.balance_due,
            });
        });

        // Style header
        worksheet.getRow(1).font = { bold: true };

        return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }

    async exportToCSV(invoices: Invoice[]): Promise<string> {
        const data = invoices.map((inv) => ({
            'Invoice Number': inv.number,
            'Client ID': inv.client_id,
            'Issue Date': inv.issue_date?.toISOString().split('T')[0],
            'Due Date': inv.due_date?.toISOString().split('T')[0],
            Status: inv.status,
            Subtotal: inv.sub_total,
            Tax: inv.total_tax_amount,
            Total: inv.grand_total,
            Paid: inv.amount_paid,
            Balance: inv.balance_due,
        }));

        return Papa.unparse(data);
    }

    async exportToJSON(invoices: Invoice[]): Promise<string> {
        return JSON.stringify(
            {
                exported_at: new Date().toISOString(),
                count: invoices.length,
                invoices: invoices.map((inv) => ({
                    number: inv.number,
                    client_id: inv.client_id,
                    issue_date: inv.issue_date,
                    due_date: inv.due_date,
                    status: inv.status,
                    currency: inv.currency,
                    sub_total: inv.sub_total,
                    tax: inv.total_tax_amount,
                    grand_total: inv.grand_total,
                    amount_paid: inv.amount_paid,
                    balance_due: inv.balance_due,
                    line_items: inv.line_items,
                })),
            },
            null,
            2,
        );
    }

    async exportToXML(invoices: Invoice[]): Promise<string> {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<invoices>\n';

        invoices.forEach((inv) => {
            xml += '  <invoice>\n';
            xml += `    <number>${inv.number}</number>\n`;
            xml += `    <client_id>${inv.client_id}</client_id>\n`;
            xml += `    <issue_date>${inv.issue_date?.toISOString()}</issue_date>\n`;
            xml += `    <due_date>${inv.due_date?.toISOString()}</due_date>\n`;
            xml += `    <status>${inv.status}</status>\n`;
            xml += `    <grand_total>${inv.grand_total}</grand_total>\n`;
            xml += '  </invoice>\n';
        });

        xml += '</invoices>';
        return xml;
    }

    // IMPORT METHODS

    async importFromCSV(
        csvData: string,
        tenantId: string,
    ): Promise<{ imported: number; failed: number; errors: any[] }> {
        const parsed = Papa.parse(csvData, { header: true });
        const results = { imported: 0, failed: 0, errors: [] };

        for (let i = 0; i < parsed.data.length; i++) {
            const row: any = parsed.data[i];

            try {
                const invoice = this.invoiceRepo.create({
                    tenant_id: tenantId,
                    number: row['Invoice Number'],
                    client_id: row['Client ID'],
                    issue_date: new Date(row['Issue Date']),
                    due_date: new Date(row['Due Date']),
                    status: row['Status'] || 'draft',
                    currency: row['Currency'] || 'INR',
                    sub_total: parseFloat(row['Subtotal']) || 0,
                    grand_total: parseFloat(row['Total']) || 0,
                });

                await this.invoiceRepo.save(invoice);
                results.imported++;
            } catch (error) {
                results.failed++;
                results.errors.push({ row: i + 1, error: error.message });
            }
        }

        return results;
    }

    async importFromJSON(
        jsonData: string,
        tenantId: string,
    ): Promise<{ imported: number; failed: number; errors: any[] }> {
        const data = JSON.parse(jsonData);
        const results = { imported: 0, failed: 0, errors: [] };

        const invoices = Array.isArray(data) ? data : data.invoices || [];

        for (let i = 0; i < invoices.length; i++) {
            try {
                const inv = invoices[i];
                const invoice = this.invoiceRepo.create({
                    ...inv,
                    tenant_id: tenantId,
                    id: undefined, // Generate new ID
                });

                await this.invoiceRepo.save(invoice);
                results.imported++;
            } catch (error) {
                results.failed++;
                results.errors.push({ index: i, error: error.message });
            }
        }

        return results;
    }
}
