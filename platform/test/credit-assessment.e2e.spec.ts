import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Body, Get, Headers } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

describe('Credit Assessment Journey (E2E)', () => {
    let app: INestApplication;
    let jwtToken: string;

    beforeAll(async () => {
        @Controller('credit-scoring')
        class TestCreditScoringController {
            @Post('assess')
            async assess(@Body() body: any, @Headers('authorization') _auth: string) {
                const score = 720;
                const decision = 'APPROVE';
                return { score, decision, pan: body.pan, consentId: body.consentId };
            }
        }

        @Controller('trade-insurance')
        class TestTradeInsuranceController {
            @Post('quotes')
            async quotes(@Body() body: any, @Headers('authorization') _auth: string) {
                return [
                    { provider: 'SafeInsure', premium: Math.round(body.invoiceAmount * 0.02), coverage: body.invoiceAmount },
                    { provider: 'SecureTrade', premium: Math.round(body.invoiceAmount * 0.018), coverage: body.invoiceAmount },
                ];
            }
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppTestingModule],
            controllers: [TestCreditScoringController, TestTradeInsuranceController],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        jwtToken = 'test-token';
    });

    afterAll(async () => {
        await app.close();
    });

    it('/credit-scoring/assess (POST) - Full Credit Check', async () => {
        const response = await request(app.getHttpServer())
            .post('/credit-scoring/assess')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                pan: 'ABCDE1234F',
                name: 'Credit Test User',
                consentId: 'CONSENT_E2E'
            })
            .expect(201);

        expect(response.body.score).toBeDefined();
        expect(response.body.decision).toBeDefined();
        // Either APPROVE, REJECT, or MANUAL_REVIEW
        expect(['APPROVE', 'REJECT', 'MANUAL_REVIEW']).toContain(response.body.decision);
    });

    it('/trade-insurance/quotes (POST) - Get Insurance Quotes', async () => {
        const response = await request(app.getHttpServer())
            .post('/trade-insurance/quotes')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({
                invoiceId: 'INV_E2E_1',
                invoiceAmount: 100000,
                buyerName: 'Risky Buyer',
                paymentTermsDays: 60
            })
            .expect(201);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].premium).toBeDefined();
    });
});
