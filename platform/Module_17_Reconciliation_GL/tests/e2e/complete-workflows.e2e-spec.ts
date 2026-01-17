import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Module17ReconciliationGLModule } from '../../module-17-reconciliation-gl.module';

describe('Module 17 Complete E2E Workflows', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [Module17ReconciliationGLModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('E2E: Complete Reconciliation Workflow', () => {
        it('should execute full reconciliation flow', async () => {
            // Step 1: Import bank transactions
            const importResponse = await request(app.getHttpServer())
                .post('/bank-feed/import/acc-1')
                .send({
                    transactions: [
                        {
                            date: new Date(),
                            amount: 10000,
                            type: 'credit',
                            description: 'Payment from customer',
                            utrNumber: 'UTR123456',
                        },
                    ],
                })
                .expect(201);

            expect(importResponse.body).toBeDefined();

            // Step 2: Run auto-reconciliation
            const reconResponse = await request(app.getHttpServer())
                .post('/reconciliation/run/tenant-1')
                .expect(201);

            expect(reconResponse.body.totalProcessed).toBeGreaterThanOrEqual(0);

            // Step 3: Get analytics
            const analyticsResponse = await request(app.getHttpServer())
                .get('/reconciliation/analytics/tenant-1')
                .expect(200);

            expect(analyticsResponse.body.totalMatches).toBeDefined();
        });
    });

    describe('E2E: GL Posting Workflow', () => {
        it('should create and post journal entry', async () => {
            // Step 1: Create draft entry
            const createResponse = await request(app.getHttpServer())
                .post('/gl-posting/entry')
                .send({
                    tenantId: 'tenant-1',
                    entryDate: new Date(),
                    description: 'Monthly depreciation',
                    entries: [
                        { entryType: 'debit', amount: 5000, glAccountId: 'acc-exp', description: 'Depreciation expense' },
                        { entryType: 'credit', amount: 5000, glAccountId: 'acc-acc-dep', description: 'Accumulated depreciation' },
                    ],
                })
                .expect(201);

            const entryId = createResponse.body.id;

            // Step 2: Post entry
            const postResponse = await request(app.getHttpServer())
                .post(`/gl-posting/post/${entryId}`)
                .send({ userId: 'user-123' })
                .expect(200);

            expect(postResponse.body.status).toBe('posted');

            // Step 3: Get trial balance
            const trialBalanceResponse = await request(app.getHttpServer())
                .get('/gl-posting/trial-balance/tenant-1')
                .expect(200);

            expect(Array.isArray(trialBalanceResponse.body)).toBe(true);
        });
    });

    describe('E2E: AI-Enhanced Matching Workflow', () => {
        it('should use AI fuzzy matching for unmatched transactions', async () => {
            // Step 1: Get unreconciled transactions
            const unreconciledResponse = await request(app.getHttpServer())
                .get('/bank-feed/unreconciled/acc-1')
                .expect(200);

            if (unreconciledResponse.body.length > 0) {
                const txnId = unreconciledResponse.body[0].id;

                // Step 2: Try fuzzy matching
                const fuzzyResponse = await request(app.getHttpServer())
                    .post(`/reconciliation/fuzzy-match/${txnId}`)
                    .expect(201);

                expect(Array.isArray(fuzzyResponse.body)).toBe(true);

                // Step 3: If low confidence, try predictive
                if (fuzzyResponse.body.length === 0 || fuzzyResponse.body[0].confidenceScore < 0.8) {
                    const predictiveResponse = await request(app.getHttpServer())
                        .post(`/reconciliation/predictive-match/${txnId}`)
                        .expect(201);

                    expect(Array.isArray(predictiveResponse.body)).toBe(true);
                }
            }
        });
    });

    describe('E2E: Statement Parsing Workflow', () => {
        it('should parse SWIFT MT940 statement', async () => {
            const mt940Content = `:20:STATEMENT123
:25:ACC123456
:28C:1/1
:60F:C240115EUR10000,
:61:2401151501CR5000,00NTRF//UTR123456
:86:Payment from Customer
:62F:C240115EUR15000,`;

            const response = await request(app.getHttpServer())
                .post('/reconciliation/parse-statement/acc-1')
                .send({
                    content: mt940Content,
                    format: 'MT940',
                })
                .expect(201);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should parse CSV statement', async () => {
            const csvContent = `Date,Description,Amount,Type,UTR
2024-01-15,Payment received,10000,CR,UTR123456
2024-01-16,Transfer out,5000,DR,UTR789012`;

            const response = await request(app.getHttpServer())
                .post('/reconciliation/parse-csv/acc-1')
                .send({ csvContent })
                .expect(201);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('E2E: Suspense Handling Workflow', () => {
        it('should move unmatched transaction to suspense', async () => {
            // Step 1: Create unmatched transaction  scenario
            const importResponse = await request(app.getHttpServer())
                .post('/bank-feed/import/acc-1')
                .send({
                    transactions: [
                        {
                            date: new Date(),
                            amount: 999.99,
                            type: 'credit',
                            description: 'Unknown deposit',
                        },
                    ],
                })
                .expect(201);

            if (importResponse.body.length > 0) {
                const txnId = importResponse.body[0].id;

                // Step 2: Move to suspense
                const suspenseResponse = await request(app.getHttpServer())
                    .post(`/reconciliation/suspense/${txnId}`)
                    .send({
                        accountId: 'suspense-acc',
                        userId: 'user-123',
                    })
                    .expect(201);

                expect(suspenseResponse.body).toBeDefined();
            }
        });
    });

    describe('E2E: Multi-Currency GL Workflow', () => {
        it('should handle multi-currency journal entries', async () => {
            const response = await request(app.getHttpServer())
                .post('/gl-posting/entry')
                .send({
                    tenantId: 'tenant-1',
                    entryDate: new Date(),
                    description: 'Multi-currency transaction',
                    entries: [
                        { entryType: 'debit', amount: 1000, glAccountId: 'acc-usd', description: 'USD Cash' },
                        { entryType: 'credit', amount: 1000, glAccountId: 'acc-inr', description: 'INR Equivalent' },
                    ],
                    metadata: {
                        baseCurrency: 'USD',
                        targetCurrency: 'INR',
                        exchangeRate: 83.45,
                    },
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
        });
    });

    describe('E2E: Batch Reconciliation Workflow', () => {
        it('should handle batch reconciliation efficiently', async () => {
            // Import multiple transactions
            const importResponse = await request(app.getHttpServer())
                .post('/bank-feed/import/acc-1')
                .send({
                    transactions: Array(5).fill(null).map((_, i) => ({
                        date: new Date(),
                        amount: 1000 * (i + 1),
                        type: i % 2 === 0 ? 'credit' : 'debit',
                        description: `Transaction ${i}`,
                        utrNumber: `UTR${i}`,
                    })),
                })
                .expect(201);

            expect(importResponse.body).toBeDefined();

            // Run batch reconciliation
            const reconResponse = await request(app.getHttpServer())
                .post('/reconciliation/run/tenant-1')
                .expect(201);

            expect(reconResponse.body.totalProcessed).toBeGreaterThanOrEqual(5);
        });
    });

    describe('E2E: Error Scenarios', () => {
        it('should handle invalid journal entry', async () => {
            await request(app.getHttpServer())
                .post('/gl-posting/entry')
                .send({
                    tenantId: 'tenant-1',
                    entries: [
                        { entryType: 'debit', amount: 10000, glAccountId: 'acc-1' },
                        { entryType: 'credit', amount: 8000, glAccountId: 'acc-2' }, // Unbalanced
                    ],
                })
                .expect(400);
        });

        it('should handle missing bank account', async () => {
            await request(app.getHttpServer())
                .post('/bank-feed/import/invalid-account')
                .send({ transactions: [] })
                .expect(404);
        });
    });
});
