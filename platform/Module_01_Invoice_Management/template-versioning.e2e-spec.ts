import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module'; // Adjust path as needed
import { CreateInvoiceTemplateMasterDto } from '../../../src/templates/dto/create-invoice-template-master.dto';
import { CreateNewTemplateVersionDto } from '../../../src/templates/dto/create-new-template-version.dto';
import { TemplateService } from '../../../src/templates/services/template.service';

// Mock JWT token for testing authenticated routes
const MOCK_JWT_TOKEN = 'mock.jwt.token';

// Sample GrapesJS data for template definition
const sampleTemplateDefinition = {
  html: '<div><h1>Sample Template {{invoice.number}}</h1><p>Total: {{invoice.total}}</p></div>',
  css: 'h1 { color: blue; }',
  components: [{ type: 'text', content: 'Sample Component' }], // Simplified GrapesJS components JSON
  style: [{ selectors: ['h1'], style: { color: 'blue' } }],
  variables: [{ name: 'invoice.number', type: 'string'}, { name: 'invoice.total', type: 'number'}]
};

describe('TemplateVersioningController (e2e)', () => {
  let app: INestApplication;
  let templateService: TemplateService;
  let createdTemplateMasterId: string;
  let createdTemplateVersionId: string;
  let currentVersionNumber = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    templateService = moduleFixture.get<TemplateService>(TemplateService);
    // Clean up or ensure clean state
  });

  afterAll(async () => {
    // Conceptual cleanup: Delete created template master and versions if necessary
    // if (createdTemplateMasterId) {
    //   await templateService.deleteTemplateMaster(createdTemplateMasterId, 'test-user-id', 'org-test-id');
    // }
    await app.close();
  });

  describe('POST /api/templates (Create Template Master and First Version)', () => {
    it('should create a new template master and its first version (201)', () => {
      const dto: CreateInvoiceTemplateMasterDto = {
        name: 'E2E Test Template Master',
        description: 'A template master created for e2e testing',
        template_definition: sampleTemplateDefinition,
        html_content: sampleTemplateDefinition.html,
        css_content: sampleTemplateDefinition.css,
        template_variables: sampleTemplateDefinition.variables,
        organization_id: 'org-e2e-test',
      };
      return request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toEqual(dto.name);
          expect(response.body.versions).toBeInstanceOf(Array);
          expect(response.body.versions.length).toBe(1);
          expect(response.body.versions[0].version_number).toBe(1);
          createdTemplateMasterId = response.body.id;
          createdTemplateVersionId = response.body.versions[0].id;
          currentVersionNumber = 1;
        });
    });

    it('should fail to create with invalid DTO (400)', () => {
      const dto = { name: 'Missing definition' }; // Invalid DTO
      return request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('GET /api/templates (List All Template Masters)', () => {
    it('should get all template masters (200)', () => {
      expect(createdTemplateMasterId).toBeDefined(); // Ensure one exists
      return request(app.getHttpServer())
        .get('/api/templates')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(1);
          const found = response.body.find(tm => tm.id === createdTemplateMasterId);
          expect(found).toBeDefined();
        });
    });
  });

  describe('GET /api/templates/:masterId (Get Specific Template Master with Versions)', () => {
    it('should get a specific template master by ID with its versions (200)', () => {
      expect(createdTemplateMasterId).toBeDefined();
      return request(app.getHttpServer())
        .get(`/api/templates/${createdTemplateMasterId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toEqual(createdTemplateMasterId);
          expect(response.body.versions).toBeInstanceOf(Array);
          expect(response.body.versions.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should fail to get with non-existent masterId (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/templates/${nonExistentId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(404);
    });
  });

  describe('POST /api/templates/:masterId/versions (Create New Version)', () => {
    it('should create a new version for an existing template master (201)', () => {
      expect(createdTemplateMasterId).toBeDefined();
      const newDefinition = { ...sampleTemplateDefinition, html: '<div>Updated Content V2</div>' };
      const dto: CreateNewTemplateVersionDto = {
        template_definition: newDefinition,
        html_content: newDefinition.html,
        css_content: newDefinition.css,
        template_variables: newDefinition.variables,
        comment: 'Second version created for e2e test',
      };
      return request(app.getHttpServer())
        .post(`/api/templates/${createdTemplateMasterId}/versions`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          currentVersionNumber += 1;
          expect(response.body.version_number).toBe(currentVersionNumber);
          expect(response.body.comment).toEqual(dto.comment);
          createdTemplateVersionId = response.body.id; // Update to the latest version ID
        });
    });

    it('should fail to create version for non-existent masterId (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const dto: CreateNewTemplateVersionDto = { template_definition: sampleTemplateDefinition, html_content: '', css_content: '' };
      return request(app.getHttpServer())
        .post(`/api/templates/${nonExistentId}/versions`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(404);
    });
  });

  describe('GET /api/templates/:masterId/versions/:versionNumber (Get Specific Version)', () => {
    it('should get a specific template version (200)', () => {
      expect(createdTemplateMasterId).toBeDefined();
      return request(app.getHttpServer())
        .get(`/api/templates/${createdTemplateMasterId}/versions/${currentVersionNumber}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toEqual(createdTemplateVersionId);
          expect(response.body.version_number).toBe(currentVersionNumber);
        });
    });

    it('should fail to get non-existent version number (404)', () => {
      return request(app.getHttpServer())
        .get(`/api/templates/${createdTemplateMasterId}/versions/999`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(404);
    });
  });

  describe('POST /api/templates/:masterId/versions/:versionNumber/revert (Revert to Version)', () => {
    let versionToRevertTo = 1;
    it('should revert to an older version, creating a new version (201)', () => {
      expect(createdTemplateMasterId).toBeDefined();
      expect(currentVersionNumber).toBeGreaterThanOrEqual(versionToRevertTo); // Ensure there's a version to revert to
      
      const revertComment = `Reverted to version ${versionToRevertTo}`;
      return request(app.getHttpServer())
        .post(`/api/templates/${createdTemplateMasterId}/versions/${versionToRevertTo}/revert`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send({ comment: revertComment })
        .expect(201)
        .then(async (response) => {
          expect(response.body).toHaveProperty('id');
          currentVersionNumber += 1;
          expect(response.body.version_number).toBe(currentVersionNumber);
          expect(response.body.comment).toContain(revertComment);
          createdTemplateVersionId = response.body.id;

          // Verify that the content of the new version matches the reverted version
          const revertedVersionContent = await templateService.getTemplateVersion(
            createdTemplateMasterId,
            versionToRevertTo,
            'org-e2e-test' // Assuming orgId is needed by service
          );
          expect(response.body.template_definition.html).toEqual(revertedVersionContent.template_definition.html);
        });
    });

    it('should fail to revert to non-existent version number (404)', () => {
      return request(app.getHttpServer())
        .post(`/api/templates/${createdTemplateMasterId}/versions/998/revert`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send({ comment: 'Attempt to revert to non-existent' })
        .expect(404);
    });
  });

  describe('Conditional Logic Storage with Template Version', () => {
    it('should save and retrieve conditional logic with a template version', async () => {
        expect(createdTemplateMasterId).toBeDefined();
        const conditionalLogicData = {
            groups: [
                { groupLogic: 'AND', rules: [{ field: 'invoice.total', operator: '>', value: '100' }] }
            ]
        };
        const templateDefWithConditions = {
            ...sampleTemplateDefinition,
            html: '<div data-gjs-conditions=\'test\'>Conditional Content</div>', // Placeholder for actual GJS structure
            // Simulate GrapesJS storing conditions on a component
            // In a real scenario, GrapesJS would serialize this into its component structure
            // For this test, we'll assume the 'template_definition' can hold a representation
            // that the backend will store and return.
            // A more accurate test would involve parsing the GrapesJS JSON structure.
            // For simplicity, let's assume a top-level 'conditions' field in template_definition for this test.
            conditions: conditionalLogicData 
        };

        const dto: CreateNewTemplateVersionDto = {
            template_definition: templateDefWithConditions as any, // Cast as any for test simplicity
            html_content: templateDefWithConditions.html,
            css_content: sampleTemplateDefinition.css,
            template_variables: sampleTemplateDefinition.variables,
            comment: 'Version with conditional logic',
        };

        const createResponse = await request(app.getHttpServer())
            .post(`/api/templates/${createdTemplateMasterId}/versions`)
            .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
            .send(dto)
            .expect(201);
        
        currentVersionNumber += 1;
        const newVersionId = createResponse.body.id;
        expect(createResponse.body.version_number).toBe(currentVersionNumber);

        const getResponse = await request(app.getHttpServer())
            .get(`/api/templates/${createdTemplateMasterId}/versions/${currentVersionNumber}`)
            .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
            .expect(200);
        
        // This check depends on how conditional logic is actually stored and retrieved.
        // If it's embedded within GrapesJS JSON, this check needs to be more sophisticated.
        // Assuming 'conditions' field for this conceptual test.
        expect(getResponse.body.template_definition.conditions).toEqual(conditionalLogicData);
    });
  });

});

