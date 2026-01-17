import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import { DeepSeekR1Service } from './deepseek-r1.service';

@Injectable()
export class InvoiceOCRService {
    private readonly logger = new Logger(InvoiceOCRService.name);

    constructor(private readonly deepSeekService: DeepSeekR1Service) { }

    /**
     * Process an invoice image buffer and return structured data
     */
    async processInvoiceImage(imageBuffer: Buffer): Promise<any> {
        this.logger.log('Starting OCR processing...');

        try {
            // 1. Text Extraction (OCR)
            const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
                logger: m => this.logger.debug(m)
            });

            this.logger.log('OCR Text Extraction Complete. Text length: ' + text.length);

            // 2. Structured Parsing (AI)
            const structuredData = await this.parseInvoiceText(text);
            return structuredData;

        } catch (error) {
            this.logger.error('OCR Processing Failed', error.stack);
            throw new Error('Failed to process invoice image: ' + error.message);
        }
    }

    /**
     * Use DeepSeek R1 to parse raw OCR text into JSON
     */
    private async parseInvoiceText(rawText: string): Promise<any> {
        const prompt = `
      Extract structured invoice data from the following raw OCR text.
      Return ONLY a VALID JSON object with the following fields:
      - invoice_number (string)
      - issue_date (YYYY-MM-DD)
      - due_date (YYYY-MM-DD)
      - total_amount (number)
      - currency (string)
      - vendor_name (string)
      - line_items (array of objects with description, quantity, unit_price, total)

      RAW TEXT:
      ${rawText}
      `;

        try {
            const response = await this.deepSeekService.generate({
                prompt: prompt,
                temperature: 0.1, // High precision
                systemPrompt: "You are a data extraction assistant. Output only JSON."
            });

            // Basic cleanup if AI adds markdown code blocks
            let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            this.logger.error('AI Parsing Failed', error);
            // Fallback or re-throw
            throw new Error('Failed to parse extracted text');
        }
    }
}
