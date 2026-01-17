import { Test, TestingModule } from '@nestjs/testing';
import { DocumentTemplateService } from '../document-template.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentTemplate } from '../../entities/document-template.entity';

describe('DocumentTemplateService', () => {
    let service: DocumentTemplateService;
    let repository: any;

    const mockTemplate = {
        id: '1',
        name: 'Legal Notice Template',
        type: 'LEGAL_NOTICE',
        content: '<h1>Legal Notice</h1><p>To: {{defendant}}</p>',
        variables: ['defendant', 'amount', 'dueDate'],
        isActive: true,
    };

    const mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentTemplateService,
                {
                    provide: getRepositoryToken(DocumentTemplate),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<DocumentTemplateService>(DocumentTemplateService);
        repository = module.get(getRepositoryToken(DocumentTemplate));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getTemplate', () => {
        it('should retrieve template by type', async () => {
            mockRepository.findOne.mockResolvedValue(mockTemplate);

            const result = await service.getTemplate('LEGAL_NOTICE');

            expect(result).toEqual(mockTemplate);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { type: 'LEGAL_NOTICE', isActive: true },
            });
        });

        it('should return null if template not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.getTemplate('NON_EXISTENT');

            expect(result).toBeNull();
        });
    });

    describe('renderTemplate', () => {
        it('should render template with provided data', async () => {
            const template = mockTemplate.content;
            const data = {
                defendant: 'ABC Company',
                amount: '₹1,00,000',
                dueDate: '2025-01-15',
            };

            const result = await service.renderTemplate(template, data);

            expect(result).toContain('ABC Company');
            expect(result).toContain('₹1,00,000');
        });

        it('should handle missing variables gracefully', async () => {
            const template = '{{name}} - {{email}}';
            const data = { name: 'John' }; // Missing email

            const result = await service.renderTemplate(template, data);

            expect(result).toContain('John');
            expect(result).not.toContain('undefined');
        });
    });

    describe('createTemplate', () => {
        it('should create new template', async () => {
            const newTemplate = {
                name: 'Demand Letter',
                type: 'DEMAND_LETTER',
                content: '<p>Pay now</p>',
            };

            mockRepository.create.mockReturnValue(newTemplate);
            mockRepository.save.mockResolvedValue({ ...newTemplate, id: '2' });

            const result = await service.createTemplate(newTemplate as any);

            expect(result.id).toBe('2');
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });

    describe('updateTemplate', () => {
        it('should update existing template', async () => {
            const templateId = '1';
            const updates = { content: '<p>Updated content</p>' };

            mockRepository.findOne.mockResolvedValue(mockTemplate);
            mockRepository.save.mockResolvedValue({ ...mockTemplate, ...updates });

            const result = await service.updateTemplate(templateId, updates);

            expect(result.content).toBe(updates.content);
        });
    });

    describe('listTemplates', () => {
        it('should list all active templates', async () => {
            mockRepository.find.mockResolvedValue([mockTemplate]);

            const result = await service.listTemplates();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockTemplate);
        });
    });

    describe('validateTemplate', () => {
        it('should validate template syntax', async () => {
            const validTemplate = '{{name}} - {{date}}';

            const result = await service.validateTemplate(validTemplate);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid template syntax', async () => {
            const invalidTemplate = '{{name - {{date}}'; // Missing closing brace

            const result = await service.validateTemplate(invalidTemplate);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
