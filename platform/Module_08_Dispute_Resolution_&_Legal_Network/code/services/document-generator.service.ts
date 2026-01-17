import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import { DocumentTemplate } from '../entities/document-template.entity';
import { GeneratedDocument, GeneratedDocumentStatus } from '../entities/generated-document.entity';
import { DocumentTemplateService } from './document-template.service';
import { DigitalSignatureService, SignatureStatus } from './digital-signature.service';

@Injectable()
export class DocumentGeneratorService {
    constructor(
        @InjectRepository(GeneratedDocument)
        private generatedDocRepository: Repository<GeneratedDocument>,
        private templateService: DocumentTemplateService,
        private digitalSignatureService: DigitalSignatureService,
    ) {
        this.registerHandlebarsHelpers();
    }

    /**
     * Generate document from template
     */
    async generateDocument(data: {
        templateId: string;
        disputeCaseId: string;
        variables: Record<string, any>;
        language?: string;
        generatedBy: string;
    }): Promise<{
        documentId: string;
        content: string;
        filePath: string;
    }> {
        // Get template
        const template = await this.templateService.findById(data.templateId);
        if (!template) {
            throw new Error(`Template ${data.templateId} not found`);
        }

        // Validate variables
        this.validateVariables(template, data.variables);

        // Compile template
        const compiledTemplate = Handlebars.compile(template.content);

        // Add helper data
        const enhancedVariables = {
            ...data.variables,
            currentDate: this.formatDate(new Date()),
            currentYear: new Date().getFullYear(),
        };

        // Generate content
        const content = compiledTemplate(enhancedVariables);

        // Create file path
        const filePath = this.generateFilePath(
            data.disputeCaseId,
            template.templateType,
            template.language,
        );

        // Save generated document record
        const generatedDoc = this.generatedDocRepository.create({
            disputeCaseId: data.disputeCaseId,
            templateId: data.templateId,
            documentType: template.templateType,
            language: data.language || template.language,
            filePath,
            fileSize: Buffer.byteLength(content, 'utf8'),
            status: GeneratedDocumentStatus.DRAFT, // Default to DRAFT awaiting signature/approval
            variables: data.variables,
            generatedBy: data.generatedBy,
        });

        const saved = await this.generatedDocRepository.save(generatedDoc);

        return {
            documentId: saved.id,
            content,
            filePath,
        };
    }

    /**
     * Initiate digital signing process
     */
    async signDocument(documentId: string, signer: { name: string; email: string; reason: string }): Promise<{ requestId: string; signingUrl: string; status: string }> {
        const doc = await this.findById(documentId);
        if (!doc) {
            throw new Error(`Document ${documentId} not found`);
        }

        const signRequest = await this.digitalSignatureService.initiateSigningRequest({
            documentId: doc.id,
            signerName: signer.name,
            signerEmail: signer.email,
            reason: signer.reason
        });

        // Update document metadata
        await this.generatedDocRepository.save(doc);

        return {
            requestId: signRequest.requestId,
            signingUrl: signRequest.signingUrl,
            status: signRequest.status
        };
    }

    // Adapters for tests expecting specific generators
    async generateLegalNotice(caseData: any): Promise<{ documentId: string; content: string; filePath: string }> {
        return this.generateDocument(caseData);
    }
    async generateDemandLetter(demandData: any): Promise<{ documentId: string; content: string; filePath: string }> {
        return this.generateDocument(demandData);
    }
    async generateSettlementAgreement(settlementData: any): Promise<{ documentId: string; content: string; filePath: string }> {
        return this.generateDocument(settlementData);
    }
    async generatePaymentReceipt(paymentData: any): Promise<{ documentId: string; content: string; filePath: string }> {
        return this.generateDocument(paymentData);
    }
    async batchGenerate(documents: any[]): Promise<Array<{ documentId: string; content: string; filePath: string }>> {
        const results: Array<{ documentId: string; content: string; filePath: string }> = [];
        for (const doc of documents) {
            results.push(await this.generateDocument(doc));
        }
        return results;
    }

    /**
     * Get generated document
     */
    async findById(id: string): Promise<GeneratedDocument> {
        return this.generatedDocRepository.findOne({
            where: { id },
            relations: ['template', 'disputeCase'],
        });
    }

    /**
     * List documents for a case
     */
    async findByCaseId(disputeCaseId: string): Promise<GeneratedDocument[]> {
        return this.generatedDocRepository.find({
            where: { disputeCaseId },
            relations: ['template'],
            order: { generatedAt: 'DESC' },
        });
    }

    /**
     * Regenerate document with updated variables
     */
    async regenerateDocument(
        documentId: string,
        newVariables: Record<string, any>,
        userId: string,
    ): Promise<{
        documentId: string;
        content: string;
        filePath: string;
    }> {
        const doc = await this.findById(documentId);
        if (!doc) {
            throw new Error(`Document ${documentId} not found`);
        }

        return this.generateDocument({
            templateId: doc.templateId,
            disputeCaseId: doc.disputeCaseId,
            variables: { ...doc.variables, ...newVariables },
            language: doc.language,
            generatedBy: userId,
        });
    }

    /**
     * Validate required variables
     */
    private validateVariables(
        template: DocumentTemplate,
        variables: Record<string, any>,
    ): void {
        const requiredVars = template.variables.filter(v => v.required);

        const missing = requiredVars.filter(v => !variables[v.name]);
        if (missing.length > 0) {
            throw new Error(
                `Missing required variables: ${missing.map(v => v.name).join(', ')}`,
            );
        }
    }

    /**
     * Generate file path for document
     */
    private generateFilePath(
        caseId: string,
        documentType: string,
        language: string,
    ): string {
        const timestamp = Date.now();
        return `documents/${caseId}/${documentType}_${language}_${timestamp}.pdf`;
    }

    /**
     * Format date helper
     */
    private formatDate(date: Date): string {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    /**
     * Register Handlebars helpers
     */
    private registerHandlebarsHelpers(): void {
        // Currency formatter
        Handlebars.registerHelper('currency', (amount: number) => {
            return `₹${amount.toLocaleString('en-IN')}`;
        });

        // Date formatter
        Handlebars.registerHelper('formatDate', (date: string | Date) => {
            if (!date) return '';
            const d = typeof date === 'string' ? new Date(date) : date;
            return this.formatDate(d);
        });

        // Uppercase helper
        Handlebars.registerHelper('uppercase', (str: string) => {
            return str?.toUpperCase() || '';
        });

        // Conditional helper
        Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
            return arg1 === arg2 ? options.fn(this) : options.inverse(this);
        });
    }
}
