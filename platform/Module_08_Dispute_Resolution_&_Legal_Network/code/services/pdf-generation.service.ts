import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PDFGenerationService {
    /**
     * Convert text content to PDF
     */
    async generatePDF(data: {
        content: string;
        filePath: string;
        metadata?: {
            title?: string;
            author?: string;
            subject?: string;
        };
        options?: {
            includeHeader?: boolean;
            includeFooter?: boolean;
            watermark?: string;
        };
    }): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // Ensure directory exists
                const dir = path.dirname(data.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Create PDF document
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 72,
                        bottom: 72,
                        left: 72,
                        right: 72,
                    },
                    info: {
                        Title: data.metadata?.title || 'Legal Document',
                        Author: data.metadata?.author || 'SME Platform',
                        Subject: data.metadata?.subject || 'Generated Document',
                    },
                });

                // Pipe to file
                const stream = fs.createWriteStream(data.filePath);
                doc.pipe(stream);

                // Add header if requested
                if (data.options?.includeHeader) {
                    this.addHeader(doc);
                }

                // Add watermark if requested
                if (data.options?.watermark) {
                    this._addWatermarkInternal(doc, data.options.watermark);
                }

                // Add content
                this.addContent(doc, data.content);

                // Add footer if requested
                if (data.options?.includeFooter) {
                    this.addFooter(doc);
                }

                // Finalize PDF
                doc.end();

                stream.on('finish', () => {
                    resolve(data.filePath);
                });

                stream.on('error', (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Adapter: generatePdf (HTML/string) to PDF
    async generatePdf(html: string, options?: { format?: string; includeHeader?: boolean; includeFooter?: boolean; watermark?: string }): Promise<string> {
        const filePath = `documents/tmp_${Date.now()}.pdf`;
        return this.generatePDF({
            content: html,
            filePath,
            options: {
                includeHeader: options?.includeHeader,
                includeFooter: options?.includeFooter,
                watermark: options?.watermark
            }
        });
    }

    // Adapter: generateFromTemplate
    async generateFromTemplate(template: { content: string }, data: Record<string, any>): Promise<string> {
        const Handlebars = (await import('handlebars')).default;
        const compiled = Handlebars.compile(template.content);
        const content = compiled(data);
        return this.generatePdf(content, { includeHeader: true, includeFooter: true });
    }

    // Adapter: public addWatermark
    async addWatermark(filePath: string, watermark: string): Promise<string> {
        // In this simplified adapter, regenerate content with watermark text only
        const newPath = `documents/wm_${Date.now()}.pdf`;
        await this.generatePDF({
            content: `Watermarked: ${path.basename(filePath)}`,
            filePath: newPath,
            options: { watermark, includeHeader: false, includeFooter: false }
        });
        return newPath;
    }

    // Adapter: mergePdfs (stub)
    async mergePdfs(pdfs: string[]): Promise<string> {
        const mergedPath = `documents/merged_${Date.now()}.pdf`;
        await this.generatePDF({
            content: `Merged PDFs:\n${pdfs.map(p => path.basename(p)).join('\n')}`,
            filePath: mergedPath
        });
        return mergedPath;
    }

    // Adapter: addDigitalSignature (stub)
    async addDigitalSignature(pdfPath: string, signatureData: { signer: string; reason?: string }): Promise<string> {
        const signedPath = `documents/signed_${Date.now()}.pdf`;
        await this.generatePDF({
            content: `Signed by ${signatureData.signer}\nReason: ${signatureData.reason || 'N/A'}\nOriginal: ${path.basename(pdfPath)}`,
            filePath: signedPath
        });
        return signedPath;
    }

    /**
     * Add professional header
     */
    private addHeader(doc: typeof PDFDocument): void {
        doc
            .fontSize(10)
            .fillColor('#666666')
            .text('SME Receivables Management Platform', 72, 30, {
                align: 'center',
            })
            .moveTo(72, 50)
            .lineTo(doc.page.width - 72, 50)
            .stroke('#CCCCCC');

        doc.moveDown(2);
    }

    /**
     * Add footer with page numbers
     */
    private addFooter(doc: typeof PDFDocument): void {
        const pageCount = doc.bufferedPageRange().count;

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);

            doc
                .fontSize(9)
                .fillColor('#999999')
                .text(
                    `Page ${i + 1} of ${pageCount}`,
                    72,
                    doc.page.height - 50,
                    {
                        align: 'center',
                    },
                )
                .text(
                    `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
                    72,
                    doc.page.height - 35,
                    {
                        align: 'center',
                    },
                );
        }
    }

    /**
     * Add watermark
     */
    private _addWatermarkInternal(doc: typeof PDFDocument, watermark: string): void {
        doc
            .save()
            .opacity(0.1)
            .fontSize(60)
            .fillColor('#000000')
            .text(watermark, 0, doc.page.height / 2, {
                align: 'center',
                angle: 45,
            })
            .restore();
    }

    /**
     * Add main content with formatting
     */
    private addContent(doc: typeof PDFDocument, content: string): void {
        const lines = content.split('\n');

        for (const line of lines) {
            if (!line.trim()) {
                doc.moveDown(0.5);
                continue;
            }

            // Check for headers (lines ending with ':' or in ALL CAPS)
            if (line.trim().endsWith(':') || line === line.toUpperCase()) {
                doc
                    .fontSize(12)
                    .fillColor('#000000')
                    .font('Helvetica-Bold')
                    .text(line, {
                        align: 'left',
                    })
                    .moveDown(0.5);
            } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                // Bullet points
                doc
                    .fontSize(11)
                    .fillColor('#333333')
                    .font('Helvetica')
                    .text(line, {
                        indent: 20,
                    })
                    .moveDown(0.3);
            } else {
                // Normal text
                doc
                    .fontSize(11)
                    .fillColor('#000000')
                    .font('Helvetica')
                    .text(line, {
                        align: 'left',
                        lineGap: 2,
                    })
                    .moveDown(0.3);
            }
        }
    }

    /**
     * Get file stats (async)
     */
    async getFileStats(filePath: string): Promise<{
        size: number;
        created: Date;
    }> {
        const { promises: fsPromises } = await import('fs');
        const stats = await fsPromises.stat(filePath);
        return {
            size: stats.size,
            created: stats.birthtime,
        };
    }
}

// Adapter class for tests expecting PdfGenerationService
export class PdfGenerationService extends PDFGenerationService { }
