import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../reconciliation.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankTransaction } from '../../entities/bank-transaction.entity';
import { ReconciliationMatch } from '../../entities/reconciliation-match.entity';
import { AiFuzzyMatchingService } from '../ai-fuzzy-matching.service';
import { Logger } from '@nestjs/common';

describe('ReconciliationService', () => {
    let service: ReconciliationService;
    let bankTransactionRepo: Repository<BankTransaction>;
    let matchRepo: Repository<ReconciliationMatch>;
    let aiFuzzyMatchingService: AiFuzzyMatchingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReconciliationService,
                {
                    provide: getRepositoryToken(BankTransaction),
                    useValue: {
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                        })),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(ReconciliationMatch),
                    useValue: {
                        create: jest.fn((data) => data),
                        save: jest.fn((data) => Promise.resolve({ ...data, id: 'match-id' })),
                        createQueryBuilder: jest.fn(() => ({
                            leftJoin: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            select: jest.fn().mockReturnThis(),
                            addSelect: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                            getRawMany: jest.fn().mockResolvedValue([]),
                        })),
                    },
                },
                {
                    provide: AiFuzzyMatchingService,
                    useValue: {
                        findFuzzyMatches: jest.fn(),
                        findPredictiveMatches: jest.fn(),
                        learnFromMatch: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ReconciliationService>(ReconciliationService);
        bankTransactionRepo = module.get<Repository<BankTransaction>>(getRepositoryToken(BankTransaction));
        matchRepo = module.get<Repository<ReconciliationMatch>>(getRepositoryToken(ReconciliationMatch));
        aiFuzzyMatchingService = module.get<AiFuzzyMatchingService>(AiFuzzyMatchingService);

        // Suppress logger output in tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('runAutoReconciliation', () => {
        it('should successfully match transactions with high confidence', async () => {
            const mockTransaction = {
                id: 'txn-1',
                amount: 10000,
                description: 'Payment received',
                reconciliationStatus: 'pending',
            };

            const mockMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.95,
                matchType: 'fuzzy',
                matchingCriteria: ['amount', 'description'],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([mockMatch] as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([]);

            const result = await service.runAutoReconciliation('tenant-1');

            expect(result.totalProcessed).toBe(1);
            expect(result.matchesFound).toBe(1);
            expect(result.fuzzyMatches).toBe(1);
            expect(matchRepo.save).toHaveBeenCalled();
            expect(bankTransactionRepo.save).toHaveBeenCalled();
        });

        it('should use predictive matching when fuzzy confidence is low', async () => {
            const mockTransaction = {
                id: 'txn-1',
                amount: 10000,
                reconciliationStatus: 'pending',
            };

            const lowConfidenceFuzzy = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.6,
                matchType: 'fuzzy',
                matchingCriteria: ['amount'],
            };

            const highConfidencePredictive = {
                glEntry: { id: 'gl-2' },
                confidenceScore: 0.85,
                matchType: 'predictive',
                matchingCriteria: ['pattern'],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([lowConfidenceFuzzy] as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([highConfidencePredictive] as any);

            const result = await service.runAutoReconciliation('tenant-1');

            expect(result.predictiveMatches).toBe(1);
        });

        it('should mark transactions as unmatched when confidence is below threshold', async () => {
            const mockTransaction = {
                id: 'txn-1',
                amount: 10000,
                reconciliationStatus: 'pending',
            };

            const lowConfidenceMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.5, // Below 0.7 threshold
                matchType: 'fuzzy',
                matchingCriteria: [],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([lowConfidenceMatch] as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([]);

            const result = await service.runAutoReconciliation('tenant-1');

            expect(result.unmatched).toBe(1);
            expect(bankTransactionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ reconciliationStatus: 'unmatched' })
            );
        });

        it('should handle errors gracefully and continue processing', async () => {
            const mockTransactions = [
                { id: 'txn-1', reconciliationStatus: 'pending' },
                { id: 'txn-2', reconciliationStatus: 'pending' },
            ];

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockTransactions),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches')
                .mockRejectedValueOnce(new Error('AI service error'))
                .mockResolvedValueOnce([]);

            const result = await service.runAutoReconciliation('tenant-1');

            expect(result.totalProcessed).toBe(2);
            expect(result.unmatched).toBe(2);
        });

        it('should call learnFromMatch for successful matches', async () => {
            const mockTransaction = { id: 'txn-1', reconciliationStatus: 'pending' };
            const mockMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.95,
                matchType: 'fuzzy',
                matchingCriteria: ['amount'],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([mockMatch] as any);

            await service.runAutoReconciliation('tenant-1');

            expect(aiFuzzyMatchingService.learnFromMatch).toHaveBeenCalled();
        });

        it('should calculate match rate correctly', async () => {
            const mockTransactions = Array(10).fill(null).map((_, i) => ({
                id: `txn-${i}`,
                reconciliationStatus: 'pending',
            }));

            const mockMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.95,
                matchType: 'fuzzy',
                matchingCriteria: [],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockTransactions),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([mockMatch] as any);

            const result = await service.runAutoReconciliation('tenant-1');

            expect(result.matchRate).toBe(100); // All matched
        });
    });

    describe('runAiReconciliation', () => {
        it('should return top 5 matches for each transaction', async () => {
            const mockTransaction = { id: 'txn-1', amount: 10000, description: 'Payment', reconciliationStatus: 'pending' };

            const mockMatches = Array(10).fill(null).map((_, i) => ({
                glEntry: { id: `gl-${i}` },
                confidenceScore: 0.9 - (i * 0.05),
                matchType: 'fuzzy',
                matchingCriteria: ['amount'],
            }));

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue(mockMatches as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([]);

            const result = await service.runAiReconciliation('tenant-1');

            expect(result.results[0].matches).toHaveLength(5);
        });

        it('should recommend auto_match for high confidence', async () => {
            const mockTransaction = { id: 'txn-1', reconciliationStatus: 'pending' };
            const mockMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.95,
                matchType: 'fuzzy',
                matchingCriteria: [],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([mockMatch] as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([]);

            const result = await service.runAiReconciliation('tenant-1');

            expect(result.results[0].recommendedAction).toBe('auto_match');
        });

        it('should recommend manual_review for low confidence', async () => {
            const mockTransaction = { id: 'txn-1', reconciliationStatus: 'pending' };
            const mockMatch = {
                glEntry: { id: 'gl-1' },
                confidenceScore: 0.6,
                matchType: 'fuzzy',
                matchingCriteria: [],
            };

            const queryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTransaction]),
            };

            jest.spyOn(bankTransactionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(aiFuzzyMatchingService, 'findFuzzyMatches').mockResolvedValue([mockMatch] as any);
            jest.spyOn(aiFuzzyMatchingService, 'findPredictiveMatches').mockResolvedValue([]);

            const result = await service.runAiReconciliation('tenant-1');

            expect(result.results[0].recommendedAction).toBe('manual_review');
        });
    });

    describe('getReconciliationAnalytics', () => {
        it('should return comprehensive analytics', async () => {
            const mockMatches = [
                { matchType: 'exact', confidenceScore: 1.0, isAutoMatched: true },
                { matchType: 'fuzzy', confidenceScore: 0.9, isAutoMatched: true },
                { matchType: 'predictive', confidenceScore: 0.8, isAutoMatched: true },
                { matchType: 'manual', confidenceScore: null, isAutoMatched: false },
            ];

            const queryBuilder = {
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockMatches),
            };

            jest.spyOn(matchRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(service as any, 'getDailyMatchingTrend').mockResolvedValue([]);

            const result = await service.getReconciliationAnalytics('tenant-1');

            expect(result.totalMatches).toBe(4);
            expect(result.matchTypeDistribution.exact).toBe(1);
            expect(result.matchTypeDistribution.fuzzy).toBe(1);
            expect(result.matchTypeDistribution.predictive).toBe(1);
            expect(result.matchTypeDistribution.manual).toBe(1);
        });

        it('should handle date range filtering', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const queryBuilder = {
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(matchRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(service as any, 'getDailyMatchingTrend').mockResolvedValue([]);

            await service.getReconciliationAnalytics('tenant-1', startDate, endDate);

            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'match.createdAt BETWEEN :startDate AND :endDate',
                { startDate, endDate }
            );
        });

        it('should calculate average confidence correctly', async () => {
            const mockMatches = [
                { confidenceScore: 1.0 },
                { confidenceScore: 0.8 },
                { confidenceScore: 0.6 },
            ];

            const queryBuilder = {
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockMatches),
            };

            jest.spyOn(matchRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(service as any, 'getDailyMatchingTrend').mockResolvedValue([]);

            const result = await service.getReconciliationAnalytics('tenant-1');

            expect(result.averageConfidence).toBeCloseTo(0.8, 1);
        });

        it('should calculate auto-matched rate', async () => {
            const mockMatches = Array(10).fill({ isAutoMatched: true })
                .concat(Array(5).fill({ isAutoMatched: false }));

            const queryBuilder = {
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockMatches),
            };

            jest.spyOn(matchRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
            jest.spyOn(service as any, 'getDailyMatchingTrend').mockResolvedValue([]);

            const result = await service.getReconciliationAnalytics('tenant-1');

            expect(result.autoMatchedRate).toBeCloseTo(66.67, 1);
        });
    });
});
