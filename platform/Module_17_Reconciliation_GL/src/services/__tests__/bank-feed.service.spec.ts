import { Test, TestingModule } from '@nestjs/testing';
import { BankFeedService } from '../bank-feed.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankAccount } from '../../entities/bank-account.entity';
import { BankTransaction } from '../../entities/bank-transaction.entity';

describe('BankFeedService', () => {
    let service: BankFeedService;
    let bankAccountRepo: Repository<BankAccount>;
    let bankTransactionRepo: Repository<BankTransaction>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BankFeedService,
                {
                    provide: getRepositoryToken(BankAccount),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(BankTransaction),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn((data) => data),
                        save: jest.fn((data) => Promise.resolve({ ...data, id: 'generated-id' })),
                    },
                },
            ],
        }).compile();

        service = module.get<BankFeedService>(BankFeedService);
        bankAccountRepo = module.get<Repository<BankAccount>>(getRepositoryToken(BankAccount));
        bankTransactionRepo = module.get<Repository<BankTransaction>>(getRepositoryToken(BankTransaction));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('importTransactions', () => {
        it('should import new transactions successfully', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date() };
            const transactions = [
                {
                    date: new Date('2024-01-15'),
                    amount: 10000,
                    type: 'credit',
                    description: 'NEFT payment from customer',
                    utrNumber: 'UTR123456',
                },
            ];

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);
            jest.spyOn(bankTransactionRepo, 'findOne').mockResolvedValueOnce(null);

            const result = await service.importTransactions('acc-1', transactions);

            expect(result).toHaveLength(1);
            expect(bankTransactionRepo.create).toHaveBeenCalled();
            expect(bankTransactionRepo.save).toHaveBeenCalled();
            expect(bankAccountRepo.save).toHaveBeenCalled();
        });

        it('should skip duplicate transactions', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date() };
            const transactions = [
                { date: new Date(), amount: 10000, type: 'credit', utrNumber: 'UTR123', description: 'Payment' },
                { date: new Date(), amount: 5000, type: 'debit', utrNumber: 'UTR456', description: 'Transfer' },
            ];

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);
            // First exists, second doesn't
            jest.spyOn(bankTransactionRepo, 'findOne')
                .mockResolvedValueOnce({ id: 'existing' } as any)
                .mockResolvedValueOnce(null);

            const result = await service.importTransactions('acc-1', transactions);

            expect(result).toHaveLength(1); // Only one imported
            expect(bankTransactionRepo.save).toHaveBeenCalledTimes(1);
        });

        it('should throw error if bank account not found', async () => {
            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(null);

            await expect(
                service.importTransactions('invalid-id', [])
            ).rejects.toThrow('Bank account not found');
        });

        it('should set reconciliation status to pending', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date() };
            const transactions = [
                { date: new Date(), amount: 10000, type: 'credit', utrNumber: 'UTR123', description: 'Payment' },
            ];

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);
            jest.spyOn(bankTransactionRepo, 'findOne').mockResolvedValueOnce(null);

            await service.importTransactions('acc-1', transactions);

            expect(bankTransactionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ reconciliationStatus: 'pending' })
            );
        });

        it('should update last sync time', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date('2024-01-01') };
            const transactions = [];

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);

            await service.importTransactions('acc-1', transactions);

            expect(bankAccountRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastSyncAt: expect.any(Date),
                })
            );
        });

        it('should handle multiple transactions in batch', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date() };
            const transactions = Array(10).fill(null).map((_, i) => ({
                date: new Date(),
                amount: 1000 * (i + 1),
                type: i % 2 === 0 ? 'credit' : 'debit',
                utrNumber: `UTR${i}`,
                description: `Transaction ${i}`,
            }));

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);
            jest.spyOn(bankTransactionRepo, 'findOne').mockResolvedValue(null);

            const result = await service.importTransactions('acc-1', transactions);

            expect(result).toHaveLength(10);
            expect(bankTransactionRepo.save).toHaveBeenCalledTimes(10);
        });

        it('should parse transaction description', async () => {
            const mockAccount = { id: 'acc-1', lastSyncAt: new Date() };
            const transactions = [
                {
                    date: new Date(),
                    amount: 10000,
                    type: 'credit',
                    utrNumber: 'UTR123',
                    description: 'NEFT-INB-123456-Customer Payment-REF789',
                },
            ];

            jest.spyOn(bankAccountRepo, 'findOne').mockResolvedValueOnce(mockAccount as any);
            jest.spyOn(bankTransactionRepo, 'findOne').mockResolvedValueOnce(null);

            await service.importTransactions('acc-1', transactions);

            expect(bankTransactionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    parsedData: expect.any(Object),
                })
            );
        });
    });

    describe('getUnreconciledTransactions', () => {
        it('should return all pending transactions for account', async () => {
            const mockTransactions = [
                { id: '1', amount: 10000, reconciliationStatus: 'pending' },
                { id: '2', amount: 5000, reconciliationStatus: 'pending' },
            ];

            jest.spyOn(bankTransactionRepo, 'find').mockResolvedValueOnce(mockTransactions as any);

            const result = await service.getUnreconciledTransactions('acc-1');

            expect(result).toHaveLength(2);
            expect(bankTransactionRepo.find).toHaveBeenCalledWith({
                where: {
                    bankAccountId: 'acc-1',
                    reconciliationStatus: 'pending',
                },
            });
        });

        it('should return empty array if all reconciled', async () => {
            jest.spyOn(bankTransactionRepo, 'find').mockResolvedValueOnce([]);

            const result = await service.getUnreconciledTransactions('acc-1');

            expect(result).toHaveLength(0);
        });
    });
});
