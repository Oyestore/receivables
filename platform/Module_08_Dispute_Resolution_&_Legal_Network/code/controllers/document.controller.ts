import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentTemplateService } from '../services/document-template.service';
import { DocumentGeneratorService } from '../services/document-generator.service';
import { PDFGenerationService } from '../services/pdf-generation.service';
import { DocumentTemplateType, TemplateLanguage } from '../entities/document-template.entity';

@ApiTags('Document Generation')
@Controller('api/v1/documents')
@ApiBearerAuth('JWT')
export class DocumentController {
    constructor(
        private templateService: DocumentTemplateService,
        private generatorService: DocumentGeneratorService,
        private pdfService: PDFGenerationService,
    ) { }

    @Post('templates')
    @ApiOperation({ summary: 'Create document template' })
    async createTemplate(
        @Body()
        createDto: {
            templateCode: string;
            templateName: string;
            templateType: DocumentTemplateType;
            language: TemplateLanguage;
            content: string;
            variables: any[];
            createdBy: string;
        },
    ) {
        const normalized = {
            templateCode: createDto.templateCode || `TMP-${Date.now()}`,
            templateName: createDto.templateName || 'Template',
            templateType: createDto.templateType || DocumentTemplateType.LEGAL_NOTICE,
            language: createDto.language || TemplateLanguage.ENGLISH,
            content: createDto.content,
            variables: createDto.variables || [],
            createdBy: createDto.createdBy || 'system',
        };
        return this.templateService.create(normalized);
    }

    @Get('templates')
    @ApiOperation({ summary: 'List all templates' })
    async listTemplates(
        @Query('type') type?: DocumentTemplateType,
        @Query('language') language?: TemplateLanguage,
    ) {
        return this.templateService.findAll({ templateType: type, language });
    }

    @Get('templates/:id')
    @ApiOperation({ summary: 'Get template by ID' })
    async getTemplate(@Param('id') id: string) {
        return this.templateService.findById(id);
    }

    @Put('templates/:id')
    @ApiOperation({ summary: 'Update template' })
    async updateTemplate(
        @Param('id') id: string,
        @Body()
        updateDto: {
            templateName?: string;
            content?: string;
            variables?: any[];
            isActive?: boolean;
            updatedBy: string;
        },
    ) {
        return this.templateService.update(id, { ...updateDto, updatedBy: updateDto.updatedBy || 'system' });
    }

    // Adapter: validateTemplate
    async validateTemplate(
        @Body() template: { content: string; variables?: Array<{ name: string; required?: boolean }> } | string
    ) {
        return this.templateService.validateTemplate(template);
    }

    @Post('generate')
    @ApiOperation({ summary: 'Generate document from template' })
    async generateDocument(
        @Body()
        generateDto: {
            templateId: string;
            disputeCaseId: string;
            variables: Record<string, any>;
            language?: string;
            generatedBy: string;
            generatePDF?: boolean;
        },
    ) {
        const result = await this.generatorService.generateDocument({
            templateId: generateDto.templateId,
            disputeCaseId: generateDto.disputeCaseId,
            variables: generateDto.variables,
            language: generateDto.language,
            generatedBy: generateDto.generatedBy,
        });

        if (generateDto.generatePDF) {
            await this.pdfService.generatePDF({
                content: result.content,
                filePath: result.filePath,
                metadata: {
                    title: `Document ${result.documentId}`,
                    author: 'SME Platform',
                },
                options: {
                    includeHeader: true,
                    includeFooter: true,
                },
            });
        }

        return {
            documentId: result.documentId,
            filePath: result.filePath,
            pdfGenerated: generateDto.generatePDF || false,
        };
    }

    // Adapter endpoints for tests
    async generateLegalNotice(@Body() caseData: any) {
        return this.generatorService.generateLegalNotice(caseData);
    }
    async generateDemandLetter(@Body() demandData: any) {
        return this.generatorService.generateDemandLetter(demandData);
    }
    async generateSettlementAgreement(@Body() settlementData: any) {
        return this.generatorService.generateSettlementAgreement(settlementData);
    }
    async generatePaymentReceipt(@Body() paymentData: any) {
        return this.generatorService.generatePaymentReceipt(paymentData);
    }
    async batchGenerate(@Body() batchRequest: { documents: any[] }) {
        return this.generatorService.batchGenerate(batchRequest.documents || []);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get generated document' })
    async getDocument(@Param('id') id: string) {
        return this.generatorService.findById(id);
    }

    @Get('case/:caseId')
    @ApiOperation({ summary: 'Get all documents for a case' })
    async getCaseDocuments(@Param('caseId') caseId: string) {
        return this.generatorService.findByCaseId(caseId);
    }

    @Post(':id/regenerate')
    @ApiOperation({ summary: 'Regenerate document' })
    async regenerateDocument(
        @Param('id') id: string,
        @Body()
        regenerateDto: {
            variables: Record<string, any>;
            userId: string;
            generatePDF?: boolean;
        },
    ) {
        const result = await this.generatorService.regenerateDocument(
            id,
            regenerateDto.variables,
            regenerateDto.userId,
        );

        if (regenerateDto.generatePDF) {
            await this.pdfService.generatePDF({
                content: result.content,
                filePath: result.filePath,
                options: {
                    includeHeader: true,
                    includeFooter: true,
                },
            });
        }

        return result;
    }

    @Post(':id/sign')
    @ApiOperation({ summary: 'Sign document digitally' })
    async signDocument(
        @Param('id') id: string,
        @Body()
        signDto: {
            signedBy: string;
            signatureMethod: string;
            certificateId?: string;
        },
    ) {
        return {
            message: 'Digital signature feature coming soon',
            documentId: id,
        };
    }
}
