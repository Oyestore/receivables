import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/auth/login (POST)', () => {
        it('should login with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local',
                    password: process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@2025',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body).toHaveProperty('user');
                    accessToken = res.body.accessToken;
                });
        });

        it('should fail with invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword',
                })
                .expect(401);
        });
    });

    describe('/api/tenant/:tenantId/users (GET)', () => {
        it('should return users when authenticated', () => {
            return request(app.getHttpServer())
                .get('/api/tenant/test-tenant-id/users')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
        });

        it('should fail without authentication', () => {
            return request(app.getHttpServer())
                .get('/api/tenant/test-tenant-id/users')
                .expect(401);
        });
    });
});
