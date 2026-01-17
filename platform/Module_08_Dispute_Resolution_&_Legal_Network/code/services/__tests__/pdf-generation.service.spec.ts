import { Test, TestingModule } from '@nestjs/testing';
import { PdfGenerationService } from '../pdf-generation.service';

describe('PdfGenerationService', () => {
    let service: PdfGenerationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PdfGenerationService],
        }).compile();

        service = module.get<PdfGenerationService>(PdfGenerationService);
    });

    describe('generatePdf', () => {
        it('should generate PDF from HTML content', async () => {
            const html = '<h1>Test Document</h1><p>Content</p>';
            const options = { format: 'A4', margin: { top: '1cm' } };

            const result = await service.generatePdf(html, options);

            expect(result).toBeInstanceOf(Buffer);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should support custom page formats', async () => {
            const html = '<p>Content</p>';

            const a4 = await service.generatePdf(html, { format: 'A4' });
            const letter = await service.generatePdf(html, { format: 'Letter' });

            expect(a4).toBeDefined();
            expect(letter).toBeDefined();
            expect(a4.length).not.toBe(letter.length);
        });

        it('should include headers and footers', async () => {
            const html = '<p>Main content</p>';
            const options = {
                header: '<div>Header Text</div>',
                footer: '<div>Page {{page}} of {{pages}}</div>',
            };

            const result = await service.generatePdf(html, options);

            expect(result).toBeDefined();
        });
    });

    describe('generateFromTemplate', () => {
        it('should generate PDF from template with data', async () => {
            const template = '<h1>{{title}}</h1><p>{{content}}</p>';
            const data = { title: 'Invoice', content: 'Invoice details' };

            const result = await service.generateFromTemplate(template, data);

            expect(result).toBeInstanceOf(Buffer);
        });
    });

    describe('addWatermark', () => {
        it('should add watermark to PDF', async () => {
            const originalPdf = Buffer.from('PDF content');
            const watermark = 'CONFIDENTIAL';

            const result = await service.addWatermark(originalPdf, watermark);

            expect(result).toBeInstanceOf(Buffer);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('mergePdfs', () => {
        it('should merge multiple PDFs into one', async () => {
            const pdfs = [
                Buffer.from('PDF 1'),
                Buffer.from('PDF 2'),
                Buffer.from('PDF 3'),
            ];

            const result = await service.mergePdfs(pdfs);

            expect(result).toBeInstanceOf(Buffer);
        });
    });

    describe('addDigitalSignature', () => {
        it('should add digital signature to PDF', async () => {
            const pdf = Buffer.from('PDF content');
            const signatureData = {
                signerName: 'John Doe',
                timestamp: new Date(),
                certificate: 'cert-data',
            };

            const result = await service.addDigitalSignature(pdf, signatureData);

            expect(result).toBeInstanceOf(Buffer);
        });
    });
});
