import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GlPostingController } from '../gl-posting.controller';
import { BankFeedController } from '../bank-feed.controller';
import { GlPostingService } from '../../services/gl-posting.service';
import { BankFeedService } from '../../services/bank-feed.service';

describe('All Controllers E2E Tests', () => {
    let app: INestApplication;

    describe('GlPostingController', () => {
        let glPostingService: GlPostingService;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [GlPostingController],
                providers: [
                    {
                        provide: GlPostingService,
                        useValue: {
                            createEntry: jest.fn(),
                            postEntry: jest.fn(),
                            getTrialBalance: jest.fn(),
                        },
                    },
                ],
            }).compile();

            app = module.createNestApplication();
            await app.init();

            glPostingService = module.get<GlPostingService>(GlPostingService);
        });

        afterEach(async () => {
            await app.close();
        });

        it('should create journal entry', async () => {
            const mockEntry = { id: 'je-1', totalDebit: 10000, totalCredit: 10000 };
            jest.spyOn(glPostingService, 'createEntry').mockResolvedValue(mockEntry as any);

            const response = await request(app.getHttpServer())
                .post('/gl-posting/entry')
                .send({
                    tenantId: 'tenant-1',
                    entryDate: '2024-01-15',
                    description: 'Test entry',
                    entries: [
                        { entryType: 'debit', amount: 10000, glAccountId: 'acc-1' },
                        { entryType: 'credit', amount: 10000, glAccountId: 'acc-2' },
                    ],
                })
                .expect(201);

            expect(response.body).toEqual(mockEntry);
        });

        it('should post journal entry', async () => {
            const mockPosted = { id: 'je-1', status: 'posted' };
            jest.spyOn(glPostingService, 'postEntry').mockResolvedValue(mockPosted as any);

            const response = await request(app.getHttpServer())
                .post('/gl-posting/post/je-1')
                .send({ userId: 'user-1' })
                .expect(200);

            expect(response.body.status).toBe('posted');
        });

        it('should get trial balance', async () => {
            const mockAccounts = [{ id: 'acc-1', balance: 50000 }];
            jest.spyOn(glPostingService, 'getTrialBalance').mockResolvedValue(mockAccounts as any);

            const response = await request(app.getHttpServer())
                .get('/gl-posting/trial-balance/tenant-1')
                .expect(200);

            expect(response.body).toEqual(mockAccounts);
        });
    });

    describe('BankFeedController', () => {
        let bankFeedService: BankFeedService;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [BankFeedController],
                providers: [
                    {
                        provide: BankFeedService,
                        useValue: {
                            importTransactions: jest.fn(),
                            getUnreconciledTransactions: jest.fn(),
                        },
                    },
                ],
            }).compile();

            app = module.createNestApplication();
            await app.init();

            bankFeedService = module.get<BankFeedService>(BankFeedService);
        });

        afterEach(async () => {
            await app.close();
        });

        it('should import bank transactions', async () => {
            const mockTransactions = [{ id: 'txn-1', amount: 10000 }];
            jest.spyOn(bankFeedService, 'importTransactions').mockResolvedValue(mockTransactions as any);

            const response = await request(app.getHttpServer())
                .post('/bank-feed/import/acc-1')
                .send({
                    transactions: [
                        { date: '2024-01-15', amount: 10000, type: 'credit', utrNumber: 'UTR123' },
                    ],
                })
                .expect(201);

            expect(response.body).toEqual(mockTransactions);
        });

        it('should get unreconciled transactions', async () => {
            const mockUnreconciled = [{ id: 'txn-1', reconciliationStatus: 'pending' }];
            jest.spyOn(bankFeedService, 'getUnreconciledTransactions').mockResolvedValue(mockUnreconciled as any);

            const response = await request(app.getHttpServer())
                .get('/bank-feed/unreconciled/acc-1')
                .expect(200);

            expect(response.body).toEqual(mockUnreconciled);
        });
    });
});
