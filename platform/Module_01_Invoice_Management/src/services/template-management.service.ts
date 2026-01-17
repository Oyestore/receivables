import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceTemplate } from '../entities/invoice-template.entity';
import { InvoiceTemplateMaster } from '../entities/invoice-template-master.entity';
import { InvoiceTemplateVersion } from '../entities/invoice-template-version.entity';
import { Invoice } from '../entities/invoice.entity';

export interface CreateTemplateDto {
    name: string;
    description?: string;
    template_data: any;
    category?: string;
    is_public?: boolean;
    tenant_id: string;
}

export interface UpdateTemplateDto {
    name?: string;
    description?: string;
    template_data?: any;
    category?: string;
    is_public?: boolean;
}

@Injectable()
export class TemplateManagementService {
    constructor(
        @InjectRepository(InvoiceTemplate)
        private templateRepo: Repository<InvoiceTemplate>,
        @InjectRepository(InvoiceTemplateMaster)
        private masterRepo: Repository<InvoiceTemplateMaster>,
        @InjectRepository(InvoiceTemplateVersion)
        private versionRepo: Repository<InvoiceTemplateVersion>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // CREATE operations
    async createTemplate(data: CreateTemplateDto): Promise<InvoiceTemplate> {
        // Validate template data structure
        this.validateTemplateData(data.template_data);

        // Create master record
        const master = this.masterRepo.create({
            name: data.name,
            description: data.description,
            category: data.category || 'custom',
            tenant_id: data.tenant_id,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });
        const savedMaster = await this.masterRepo.save(master);

        // Create template with version 1.0
        const template = this.templateRepo.create({
            master_id: savedMaster.id,
            version: '1.0',
            template_data: data.template_data,
            is_current: true,
            tenant_id: data.tenant_id,
            created_at: new Date(),
        });
        const savedTemplate = await this.templateRepo.save(template);

        // Create version record
        const version = this.versionRepo.create({
            template_id: savedTemplate.id,
            version_number: '1.0',
            changes: 'Initial version',
            created_by: data.tenant_id, // Should be user_id in production
            created_at: new Date(),
        });
        await this.versionRepo.save(version);

        return savedTemplate;
    }

    async createTemplateFromInvoice(invoiceId: string, name: string, tenantId: string): Promise<InvoiceTemplate> {
        // Load invoice with line items
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
            relations: ['line_items'],
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        // Convert invoice to template format
        const templateData = {
            header: {
                show_logo: true,
                show_company_details: true,
                show_invoice_number: true,
                show_dates: true,
            },
            items: {
                show_description: true,
                show_quantity: true,
                show_unit_price: true,
                show_tax: true,
                columns: ['description', 'quantity', 'unit_price', 'tax', 'total'],
            },
            footer: {
                show_terms: true,
                show_notes: true,
                show_payment_info: true,
            },
            styling: {
                primary_color: '#2563eb',
                font_family: 'Inter',
                layout: 'modern',
            },
            default_values: {
                payment_terms: invoice.payment_terms || 'Net 30',
                currency: invoice.currency || 'INR',
                tax_rate: invoice.total_tax_amount / invoice.sub_total * 100,
            },
        };

        return this.createTemplate({
            name,
            description: `Created from invoice ${invoice.number}`,
            template_data: templateData,
            category: 'custom',
            tenant_id: tenantId,
        });
    }

    // READ operations
    async findAllTemplates(tenantId: string, includePublic = true): Promise<InvoiceTemplate[]> {
        const queryBuilder = this.templateRepo
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.master', 'master')
            .where('template.tenant_id = :tenantId', { tenantId })
            .andWhere('template.is_current = :isCurrent', { isCurrent: true })
            .andWhere('master.is_active = :isActive', { isActive: true });

        if (includePublic) {
            queryBuilder.orWhere('master.is_public = :isPublic', { isPublic: true });
        }

        return queryBuilder
            .orderBy('master.usage_count', 'DESC')
            .addOrderBy('template.created_at', 'DESC')
            .getMany();
    }

    async findTemplateById(id: string, tenantId: string): Promise<InvoiceTemplate> {
        const template = await this.templateRepo.findOne({
            where: { id, tenant_id: tenantId },
            relations: ['master'],
        });

        if (!template) {
            throw new NotFoundException(`Template ${id} not found`);
        }

        return template;
    }

    async getTemplatePreview(id: string, tenantId: string): Promise<any> {
        const template = await this.findTemplateById(id, tenantId);

        // Generate sample data for preview
        const sampleData = {
            invoice_number: 'INV-PREVIEW-001',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            client: {
                name: 'Sample Customer',
                email: 'customer@example.com',
                address: '123 Business St, City, State 12345',
            },
            items: [
                { description: 'Product/Service 1', quantity: 2, unit_price: 1000, tax: 180, total: 2180 },
                { description: 'Product/Service 2', quantity: 1, unit_price: 1500, tax: 270, total: 1770 },
            ],
            sub_total: 3500,
            tax_total: 450,
            grand_total: 3950,
        };

        return {
            template_id: template.id,
            template_name: template.master.name,
            preview_data: sampleData,
            rendered_html: this.renderTemplate(template.template_data, sampleData),
        };
    }

    // UPDATE operations
    async updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<InvoiceTemplate> {
        const existingTemplate = await this.findTemplateById(id, tenantId);

        // Check if changes warrant new version
        const hasSignificantChanges = data.template_data &&
            JSON.stringify(data.template_data) !== JSON.stringify(existingTemplate.template_data);

        if (hasSignificantChanges) {
            // Create new version
            const currentVersion = parseFloat(existingTemplate.version);
            const newVersion = (currentVersion + 0.1).toFixed(1);

            // Mark current as not current
            existingTemplate.is_current = false;
            await this.templateRepo.save(existingTemplate);

            // Create new template version
            const newTemplate = this.templateRepo.create({
                master_id: existingTemplate.master_id,
                version: newVersion,
                template_data: data.template_data,
                is_current: true,
                tenant_id: tenantId,
                created_at: new Date(),
            });
            const savedTemplate = await this.templateRepo.save(newTemplate);

            // Create version record
            await this.versionRepo.save({
                template_id: savedTemplate.id,
                version_number: newVersion,
                changes: 'Template updated',
                created_by: tenantId,
                created_at: new Date(),
            });

            return savedTemplate;
        } else {
            // Update master details only
            if (data.name || data.description || data.category) {
                await this.masterRepo.update(existingTemplate.master_id, {
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    updated_at: new Date(),
                });
            }

            return this.findTemplateById(id, tenantId);
        }
    }

    async cloneTemplate(id: string, newName: string, tenantId: string): Promise<InvoiceTemplate> {
        const sourceTemplate = await this.findTemplateById(id, tenantId);

        return this.createTemplate({
            name: newName || `${sourceTemplate.master.name} (Copy)`,
            description: `Cloned from ${sourceTemplate.master.name}`,
            template_data: sourceTemplate.template_data,
            category: sourceTemplate.master.category,
            tenant_id: tenantId,
        });
    }

    // DELETE operations
    async deleteTemplate(id: string, tenantId: string): Promise<void> {
        const template = await this.findTemplateById(id, tenantId);

        // Check if template is in use
        const usageCount = await this.invoiceRepo.count({
            where: { template_id: id },
        });

        if (usageCount > 0) {
            throw new BadRequestException(
                `Cannot delete template ${id}: used by ${usageCount} invoice(s). Archive instead.`
            );
        }

        // Soft delete by marking master as inactive
        await this.masterRepo.update(template.master_id, {
            is_active: false,
            updated_at: new Date(),
        });
    }

    // VERSION MANAGEMENT
    async getVersionHistory(templateId: string, tenantId: string): Promise<InvoiceTemplateVersion[]> {
        const template = await this.findTemplateById(templateId, tenantId);

        return this.versionRepo.find({
            where: { template_id: template.id },
            order: { created_at: 'DESC' },
        });
    }

    async rollbackToVersion(templateId: string, versionNumber: string, tenantId: string): Promise<InvoiceTemplate> {
        // Find the version
        const versions = await this.getVersionHistory(templateId, tenantId);
        const targetVersion = versions.find(v => v.version_number === versionNumber);

        if (!targetVersion) {
            throw new NotFoundException(`Version ${versionNumber} not found`);
        }

        // Load the template for that version
        const oldTemplate = await this.templateRepo.findOne({
            where: { id: targetVersion.template_id },
        });

        if (!oldTemplate) {
            throw new NotFoundException('Template version data not found');
        }

        // Create new version with old data
        const currentTemplate = await this.findTemplateById(templateId, tenantId);
        return this.updateTemplate(templateId, {
            template_data: oldTemplate.template_data,
        }, tenantId);
    }

    // UTILITY METHODS
    private validateTemplateData(data: any): void {
        if (!data || typeof data !== 'object') {
            throw new BadRequestException('Invalid template data structure');
        }

        // Basic structure validation
        const requiredSections = ['header', 'items', 'footer'];
        for (const section of requiredSections) {
            if (!(section in data)) {
                throw new BadRequestException(`Template must include ${section} section`);
            }
        }
    }

    private renderTemplate(templateData: any, invoiceData: any): string {
        // Basic HTML rendering - in production, use a proper template engine
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: ${templateData.styling?.font_family || 'Arial'}; }
          .invoice { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { margin-bottom: 30px; }
          .items table { width: 100%; border-collapse: collapse; }
          .items th, .items td { padding: 10px; border-bottom: 1px solid #ddd; }
          .totals { margin-top: 20px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>Invoice #${invoiceData.invoice_number}</h1>
            <p>Date: ${invoiceData.issue_date}</p>
            <p>Due Date: ${invoiceData.due_date}</p>
          </div>
          <div class="items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit_price}</td>
                    <td>${item.tax}</td>
                    <td>${item.total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="totals">
            <p>Subtotal: ${invoiceData.sub_total}</p>
            <p>Tax: ${invoiceData.tax_total}</p>
            <p><strong>Total: ${invoiceData.grand_total}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    async exportTemplate(id: string, format: 'json' | 'html', tenantId: string): Promise<string> {
        const template = await this.findTemplateById(id, tenantId);

        if (format === 'json') {
            return JSON.stringify({
                name: template.master.name,
                description: template.master.description,
                version: template.version,
                template_data: template.template_data,
                exported_at: new Date().toISOString(),
            }, null, 2);
        } else {
            // Export as HTML template
            return this.renderTemplate(template.template_data, {
                invoice_number: '{{invoice_number}}',
                issue_date: '{{issue_date}}',
                due_date: '{{due_date}}',
                items: [],
                sub_total: '{{sub_total}}',
                tax_total: '{{tax_total}}',
                grand_total: '{{grand_total}}',
            });
        }
    }

    async importTemplate(data: any, tenantId: string): Promise<InvoiceTemplate> {
        // Validate imported data structure
        if (!data.name || !data.template_data) {
            throw new BadRequestException('Invalid import data: missing required fields');
        }

        return this.createTemplate({
            name: data.name,
            description: data.description || 'Imported template',
            template_data: data.template_data,
            category: 'imported',
            tenant_id: tenantId,
        });
    }
}
