import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module'; // Adjust path as needed
import { UserDefinedDataSourceDto } from '../../../src/user-data-sources/dto/user-defined-data-source.dto';
import { DataSourceType, AuthMethod } from '../../../src/user-data-sources/entities/user-defined-data-source.entity';
import { UserDataSourceService } from '../../../src/user-data-sources/services/user-data-source.service';
import { EncryptionService } from '../../../src/shared/services/encryption.service';

// Mock JWT token for testing authenticated routes
const MOCK_JWT_TOKEN = 'mock.jwt.token';

describe('UserDataSourceController (e2e)', () => {
  let app: INestApplication;
  let userDataSourceService: UserDataSourceService;
  let encryptionService: EncryptionService;
  let createdDataSourceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Import your main AppModule
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userDataSourceService = moduleFixture.get<UserDataSourceService>(UserDataSourceService);
    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);

    // Clean up any existing test data if necessary, or ensure DB is clean
    // For this conceptual test, we assume a clean state or handle cleanup in afterAll/afterEach
  });

  afterAll(async () => {
    // Clean up: delete any created test data
    if (createdDataSourceId) {
      // Conceptually, you'd call the service or make a DELETE request
      // await userDataSourceService.remove(createdDataSourceId); // This depends on your service method
    }
    await app.close();
  });

  describe('POST /api/user-data-sources', () => {
    it('should create a REST API data source with NO AUTH (201)', () => {
      const dto: UserDefinedDataSourceDto = {
        name: 'E2E Test REST No Auth',
        type: DataSourceType.REST_API,
        connection_config: {
          base_url: 'http://test-e2e.com/api',
          auth_method: AuthMethod.NONE,
        },
        organization_id: 'org-e2e-test',
      };
      return request(app.getHttpServer())
        .post('/api/user-data-sources')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toEqual(dto.name);
          expect(response.body.connection_config.auth_method).toEqual(AuthMethod.NONE);
          createdDataSourceId = response.body.id; // Save for later tests/cleanup
        });
    });

    it('should create a REST API data source with API KEY auth (201)', async () => {
      const apiKey = 'test-api-key-e2e';
      const dto: UserDefinedDataSourceDto = {
        name: 'E2E Test REST API Key',
        type: DataSourceType.REST_API,
        connection_config: {
          base_url: 'http://test-apikey-e2e.com/api',
          auth_method: AuthMethod.API_KEY,
          api_key_header: 'X-Test-Key',
          api_key_value: apiKey,
        },
        organization_id: 'org-e2e-test',
      };

      const response = await request(app.getHttpServer())
        .post('/api/user-data-sources')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      // Verify encryption by fetching and decrypting, or checking DB directly (conceptual here)
      const dbRecord = await userDataSourceService.findOne(response.body.id); // Conceptual fetch
      expect(dbRecord.connection_config.api_key_value).not.toEqual(apiKey); // Should be encrypted
      // const decryptedKey = await encryptionService.decrypt(dbRecord.connection_config.api_key_value);
      // expect(decryptedKey).toEqual(apiKey);
    });

    it('should fail to create with invalid DTO (400)', () => {
      const dto = { name: 'Missing type' }; // Invalid DTO
      return request(app.getHttpServer())
        .post('/api/user-data-sources')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(dto)
        .expect(400);
    });

    it('should fail to create without authentication (401)', () => {
      const dto: UserDefinedDataSourceDto = { name: 'No Auth Test', type: DataSourceType.JSON_FILE_URL, connection_config: { file_url: 'http://file.com/data.json'}, organization_id: 'org1' };
      return request(app.getHttpServer())
        .post('/api/user-data-sources')
        .send(dto)
        .expect(401);
    });
  });

  describe('GET /api/user-data-sources', () => {
    beforeAll(async () => {
      // Ensure at least one data source exists (created in POST tests or create one here)
      if (!createdDataSourceId) {
        const dto: UserDefinedDataSourceDto = { name: 'For GET Test', type: DataSourceType.JSON_FILE_URL, connection_config: { file_url: 'http://get.com/data.json'}, organization_id: 'org-get' };
        const res = await userDataSourceService.create(dto, 'user-test-id');
        createdDataSourceId = res.id;
      }
    });

    it('should get all data sources (200)', () => {
      return request(app.getHttpServer())
        .get('/api/user-data-sources')
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(1);
          const found = response.body.find(ds => ds.id === createdDataSourceId);
          expect(found).toBeDefined();
          // Sensitive fields like api_key_value should not be present or should be masked
          if (found.connection_config.auth_method === AuthMethod.API_KEY) {
            expect(found.connection_config.api_key_value).toBeUndefined(); 
          }
        });
    });

    it('should fail to get all without authentication (401)', () => {
      return request(app.getHttpServer())
        .get('/api/user-data-sources')
        .expect(401);
    });
  });

  describe('GET /api/user-data-sources/:id', () => {
    it('should get a data source by ID (200)', () => {
      expect(createdDataSourceId).toBeDefined(); // Ensure ID exists from previous test
      return request(app.getHttpServer())
        .get(`/api/user-data-sources/${createdDataSourceId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toEqual(createdDataSourceId);
          // Sensitive fields should be masked/omitted
        });
    });

    it('should fail to get with non-existent ID (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/user-data-sources/${nonExistentId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /api/user-data-sources/:id', () => {
    it('should update a data source (200)', () => {
      expect(createdDataSourceId).toBeDefined();
      const updateDto: Partial<UserDefinedDataSourceDto> = {
        name: 'Updated E2E Test Name',
        connection_config: {
          base_url: 'http://updated-e2e.com/api',
          auth_method: AuthMethod.NONE, // Assuming it was REST_API NO_AUTH
        }
      };
      return request(app.getHttpServer())
        .put(`/api/user-data-sources/${createdDataSourceId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.name).toEqual('Updated E2E Test Name');
          expect(response.body.connection_config.base_url).toEqual('http://updated-e2e.com/api');
        });
    });

    it('should fail to update non-existent ID (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .put(`/api/user-data-sources/${nonExistentId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .send({ name: 'Update Fail' })
        .expect(404);
    });
  });

  describe('POST /api/user-data-sources/:id/test-connection', () => {
    // This test is conceptual as UserDataSourceFetchingService.fetchData is complex to mock fully here
    // and actual external calls are not suitable for e2e tests without a dedicated mock server.
    // We will test that the endpoint is reachable and returns what the controller is expected to return
    // based on a mocked service call if this were a unit/integration test for the controller itself.
    // For e2e, we mostly check if the endpoint exists and auth works.

    it('should conceptually accept a test connection request (200 or appropriate)', () => {
      expect(createdDataSourceId).toBeDefined();
      // In a real e2e with a mock server, you'd set up the mock server to respond.
      // Here, we just check if the endpoint is callable and returns a success structure.
      // The actual fetching logic is unit-tested in UserDataSourceFetchingService.spec.ts.
      return request(app.getHttpServer())
        .post(`/api/user-data-sources/${createdDataSourceId}/test-connection`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200) // Assuming the controller returns 200 even for conceptual test
        .then((response) => {
            expect(response.body).toHaveProperty('success');
            // Further checks depend on how the conceptual test is implemented in the controller
        });
    });

    it('should fail test connection for non-existent ID (404)', () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        return request(app.getHttpServer())
          .post(`/api/user-data-sources/${nonExistentId}/test-connection`)
          .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
          .expect(404);
      });
  });

  describe('DELETE /api/user-data-sources/:id', () => {
    let tempDataSourceId: string;
    beforeAll(async () => {
      // Create a temporary data source specifically for delete test
      const dto: UserDefinedDataSourceDto = { name: 'For DELETE Test', type: DataSourceType.JSON_FILE_URL, connection_config: { file_url: 'http://delete.com/data.json'}, organization_id: 'org-delete' };
      const res = await userDataSourceService.create(dto, 'user-test-id');
      tempDataSourceId = res.id;
    });

    it('should delete a data source (200)', () => {
      expect(tempDataSourceId).toBeDefined();
      return request(app.getHttpServer())
        .delete(`/api/user-data-sources/${tempDataSourceId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(200); // Or 204 No Content depending on your API design
    });

    it('should fail to delete non-existent ID (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'; // Or use tempDataSourceId again after deletion
      return request(app.getHttpServer())
        .delete(`/api/user-data-sources/${nonExistentId}`)
        .set('Authorization', `Bearer ${MOCK_JWT_TOKEN}`)
        .expect(404);
    });
  });

});

