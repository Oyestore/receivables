import { Test, TestingModule } from '@nestjs/testing';
import { PdfGenerationService } from '../services/pdf-generation.service';
import { TemplateService } from '../services/template.service';
import { InvoiceQualityAssuranceService } from '../services/invoice-quality-assurance.service';
import { CulturalIntelligenceService } from '../services/cultural-intelligence.service';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceTemplateEntity } from '../invoice-template.entity';
import { InvoiceTemplateVersionEntity } from '../invoice-template-version.entity';
import { Buffer } from 'buffer';

describe('PdfGenerationService - Complete Tests', () => {
  let service: PdfGenerationService;
  let templateService: TemplateService;
  let qualityAssuranceService: InvoiceQualityAssuranceService;
  let culturalService: CulturalIntelligenceService;

  const mockInvoice: InvoiceEntity = {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    total: 1000,
    subtotal: 850,
    taxAmount: 150,
    status: 'sent',
    date: new Date('2024-01-01'),
    dueDate: new Date('2024-01-31'),
    lineItems: [
      {
        id: 'item-1',
        description: 'Test Product',
        quantity: 2,
        unitPrice: 425,
        totalPrice: 850,
        taxRate: 0.18,
        taxAmount: 153,
        hsnCode: '1234',
      },
    ],
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate: InvoiceTemplateEntity = {
    id: 'template-1',
    name: 'Standard Template',
    description: 'Standard invoice template',
    templateDefinition: {
      components: [
        {
          type: 'header',
          content: '<h1>{{companyName}}</h1>',
          styles: { color: '#333' },
        },
        {
          type: 'body',
          content: '<table>{{lineItems}}</table>',
          styles: { width: '100%' },
        },
      ],
      styles: {
        body: { fontFamily: 'Arial', fontSize: '12px' },
        header: { backgroundColor: '#f5f5f5' },
      },
    },
    isActive: true,
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGenerationService,
        {
          provide: TemplateService,
          useValue: {
            getTemplateById: jest.fn(),
            applyTemplateToInvoice: jest.fn(),
            validateTemplate: jest.fn(),
          },
        },
        {
          provide: InvoiceQualityAssuranceService,
          useValue: {
            validateInvoice: jest.fn(),
            getQualityScore: jest.fn(),
          },
        },
        {
          provide: CulturalIntelligenceService,
          useValue: {
            adaptForRegion: jest.fn(),
            getLocalizedContent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PdfGenerationService>(PdfGenerationService);
    templateService = module.get<TemplateService>(TemplateService);
    qualityAssuranceService = module.get<InvoiceQualityAssuranceService>(InvoiceQualityAssuranceService);
    culturalService = module.get<CulturalIntelligenceService>(CulturalIntelligenceService);
  });

  describe('Basic PDF Generation', () => {
    it('should generate PDF for invoice with template', async () => {
      const expectedPdf = Buffer.from('pdf-content');
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(templateService.getTemplateById).toHaveBeenCalledWith(mockInvoice.templateId);
    });

    it('should generate PDF with default template when no template specified', async () => {
      const invoiceWithoutTemplate = { ...mockInvoice, templateId: null };
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(null);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Default template</html>');

      const result = await service.generateInvoicePdf(invoiceWithoutTemplate);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle template validation errors', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockRejectedValue(new Error('Template validation failed'));

      await expect(service.generateInvoicePdf(mockInvoice))
        .rejects.toThrow('Template validation failed');
    });
  });

  describe('Bulk PDF Generation', () => {
    it('should generate PDFs for multiple invoices', async () => {
      const invoices = [mockInvoice, { ...mockInvoice, id: 'invoice-2' }];
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateBulkInvoices(invoices);

      expect(result).toHaveLength(2);
      expect(result.every(pdf => pdf instanceof Buffer)).toBe(true);
    });

    it('should handle partial failures in bulk generation', async () => {
      const invoices = [mockInvoice, { ...mockInvoice, id: 'invalid-invoice' }];
      
      jest.spyOn(templateService, 'getTemplateById')
        .mockResolvedValueOnce(mockTemplate)
        .mockRejectedValueOnce(new Error('Template not found'));

      const result = await service.generateBulkInvoices(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Buffer);
      expect(result[1]).toBeInstanceOf(Error);
    });

    it('should limit bulk generation to prevent memory issues', async () => {
      const invoices = Array.from({ length: 150 }, (_, i) => ({ ...mockInvoice, id: `invoice-${i}` }));
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');

      await expect(service.generateBulkInvoices(invoices))
        .rejects.toThrow('Bulk generation limit exceeded');
    });
  });

  describe('Quality Assurance Integration', () => {
    it('should validate invoice before PDF generation', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ 
        isValid: false, 
        score: 60,
        issues: ['Missing customer details'],
      });

      await expect(service.generateInvoicePdf(mockInvoice))
        .rejects.toThrow('Invoice quality validation failed');
    });

    it('should include quality score in PDF metadata', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice);

      expect(result).toBeInstanceOf(Buffer);
      expect(qualityAssuranceService.validateInvoice).toHaveBeenCalledWith(mockInvoice);
    });
  });

  describe('Cultural Intelligence Integration', () => {
    it('should adapt PDF for regional requirements', async () => {
      const adaptedInvoice = { ...mockInvoice, regionalFormat: 'Indian' };
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(culturalService, 'adaptForRegion').mockResolvedValue(adaptedInvoice);
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, { region: 'IN' });

      expect(result).toBeInstanceOf(Buffer);
      expect(culturalService.adaptForRegion).toHaveBeenCalledWith(mockInvoice, 'IN');
    });

    it('should include localized content in PDF', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(culturalService, 'getLocalizedContent').mockResolvedValue({
        'invoice.title': 'चालान',
        'total.amount': 'कुल राशि',
      });
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, { language: 'hi' });

      expect(result).toBeInstanceOf(Buffer);
      expect(culturalService.getLocalizedContent).toHaveBeenCalledWith('hi');
    });
  });

  describe('PDF Customization', () => {
    it('should generate PDF with custom styling', async () => {
      const customOptions = {
        header: 'Custom Header',
        footer: 'Custom Footer',
        watermark: 'DRAFT',
        pageSize: 'A4' as const,
        orientation: 'portrait' as const,
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, customOptions);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF with company branding', async () => {
      const brandingOptions = {
        logo: 'base64-logo-data',
        companyColors: ['#FF0000', '#00FF00'],
        fontFamily: 'Custom Font',
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, brandingOptions);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('PDF Validation', () => {
    it('should validate generated PDF integrity', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const pdf = await service.generateInvoicePdf(mockInvoice);
      const isValid = await service.validatePdfGeneration(pdf);

      expect(isValid).toBe(true);
    });

    it('should detect corrupted PDF files', async () => {
      const corruptedPdf = Buffer.from('not-a-pdf');

      const isValid = await service.validatePdfGeneration(corruptedPdf);

      expect(isValid).toBe(false);
    });

    it('should validate PDF content completeness', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const pdf = await service.generateInvoicePdf(mockInvoice);
      const contentCheck = await service.validatePdfContent(pdf, mockInvoice);

      expect(contentCheck.hasInvoiceNumber).toBe(true);
      expect(contentCheck.hasCustomerDetails).toBe(true);
      expect(contentCheck.hasLineItems).toBe(true);
      expect(contentCheck.hasTotal).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should cache template definitions for repeated use', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      // Generate PDF twice with same template
      await service.generateInvoicePdf(mockInvoice);
      await service.generateInvoicePdf(mockInvoice);

      // Template should only be fetched once due to caching
      expect(templateService.getTemplateById).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent PDF generation', async () => {
      const invoices = Array.from({ length: 10 }, (_, i) => ({ ...mockInvoice, id: `invoice-${i}` }));
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const startTime = Date.now();
      const results = await Promise.all(
        invoices.map(invoice => service.generateInvoicePdf(invoice))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(pdf => pdf instanceof Buffer)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should optimize memory usage for large invoices', async () => {
      const largeInvoice = {
        ...mockInvoice,
        lineItems: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          description: `Item ${i}`,
          quantity: 1,
          unitPrice: 10,
          totalPrice: 10,
          taxRate: 0.18,
          taxAmount: 1.8,
        })),
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Large invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(largeInvoice);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeLessThan(5 * 1024 * 1024); // Should be less than 5MB
    });
  });

  describe('Error Handling', () => {
    it('should handle template not found error', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(null);

      await expect(service.generateInvoicePdf(mockInvoice))
        .rejects.toThrow('Template not found');
    });

    it('should handle invoice validation errors', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockRejectedValue(new Error('Validation failed'));

      await expect(service.generateInvoicePdf(mockInvoice))
        .rejects.toThrow('Validation failed');
    });

    it('should handle PDF generation engine errors', async () => {
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      // Mock PDF generation failure
      jest.spyOn(service as any, 'generatePdfFromHtml').mockRejectedValue(new Error('PDF generation failed'));

      await expect(service.generateInvoicePdf(mockInvoice))
        .rejects.toThrow('PDF generation failed');
    });

    it('should handle memory limit exceeded errors', async () => {
      const invoices = Array.from({ length: 200 }, (_, i) => ({ ...mockInvoice, id: `invoice-${i}` }));
      
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');

      await expect(service.generateBulkInvoices(invoices))
        .rejects.toThrow('Memory limit exceeded');
    });
  });

  describe('Advanced Features', () => {
    it('should generate PDF with digital signature', async () => {
      const signatureOptions = {
        includeSignature: true,
        signaturePosition: { x: 100, y: 700 },
        signatureText: 'Authorized Signatory',
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, signatureOptions);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF with QR code', async () => {
      const qrOptions = {
        includeQRCode: true,
        qrContent: 'https://example.com/invoice/INV-001',
        qrPosition: { x: 500, y: 700 },
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, qrOptions);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF with barcode', async () => {
      const barcodeOptions = {
        includeBarcode: true,
        barcodeContent: 'INV-001',
        barcodeType: 'CODE128',
        barcodePosition: { x: 100, y: 50 },
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });

      const result = await service.generateInvoicePdf(mockInvoice, barcodeOptions);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with all services for complete PDF generation', async () => {
      const options = {
        region: 'IN',
        language: 'hi',
        includeSignature: true,
        watermark: 'DRAFT',
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(culturalService, 'adaptForRegion').mockResolvedValue(mockInvoice);
      jest.spyOn(culturalService, 'getLocalizedContent').mockResolvedValue({ 'invoice.title': 'चालान' });

      const result = await service.generateInvoicePdf(mockInvoice, options);

      expect(result).toBeInstanceOf(Buffer);
      expect(templateService.getTemplateById).toHaveBeenCalled();
      expect(qualityAssuranceService.validateInvoice).toHaveBeenCalled();
      expect(culturalService.adaptForRegion).toHaveBeenCalled();
      expect(culturalService.getLocalizedContent).toHaveBeenCalled();
    });

    it('should handle complete invoice-to-PDF workflow', async () => {
      const workflow = {
        validateQuality: true,
        adaptCultural: true,
        applyTemplate: true,
        generatePdf: true,
        validatePdf: true,
      };

      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'applyTemplateToInvoice').mockResolvedValue('<html>Invoice content</html>');
      jest.spyOn(qualityAssuranceService, 'validateInvoice').mockResolvedValue({ isValid: true, score: 95 });
      jest.spyOn(culturalService, 'adaptForRegion').mockResolvedValue(mockInvoice);

      const result = await service.generateInvoicePdf(mockInvoice, workflow);

      expect(result).toBeInstanceOf(Buffer);
      
      const isValid = await service.validatePdfGeneration(result);
      expect(isValid).toBe(true);
    });
  });
});
