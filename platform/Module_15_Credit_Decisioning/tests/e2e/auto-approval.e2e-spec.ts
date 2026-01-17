import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { CreditDecisionModule } from '../../src/credit-decision.module';

describe('Auto-Approval Journey E2E', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [__dirname + '/../../src/entities/*.entity{.ts,.js}'],
                    synchronize: true,
                    dropSchema: true,
                }),
                CreditDecisionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should auto-approve low-risk invoice', async () => {
        const response = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-low-risk-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 5000,
                context: {
                    creditScore: 850,
                    paymentHistory: 'excellent',
                },
            })
            .expect(201);

        expect(response.body.status).toBe('approved');
        expect(response.body.requiresManualReview).toBe(false);
        expect(response.body.confidenceScore).toBeGreaterThan(90);
    });

    it('should apply multiple rules for low-risk approval', async () => {
        // First create rules
        const rule1 = await request(app.getHttpServer())
            .post('/decision-rules')
            .send({
                name: 'Low Amount Auto-Approve',
                ruleType: 'SCORING',
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'lt', value: 10000 }],
                actions: [{ type: 'APPROVE', parameters: { confidence: 95 } }],
            })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/decision-rules/${rule1.body.id}/activate`)
            .expect(200);

        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-multi-rule-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 8000,
                context: {},
            })
            .expect(201);

        expect(decision.body.appliedRules).toContain(rule1.body.id);
        expect(decision.body.status).toBe('approved');
    });

    it('should fast-track with high confidence score', async () => {
        const startTime = Date.now();

        const response = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-fast-track-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 3000,
                context: {
                    fastTrack: true,
                    creditScore: 900,
                },
            })
            .expect(201);

        const duration = Date.now() - startTime;

        expect(response.body.status).toBe('approved');
        expect(duration).toBeLessThan(500); // Fast processing
    });

    it('should auto-approve based on scoring rules', async () => {
        const rule = await request(app.getHttpServer())
            .post('/decision-rules')
            .send({
                name: 'Score-Based Approval',
                ruleType: 'SCORING',
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [
                    { field: 'creditScore', operator: 'gte', value: 750 },
                ],
                actions: [{ type: 'APPROVE', parameters: {} }],
            })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/decision-rules/${rule.body.id}/activate`)
            .expect(200);

        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-score-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 15000,
                context: { creditScore: 800 },
            })
            .expect(201);

        expect(decision.body.status).toBe('approved');
    });

    it('should capture decision audit trail', async () => {
        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-audit-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 12000,
                context: {},
            })
            .expect(201);

        const retrieved = await request(app.getHttpServer())
            .get(`/credit-decisions/${decision.body.id}`)
            .expect(200);

        expect(retrieved.body.createdAt).toBeDefined();
        expect(retrieved.body.status).toBe(decision.body.status);
    });

    it('should handle concurrent auto-approval requests', async () => {
        const requests = Array.from({ length: 5 }, (_, i) =>
            request(app.getHttpServer())
                .post('/credit-decisions/evaluate')
                .send({
                    entityId: `invoice-concurrent-${i}`,
                    entityType: 'invoice',
                    decisionType: 'credit_approval',
                    requestedAmount: 5000 + i * 1000,
                    context: {},
                })
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
        });
    });

    it('should filter by entity when retrieving decisions', async () => {
        const invoice1 = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-filter-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 7000,
                context: {},
            })
            .expect(201);

        const decisions = await request(app.getHttpServer())
            .get('/credit-decisions/entity/invoice-filter-1/invoice')
            .expect(200);

        expect(decisions.body).toBeInstanceOf(Array);
        expect(decisions.body.length).toBeGreaterThan(0);
    });

    it('should validate requested amount thresholds', async () => {
        const lowAmount = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-threshold-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 100,
                context: {},
            })
            .expect(201);

        expect(lowAmount.body.status).toBe('approved');
    });

    it('should calculate risk score correctly', async () => {
        const response = await request(app.getHttpServer())
            .post('/credit-decisions/risk-score')
            .send({
                amount: 20000,
                creditHistory: 'good',
                industryRisk: 'low',
                paymentHistory: 'excellent',
            })
            .expect(201);

        expect(response.body.riskScore).toBeDefined();
        expect(response.body.riskLevel).toBeDefined();
        expect(response.body.riskScore).toBeGreaterThanOrEqual(0);
        expect(response.body.riskScore).toBeLessThanOrEqual(100);
    });

    it('should approve with business reason', async () => {
        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-reason-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 9000,
                context: {},
            })
            .expect(201);

        expect(decision.body.decisionReason).toBeDefined();
    });

    it('should track decision analytics', async () => {
        // Create multiple decisions
        for (let i = 0; i < 3; i++) {
            await request(app.getHttpServer())
                .post('/credit-decisions/evaluate')
                .send({
                    entityId: `invoice-analytics-${i}`,
                    entityType: 'invoice',
                    decisionType: 'credit_approval',
                    requestedAmount: 6000 + i * 1000,
                    context: {},
                });
        }

        const analytics = await request(app.getHttpServer())
            .get('/credit-decisions/analytics')
            .expect(200);

        expect(analytics.body.total).toBeGreaterThan(0);
    });

    it('should support tenant isolation', async () => {
        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-tenant-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 11000,
                context: {},
                tenantId: 'tenant-123',
            })
            .expect(201);

        expect(decision.body.tenantId).toBe('tenant-123');
    });

    it('should handle validation errors gracefully', async () => {
        await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-invalid',
                // Missing required fields
            })
            .expect(400);
    });

    it('should support immediate notification on approval', async () => {
        const decision = await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId: 'invoice-notify-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 4500,
                context: {
                    notificationRequired: true,
                },
            })
            .expect(201);

        expect(decision.body.notificationSent).toBeDefined();
    });

    it('should maintain decision history', async () => {
        const entityId = 'invoice-history-1';

        // Create first decision
        await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId,
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 5000,
                context: {},
            })
            .expect(201);

        // Create second decision
        await request(app.getHttpServer())
            .post('/credit-decisions/evaluate')
            .send({
                entityId,
                entityType: 'invoice',
                decisionType: 'credit_approval',
                requestedAmount: 6000,
                context: {},
            })
            .expect(201);

        const history = await request(app.getHttpServer())
            .get(`/credit-decisions/entity/${entityId}/invoice`)
            .expect(200);

        expect(history.body.length).toBeGreaterThanOrEqual(2);
    });
});
