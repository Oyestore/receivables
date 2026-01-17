import { Test, TestingModule } from '@nestjs/testing';
import { INest Application } from '@nestjs/common';
import * as request from 'supertest';
import { ReconciliationController } from '../reconciliation.controller';
import { ReconciliationService } from '../../services/reconciliation.service';
import { SuspenseService } from '../../services/suspense.service';
import { AiFuzzyMatchingService } from '../../services/ai-fuzzy-matching.service';
import { TransactionParserService } from '../../services/transaction-parser.service';

describe('ReconciliationController (E2E)', () => {
    let app: INestApplication;
    let reconciliationService: ReconciliationService;
    let suspenseService: SuspenseService;
    let aiFuzzyMatchingService: AiFuzzyMatchingService;
    let transactionParserService: TransactionParserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReconciliationController],
            providers: [
                {
                    provide: ReconciliationService,
                    useValue: {
                        runAutoReconciliation: jest.fn(),
                        runAiReconciliation: jest.fn(),
                        getReconciliationAnalytics: jest.fn(),
                    },
                },
                {
                    provide: SuspenseService,
                    useValue: {
                        moveToSuspense: jest.fn(),
                    },
                },
                {
                    provide: AiFuzzyMatchingService,
                    useValue: {
                        findFuzzyMatches: jest.fn(),
                        findPredictiveMatches: jest.fn(),
                    },
                },
                {
                    provide: TransactionParserService,
                    useValue: {
                        parseStatement: jest.fn(),
                        parseCsvStatement: jest.fn(),
                    },
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        reconciliationService = module.get<ReconciliationService>(ReconciliationService);
        suspenseService = module.get<SuspenseService>(SuspenseService);
        aiFuzzyMatchingService = module.get<AiFuzzyMatchingService>(AiFuzzyMatchingService);
        transactionParserService = module.get<TransactionParserService>(TransactionParserService);
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /reconciliation/run/:tenantId', () => {
        it('should run auto reconciliation', async () => {
            const mockResult = {
                totalProcessed: 10,
                matchesFound: 8,
                exactMatches: 5,
                fuzzyMatches: 3,
                predictive Matches: 0,
                unmatched: 2,
                matchRate: 80,
            };

            jest.spyOn(reconciliationService, 'runAutoReconciliation').mockResolvedValue(mockResult);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/run/tenant-1')
                .expect(201);

            expect(response.body).toEqual(mockResult);
            expect(reconciliationService.runAutoReconciliation).toHaveBeenCalledWith('tenant-1');
        });
    });

    describe('POST /reconciliation/ai-enhanced/:tenantId', () => {
        it('should run AI-enhanced reconciliation', async () => {
            const config = { minConfidence: 0.75 };
            const mockResult = {
                totalTransactions: 5,
                results: [],
                summary: { highConfidenceMatches: 3, requiresManualReview: 2 },
            };

            jest.spyOn(reconciliationService, 'runAiReconciliation').mockResolvedValue(mockResult);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/ai-enhanced/tenant-1')
                .send(config)
                .expect(201);

            expect(response.body).toEqual(mockResult);
        });
    });

    describe('POST /reconciliation/suspense/:txnId', () => {
        it('should move transaction to suspense', async () => {
            const mockResult = { id: 'suspense-1', transactionId: 'txn-1' };

            jest.spyOn(suspenseService, 'moveToSuspense').mockResolvedValue(mockResult as any);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/suspense/txn-1')
                .send({ accountId: 'acc-1', userId: 'user-1' })
                .expect(201);

            expect(response.body).toEqual(mockResult);
        });
    });

    describe('POST /reconciliation/parse-statement/:bankAccountId', () => {
        it('should parse bank statement', async () => {
            const mockResult = [{ id: 'txn-1', amount: 10000 }];

            jest.spyOn(transactionParserService, 'parseStatement').mockResolvedValue(mockResult as any);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/parse-statement/acc-1')
                .send({ content: 'statement content', format: 'MT940' })
                .expect(201);

            expect(response.body).toEqual(mockResult);
        });
    });

    describe('POST /reconciliation/parse-csv/:bankAccountId', () => {
        it('should parse CSV statement', async () => {
            const mockResult = [{ id: 'txn-1', amount: 5000 }];

            jest.spyOn(transactionParserService, 'parseCsvStatement').mockResolvedValue(mockResult as any);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/parse-csv/acc-1')
                .send({ csvContent: 'Date,Amount\n2024-01-15,5000' })
                .expect(201);

            expect(response.body).toEqual(mockResult);
        });
    });

    describe('GET /reconciliation/analytics/:tenantId', () => {
        it('should get reconciliation analytics', async () => {
            const mockAnalytics = {
                totalMatches: 100,
                matchTypeDistribution: { exact: 60, fuzzy: 30, predictive: 10 },
                averageConfidence: 0.85,
            };

            jest.spyOn(reconciliationService, 'getReconciliationAnalytics').mockResolvedValue(mockAnalytics);

            const response = await request(app.getHttpServer())
                .get('/reconciliation/analytics/tenant-1')
                .expect(200);

            expect(response.body).toEqual(mockAnalytics);
        });

        it('should handle date range query parameters', async () => {
            jest.spyOn(reconciliationService, 'getReconciliationAnalytics').mockResolvedValue({} as any);

            await request(app.getHttpServer())
                .get('/reconciliation/analytics/tenant-1?startDate=2024-01-01&endDate=2024-01-31')
                .expect(200);

            expect(reconciliationService.getReconciliationAnalytics).toHaveBeenCalledWith(
                'tenant-1',
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );
        });
    });

    describe('POST /reconciliation/fuzzy-match/:transactionId', () => {
        it('should find fuzzy matches', async () => {
            const mockMatches = [
                { glEntry: { id: 'gl-1' }, confidenceScore: 0.9, matchType: 'fuzzy' },
            ];

            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue(mockMatches as any);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/fuzzy-match/txn-1')
                .expect(201);

            expect(response.body).toEqual(mockMatches);
        });
    });

    describe('POST /reconciliation/predictive-match/:transactionId', () => {
        it('should find predictive matches', async () => {
            const mockMatches = [
                { glEntry: { id: 'gl-1' }, confidenceScore: 0.85, matchType: 'predictive' },
            ];

            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue(mockMatches as any);

            const response = await request(app.getHttpServer())
                .post('/reconciliation/predictive-match/txn-1')
                .expect(201);

            expect(response.body).toEqual(mockMatches);
        });
    });
});
