import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { GlobalizationModule } from '../../src/globalization.module';

describe('Module 14 E2E Tests - Complete Workflows', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [GlobalizationModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('E2E: Multi-Currency Workflow', () => {
        it('should execute complete currency conversion flow', async () => {
            // Get current rate
            const rateResponse = await request(app.getHttpServer())
                .get('/globalization/currency/rate')
                .query({ from: 'USD', to: 'INR' })
                .expect(200);

            expect(rateResponse.body.rate).toBeDefined();

            // Convert amount
            const convertResponse = await request(app.getHttpServer())
                .post('/globalization/currency/convert')
                .send({
                    amount: 100,
                    fromCurrency: 'USD',
                    toCurrency: 'INR',
                })
                .expect(201);

            expect(convertResponse.body.convertedAmount).toBeGreaterThan(0);
        });
    });

    describe('E2E: Language Switching Workflow', () => {
        it('should switch language and get localized content', async () => {
            // Set language preference
            await request(app.getHttpServer())
                .post('/globalization/language/set')
                .send({
                    tenantId: 'tenant-1',
                    languageCode: 'ar_SA',
                })
                .expect(201);

            // Get translated content
            const translationResponse = await request(app.getHttpServer())
                .get('/globalization/translate')
                .query({
                    key: 'welcome_message',
                    language: 'ar_SA',
                })
                .expect(200);

            expect(translationResponse.body.text).toBeDefined();
        });
    });

    describe('E2E: Regional Customization Workflow', () => {
        it('should apply regional preset and customize settings', async () => {
            // Apply UAE preset
            const presetResponse = await request(app.getHttpServer())
                .post('/globalization/regional/apply-preset')
                .send({
                    tenantId: 'tenant-1',
                    countryCode: 'AE',
                })
                .expect(201);

            expect(presetResponse.body.currencyCode).toBe('AED');
            expect(presetResponse.body.timezone).toBe('Asia/Dubai');
        });
    });

    describe('E2E: Payment Intelligence Workflow', () => {
        it('should get optimal payment route and execute transfer', async () => {
            // Get optimal route
            const routeResponse = await request(app.getHttpServer())
                .get('/globalization/payment-intelligence/route')
                .query({
                    fromCountry: 'US',
                    toCountry: 'IN',
                    amount: 1000,
                })
                .expect(200);

            expect(routeResponse.body.recommendedProvider).toBeDefined();
        });
    });

    describe('E2E: Compliance Validation Workflow', () => {
        it('should validate compliance for cross-border invoice', async () => {
            const complianceResponse = await request(app.getHttpServer())
                .post('/globalization/compliance/validate')
                .send({
                    countryCode: 'AE',
                    invoiceData: {
                        amount: 5000,
                        vatNumber: '123456789012345',
                    },
                })
                .expect(201);

            expect(complianceResponse.body.isCompliant).toBe(true);
        });
    });

    describe('E2E: Cultural Adaptation Workflow', () => {
        it('should get cultural norms and adapt communication', async () => {
            const normsResponse = await request(app.getHttpServer())
                .get('/globalization/cultural/norms')
                .query({ countryCode: 'JP' })
                .expect(200);

            expect(normsResponse.body.communicationPreferences.formality).toBe('high');
        });
    });

    describe('E2E: Complete Localization Setup', () => {
        it('should execute full tenant localization setup', async () => {
            // Step 1: Apply regional preset
            await request(app.getHttpServer())
                .post('/globalization/regional/apply-preset')
                .send({
                    tenantId: 'tenant-new',
                    countryCode: 'IN',
                })
                .expect(201);

            // Step 2: Customize settings
            await request(app.getHttpServer())
                .post('/globalization/settings/update')
                .send({
                    tenantId: 'tenant-new',
                    timezone: 'Asia/Kolkata',
                    dateFormat: 'DD/MM/YYYY',
                })
                .expect(200);

            // Step 3: Set working days
            await request(app.getHttpServer())
                .post('/globalization/regional/working-days')
                .send({
                    tenantId: 'tenant-new',
                    days: [1, 2, 3, 4, 5],
                })
                .expect(201);

            // Step 4: Add holidays
            await request(app.getHttpServer())
                .post('/globalization/regional/holidays')
                .send({
                    tenantId: 'tenant-new',
                    holidays: [
                        { name: 'Holi', date: '2024-03-25' },
                    ],
                })
                .expect(201);
        });
    });

    describe('E2E: Error Scenarios', () => {
        it('should handle invalid currency conversion', async () => {
            await request(app.getHttpServer())
                .post('/globalization/currency/convert')
                .send({
                    fromCurrency: 'INVALID',
                    toCurrency: 'USD',
                })
                .expect(400);
        });

        it('should handle unsupported language', async () => {
            await request(app.getHttpServer())
                .get('/globalization/translate')
                .query({
                    key: 'test',
                    language: 'xx_XX', // Invalid
                })
                .expect(400);
        });
    });
});
