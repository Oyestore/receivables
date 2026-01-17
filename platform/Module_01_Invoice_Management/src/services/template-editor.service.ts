import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceTemplate } from '../invoice-template.entity';

export interface LayoutSchema {
    sections: any[];
    styles: any;
    pageSettings: any;
}

@Injectable()
export class TemplateEditorService {
    private readonly logger = new Logger(TemplateEditorService.name);

    constructor(
        @InjectRepository(InvoiceTemplate)
        private readonly templateRepo: Repository<InvoiceTemplate>
    ) { }

    /**
     * Create or Update a template layout
     */
    async saveTemplate(
        tenantId: string,
        orgId: string,
        name: string,
        layout: LayoutSchema,
        templateId?: string
    ): Promise<InvoiceTemplate> {
        let template: InvoiceTemplate;

        if (templateId) {
            template = await this.templateRepo.findOne({ where: { id: templateId, tenant_id: tenantId } });
            if (!template) throw new NotFoundException('Template not found');
        } else {
            template = this.templateRepo.create({
                tenant_id: tenantId,
                organization_id: orgId,
                is_system_template: false
            });
        }

        template.template_name = name;
        template.template_definition = layout;

        return this.templateRepo.save(template);
    }

    /**
     * Duplicate a system template for customization
     */
    async duplicateTemplate(templateId: string, targetOrgId: string): Promise<InvoiceTemplate> {
        const source = await this.templateRepo.findOne({ where: { id: templateId } });
        if (!source) throw new NotFoundException('Source template not found');

        const clone = this.templateRepo.create({
            ...source,
            id: undefined,
            organization_id: targetOrgId,
            template_name: `${source.template_name} (Copy)`,
            is_system_template: false,
            created_at: undefined,
            updated_at: undefined
        });

        return this.templateRepo.save(clone);
    }

    /**
     * Get visual schema for frontend editor
     */
    async getEditorSchema(templateId: string): Promise<LayoutSchema> {
        const template = await this.templateRepo.findOne({ where: { id: templateId } });
        if (!template) throw new NotFoundException('Template not found');
        return template.template_definition;
    }
}
