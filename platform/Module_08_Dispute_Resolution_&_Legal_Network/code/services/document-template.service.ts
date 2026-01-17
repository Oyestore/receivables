import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTemplate, DocumentTemplateType, TemplateLanguage } from '../entities/document-template.entity';

@Injectable()
export class DocumentTemplateService {
    constructor(
        @InjectRepository(DocumentTemplate)
        private templateRepository: Repository<DocumentTemplate>,
    ) { }

    async create(data: {
        templateCode: string;
        templateName: string;
        templateType: DocumentTemplateType;
        language: TemplateLanguage;
        content: string;
        variables: any[];
        createdBy: string;
    }): Promise<DocumentTemplate> {
        const template = this.templateRepository.create(data);
        return this.templateRepository.save(template);
    }

    // Adapter: createTemplate (for tests)
    async createTemplate(data: Parameters<DocumentTemplateService['create']>[0]): Promise<DocumentTemplate> {
        return this.create(data);
    }

    async findById(id: string): Promise<DocumentTemplate> {
        return this.templateRepository.findOne({ where: { id } });
    }

    async findByCode(templateCode: string): Promise<DocumentTemplate> {
        return this.templateRepository.findOne({ where: { templateCode } });
    }

    // Adapter: getTemplate (for tests)
    async getTemplate(templateCode: string): Promise<DocumentTemplate> {
        return this.findByCode(templateCode);
    }

    async findAll(filters?: {
        templateType?: DocumentTemplateType;
        language?: TemplateLanguage;
    }): Promise<DocumentTemplate[]> {
        const query = this.templateRepository
            .createQueryBuilder('template')
            .where('template.isActive = :isActive', { isActive: true });

        if (filters?.templateType) {
            query.andWhere('template.templateType = :templateType', {
                templateType: filters.templateType,
            });
        }

        if (filters?.language) {
            query.andWhere('template.language = :language', {
                language: filters.language,
            });
        }

        return query.getMany();
    }

    // Adapter: listTemplates (for tests)
    async listTemplates(filters?: { templateType?: DocumentTemplateType; language?: TemplateLanguage }): Promise<DocumentTemplate[]> {
        return this.findAll(filters);
    }

    async update(
        id: string,
        updates: {
            templateName?: string;
            content?: string;
            variables?: any[];
            isActive?: boolean;
            updatedBy: string;
        },
    ): Promise<DocumentTemplate> {
        await this.templateRepository.update(id, updates);
        return this.findById(id);
    }

    // Adapter: updateTemplate (for tests)
    async updateTemplate(id: string, updates: Parameters<DocumentTemplateService['update']>[1]): Promise<DocumentTemplate> {
        return this.update(id, updates);
    }

    // Adapter: renderTemplate (basic render using Handlebars)
    async renderTemplate(template: { content: string } | string, data: Record<string, any>): Promise<string> {
        const Handlebars = (await import('handlebars')).default;
        const content = typeof template === 'string' ? template : template.content;
        const compiled = Handlebars.compile(content);
        return compiled(data);
    }

    // Adapter: validateTemplate (basic validation)
    async validateTemplate(template: { content: string; variables?: Array<{ name: string; required?: boolean }> } | string): Promise<{ valid: boolean; errors: string[]; isValid: boolean; missing: string[] }> {
        const tpl = typeof template === 'string' ? { content: template, variables: [] } : template;
        const required = (tpl.variables || []).filter(v => v.required).map(v => v.name);
        const missing = required.filter(name => !tpl.content.includes(`{{${name}}}`));
        const valid = missing.length === 0;
        const errors = valid ? [] : missing.map(m => `Missing variable: ${m}`);
        return { valid, errors, isValid: valid, missing };
    }

    async deactivate(id: string, userId: string): Promise<void> {
        await this.templateRepository.update(id, {
            isActive: false,
            updatedBy: userId,
        });
    }
}
