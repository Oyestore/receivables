import { Test, TestingModule } from '@nestjs/testing';
import { GlPostingService } from '../gl-posting.service';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JournalEntry } from '../../entities/journal-entry.entity';
import { GlEntry } from '../../entities/gl-entry.entity';
import { GlAccount } from '../../entities/gl-account.entity';
import { BadRequestException } from '@nestjs/common';

describe('GlPostingService', () => {
    let service: GlPostingService;
    let journalEntryRepo: Repository<JournalEntry>;
    let glEntryRepo: Repository<GlEntry>;
    let glAccountRepo: Repository<GlAccount>;
    let dataSource: DataSource;
    let mockManager: Partial<EntityManager>;

    beforeEach(async () => {
        mockManager = {
            create: jest.fn((entity, data) => ({ ...data } as any)),
            save: jest.fn((entity, data) => Promise.resolve({ ...data, id: 'generated-id' } as any)),
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GlPostingService,
                {
                    provide: getRepositoryToken(JournalEntry),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(GlEntry),
                    useValue: {
                        find: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(GlAccount),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        transaction: jest.fn((callback) => callback(mockManager)),
                    },
                },
            ],
        }).compile();

        service = module.get<GlPostingService>(GlPostingService);
        journalEntryRepo = module.get<Repository<JournalEntry>>(getRepositoryToken(JournalEntry));
        glEntryRepo = module.get<Repository<GlEntry>>(getRepositoryToken(GlEntry));
        glAccountRepo = module.get<Repository<GlAccount>>(getRepositoryToken(GlAccount));
        dataSource = module.get<DataSource>(DataSource);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createEntry', () => {
        it('should create balanced journal entry successfully', async () => {
            const journalData = {
                tenantId: 'tenant-1',
                entryDate: new Date('2024-01-15'),
                description: 'Payment received',
            };

            const entries = [
                { entryType: 'debit', amount: 10000, glAccountId: 'acc-1', description: 'Cash' },
                { entryType: 'credit', amount: 10000, glAccountId: 'acc-2', description: 'Revenue' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result).toBeDefined();
            expect(mockManager.create).toHaveBeenCalled();
            expect(mockManager.save).toHaveBeenCalled();
        });

        it('should reject unbalanced entry', async () => {
            const journalData = {
                tenantId: 'tenant-1',
                entryDate: new Date(),
                description: 'Unbalanced entry',
            };

            const entries = [
                { entryType: 'debit', amount: 10000, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 8000, glAccountId: 'acc-2' }, // Unbalanced
            ];

            await expect(service.createEntry(journalData, entries)).rejects.toThrow(BadRequestException);
        });

        it('should handle multi-line entries', async () => {
            const journalData = {
                tenantId: 'tenant-1',
                entryDate: new Date(),
                description: 'Complex transaction',
            };

            const entries = [
                { entryType: 'debit', amount: 5000, glAccountId: 'acc-1' },
                { entryType: 'debit', amount: 3000, glAccountId: 'acc-2' },
                { entryType: 'credit', amount: 8000, glAccountId: 'acc-3' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result).toBeDefined();
            expect(result.totalDebit).toBe(8000);
            expect(result.totalCredit).toBe(8000);
        });

        it('should set default status to draft', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Test' };
            const entries = [
                { entryType: 'debit', amount: 1000, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 1000, glAccountId: 'acc-2' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(mockManager.create).toHaveBeenCalledWith(
                JournalEntry,
                expect.objectContaining({ status: 'draft' })
            );
        });

        it('should generate entry number', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Test' };
            const entries = [
                { entryType: 'debit', amount: 1000, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 1000, glAccountId: 'acc-2' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(mockManager.create).toHaveBeenCalledWith(
                JournalEntry,
                expect.objectContaining({ entryNumber: expect.stringContaining('JE-') })
            );
        });

        it('should handle decimal precision correctly', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Test' };
            const entries = [
                { entryType: 'debit', amount: 10000.50, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 10000.49, glAccountId: 'acc-2' },
            ];

            // Should fail due to > 0.01 difference
            await expect(service.createEntry(journalData, entries)).rejects.toThrow(BadRequestException);
        });

        it('should allow tolerance within 0.01', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Test' };
            const entries = [
                { entryType: 'debit', amount: 10000.50, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 10000.50, glAccountId: 'acc-2' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result).toBeDefined();
        });
    });

    describe('postEntry', () => {
        it('should post draft entry successfully', async () => {
            const mockEntry = {
                id: 'entry-1',
                status: 'draft',
                entries: [
                    { glAccountId: 'acc-1', entryType: 'debit', amount: 5000 },
                    { glAccountId: 'acc-2', entryType: 'credit', amount: 5000 },
                ],
            };

            const mockAccount1 = {
                id: 'acc-1',
                normalBalance: 'debit',
                currentBalance: 10000,
            };

            const mockAccount2 = {
                id: 'acc-2',
                normalBalance: 'credit',
                currentBalance: 20000,
            };

            (mockManager.findOne as jest.Mock)
                .mockResolvedValueOnce(mockEntry)
                .mockResolvedValueOnce(mockAccount1)
                .mockResolvedValueOnce(mockAccount2);

            const result = await service.postEntry('entry-1', 'user-123');

            expect(result.status).toBe('posted');
            expect(mockManager.save).toHaveBeenCalled();
        });

        it('should prevent posting already posted entry', async () => {
            const mockEntry = {
                id: 'entry-1',
                status: 'posted',
                entries: [],
            };

            (mockManager.findOne as jest.Mock).mockResolvedValueOnce(mockEntry);

            await expect(service.postEntry('entry-1', 'user-123')).rejects.toThrow('Entry already posted');
        });

        it('should update account balances for debit normal balance accounts', async () => {
            const mockEntry = {
                id: 'entry-1',
                status: 'draft',
                entries: [
                    { glAccountId: 'acc-cash', entryType: 'debit', amount: 5000 },
                    { glAccountId: 'acc-revenue', entryType: 'credit', amount: 5000 },
                ],
            };

            const mockCashAccount = {
                id: 'acc-cash',
                normalBalance: 'debit',
                currentBalance: 10000,
            };

            const mockRevenueAccount = {
                id: 'acc-revenue',
                normalBalance: 'credit',
                currentBalance: 50000,
            };

            (mockManager.findOne as jest.Mock)
                .mockResolvedValueOnce(mockEntry)
                .mockResolvedValueOnce(mockCashAccount)
                .mockResolvedValueOnce(mockRevenueAccount);

            await service.postEntry('entry-1', 'user-123');

            // Cash (debit normal) + debit = increase
            expect(mockManager.save).toHaveBeenCalledWith(
                GlAccount,
                expect.objectContaining({ currentBalance: 15000 })
            );

            // Revenue (credit normal) + credit = increase
            expect(mockManager.save).toHaveBeenCalledWith(
                GlAccount,
                expect.objectContaining({ currentBalance: 55000 })
            );
        });

        it('should handle entry not found', async () => {
            (mockManager.findOne as jest.Mock).mockResolvedValueOnce(null);

            await expect(service.postEntry('invalid-id', 'user-123')).rejects.toThrow('Entry not found');
        });

        it('should handle account not found', async () => {
            const mockEntry = {
                id: 'entry-1',
                status: 'draft',
                entries: [{ glAccountId: 'invalid-acc', entryType: 'debit', amount: 5000 }],
            };

            (mockManager.findOne as jest.Mock)
                .mockResolvedValueOnce(mockEntry)
                .mockResolvedValueOnce(null);

            await expect(service.postEntry('entry-1', 'user-123')).rejects.toThrow('Account invalid-acc not found');
        });

        it('should set posted timestamp and user', async () => {
            const mockEntry = {
                id: 'entry-1',
                status: 'draft',
                entries: [
                    { glAccountId: 'acc-1', entryType: 'debit', amount: 1000 },
                ],
            };

            const mockAccount = {
                id: 'acc-1',
                normalBalance: 'debit',
                currentBalance: 5000,
            };

            (mockManager.findOne as jest.Mock)
                .mockResolvedValueOnce(mockEntry)
                .mockResolvedValueOnce(mockAccount);

            const result = await service.postEntry('entry-1', 'user-456');

            expect(result.postedBy).toBe('user-456');
            expect(result.postedAt).toBeDefined();
        });
    });

    describe('getTrialBalance', () => {
        it('should return all accounts for tenant', async () => {
            const mockAccounts = [
                { id: '1', accountName: 'Cash', currentBalance: 50000 },
                { id: '2', accountName: 'Revenue', currentBalance: 100000 },
            ];

            jest.spyOn(glAccountRepo, 'find').mockResolvedValueOnce(mockAccounts as any);

            const result = await service.getTrialBalance('tenant-1');

            expect(result).toHaveLength(2);
            expect(glAccountRepo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
        });

        it('should handle empty trial balance', async () => {
            jest.spyOn(glAccountRepo, 'find').mockResolvedValueOnce([]);

            const result = await service.getTrialBalance('tenant-1');

            expect(result).toHaveLength(0);
        });
    });

    describe('Double-Entry Validation Edge Cases', () => {
        it('should handle zero amount entries', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Zero test' };
            const entries = [
                { entryType: 'debit', amount: 0, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 0, glAccountId: 'acc-2' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result.isBalanced).toBe(true);
        });

        it('should handle large amounts', async () => {
            const journalData = { ten antId: 'tenant-1', entryDate: new Date(), description: 'Large amount' };
            const entries = [
                { entryType: 'debit', amount: 999999.99, glAccountId: 'acc-1' },
                { entryType: 'credit', amount: 999999.99, glAccountId: 'acc-2' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result.totalDebit).toBe(999999.99);
        });

        it('should handle multiple debits one credit', async () => {
            const journalData = { tenantId: 'tenant-1', entryDate: new Date(), description: 'Split debit' };
            const entries = [
                { entryType: 'debit', amount: 3000, glAccountId: 'acc-1' },
                { entryType: 'debit', amount: 2000, glAccountId: 'acc-2' },
                { entryType: 'debit', amount: 1000, glAccountId: 'acc-3' },
                { entryType: 'credit', amount: 6000, glAccountId: 'acc-4' },
            ];

            const result = await service.createEntry(journalData, entries);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(6000);
        });
    });
});
