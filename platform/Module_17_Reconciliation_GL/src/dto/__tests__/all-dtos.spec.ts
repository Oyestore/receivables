import { validate } from 'class-validator';
import { CreateJournalEntryDto } from '../create-journal-entry.dto';
import { CreateBankFeedDto } from '../create-bank-feed.dto';
import { CreateReconciliationMatchDto } from '../create-reconciliation-match.dto';

describe('Module 17 DTO Validation Tests', () => {
    describe('CreateJournalEntryDto', () => {
        it('should validate correct journal entry DTO', async () => {
            const dto = new CreateJournalEntryDto();
            dto.tenantId = 'tenant-1';
            dto.entryDate = new Date();
            dto.description = 'Payment received';
            dto.entries = [
                { entryType: 'debit', amount: 10000, glAccountId: 'acc-1', description: 'Cash' },
                { entryType: 'credit', amount: 10000, glAccountId: 'acc-2', description: 'Revenue' },
            ];

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail without tenantId', async () => {
            const dto = new CreateJournalEntryDto();
            dto.entryDate = new Date();
            dto.description = 'Test';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail without entries', async () => {
            const dto = new CreateJournalEntryDto();
            dto.tenantId = 'tenant-1';
            dto.entryDate = new Date();
            dto.description = 'Test';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail with empty description', async () => {
            const dto = new CreateJournalEntryDto();
            dto.tenantId = 'tenant-1';
            dto.entryDate = new Date();
            dto.description = '';

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'description')).toBe(true);
        });
    });

    describe('CreateBankFeedDto', () => {
        it('should validate correct bank feed DTO', async () => {
            const dto = new CreateBankFeedDto();
            dto.bankAccountId = 'acc-1';
            dto.transactions = [
                {
                    date: new Date(),
                    amount: 10000,
                    type: 'credit',
                    description: 'Payment',
                    utrNumber: 'UTR123',
                },
            ];

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail without bankAccountId', async () => {
            const dto = new CreateBankFeedDto();
            dto.transactions = [];

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'bankAccountId')).toBe(true);
        });

        it('should fail with empty transactions array', async () => {
            const dto = new CreateBankFeedDto();
            dto.bankAccountId = 'acc-1';
            dto.transactions = [];

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'transactions')).toBe(true);
        });

        it('should validate transaction type enum', async () => {
            const dto = new CreateBankFeedDto();
            dto.bankAccountId = 'acc-1';
            dto.transactions = [
                {
                    date: new Date(),
                    amount: 10000,
                    type: 'invalid' as any,
                    description: 'Test',
                },
            ];

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('CreateReconciliationMatchDto', () => {
        it('should validate correct reconciliation match DTO', async () => {
            const dto = new CreateReconciliationMatchDto();
            dto.bankTransactionId = 'txn-1';
            dto.invoiceId = 'inv-1';
            dto.matchScore = 95;
            dto.matchType = 'fuzzy';

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail without bankTransactionId', async () => {
            const dto = new CreateReconciliationMatchDto();
            dto.invoiceId = 'inv-1';

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'bankTransactionId')).toBe(true);
        });

        it('should validate matchScore range', async () => {
            const dto = new CreateReconciliationMatchDto();
            dto.bankTransactionId = 'txn-1';
            dto.invoiceId = 'inv-1';
            dto.matchScore = 150; // Invalid: should be 0-100

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'matchScore')).toBe(true);
        });

        it('should validate matchType enum', async () => {
            const dto = new CreateReconciliationMatchDto();
            dto.bankTransactionId = 'txn-1';
            dto.invoiceId = 'inv-1';
            dto.matchType = 'invalid' as any;

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should accept valid match types', async () => {
            const validTypes = ['exact', 'fuzzy', 'predictive', 'manual'];

            for (const type of validTypes) {
                const dto = new CreateReconciliationMatchDto();
                dto.bankTransactionId = 'txn-1';
                dto.invoiceId = 'inv-  1';
                dto.matchType = type;

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            }
        });
    });
});
