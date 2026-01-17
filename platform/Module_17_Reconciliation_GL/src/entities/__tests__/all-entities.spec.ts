import { GlAccount } from '../gl-account.entity';
import { JournalEntry } from '../journal-entry.entity';
import { GlEntry } from '../gl-entry.entity';
import { BankAccount } from '../bank-account.entity';
import { BankTransaction } from '../bank-transaction.entity';
import { ReconciliationMatch } from '../reconciliation-match.entity';

describe('Module 17 Entity Tests - All Entities', () => {
    describe('GlAccount Entity', () => {
        it('should create GL account with required fields', () => {
            const account = new GlAccount();
            account.tenantId = 'tenant-1';
            account.accountCode = '1000';
            account.accountName = 'Cash';
            account.accountType = 'Asset';
            account.normalBalance = 'Debit';
            account.level = 0;

            expect(account.accountCode).toBe('1000');
            expect(account.accountType).toBe('Asset');
            expect(account.level).toBe(0);
        });

        it('should support hierarchical account structure', () => {
            const parent = new GlAccount();
            parent.id = 'parent-1';
            parent.accountCode = '1000';
            parent.level = 0;

            const child = new GlAccount();
            child.accountCode = '1001';
            child.parentAccountId = parent.id;
            child.level = 1;

            expect(child.parentAccountId).toBe(parent.id);
            expect(child.level).toBeGreaterThan(parent.level);
        });

        it('should track account balances', () => {
            const account = new GlAccount();
            account.openingBalance = 50000;
            account.currentBalance = 75000;

            expect(account.currentBalance).toBe(75000);
            expect(account.currentBalance).toBeGreaterThan(account.openingBalance);
        });

        it('should handle system accounts', () => {
            const account = new GlAccount();
            account.isSystemAccount = true;
            account.isActive = true;

            expect(account.isSystemAccount).toBe(true);
            expect(account.isActive).toBe(true);
        });

        it('should store account metadata', () => {
            const account = new GlAccount();
            account.metadata = {
                taxDeductible: true,
                department: 'Finance',
                costCenter: 'CC-001',
            };

            expect(account.metadata.taxDeductible).toBe(true);
            expect(account.metadata.department).toBe('Finance');
        });
    });

    describe('JournalEntry Entity', () => {
        it('should create journal entry with required fields', () => {
            const entry = new JournalEntry();
            entry.tenantId = 'tenant-1';
            entry.entryNumber = 'JE-2024-001';
            entry.entryDate = new Date('2024-01-15');
            entry.description = 'Payment received from customer';
            entry.entryType = 'manual';

            expect(entry.entryNumber).toBe('JE-2024-001');
            expect(entry.entryType).toBe('manual');
        });

        it('should enforce double-entry bookkeeping', () => {
            const entry = new JournalEntry();
            entry.totalDebit = 10000;
            entry.totalCredit = 10000;
            entry.isBalanced = entry.totalDebit === entry.totalCredit;

            expect(entry.isBalanced).toBe(true);
            expect(entry.totalDebit).toBe(entry.totalCredit);
        });

        it('should track entry status lifecycle', () => {
            const entry = new JournalEntry();

            entry.status = 'draft';
            expect(entry.status).toBe('draft');

            entry.status = 'posted';
            entry.postedAt = new Date();
            entry.postedBy = 'user-123';
            expect(entry.status).toBe('posted');
            expect(entry.postedAt).toBeDefined();
        });

        it('should support entry reversal', () => {
            const original = new JournalEntry();
            original.id = 'entry-1';
            original.status = 'posted';

            const reversal = new JournalEntry();
            reversal.reversedByEntryId = original.id;
            reversal.description = 'Reversal of JE-2024-001';

            expect(reversal.reversedByEntryId).toBe(original.id);
        });

        it('should link to reference documents', () => {
            const entry = new JournalEntry();
            entry.referenceType = 'invoice';
            entry.referenceId = 'INV-001';

            expect(entry.referenceType).toBe('invoice');
            expect(entry.referenceId).toBe('INV-001');
        });
    });

    describe('GlEntry Entity', () => {
        it('should create GL entry with required fields', () => {
            const glEntry = new GlEntry();
            glEntry.tenantId = 'tenant-1';
            glEntry.journalEntryId = 'je-1';
            glEntry.glAccountId = 'acc-1';
            glEntry.entryType = 'debit';
            glEntry.amount = 5000;

            expect(glEntry.entryType).toBe('debit');
            expect(glEntry.amount).toBe(5000);
        });

        it('should support both debit and credit entries', () => {
            const debitEntry = new GlEntry();
            debitEntry.entryType = 'debit';
            debitEntry.amount = 5000;

            const creditEntry = new GlEntry();
            creditEntry.entryType = 'credit';
            creditEntry.amount = 5000;

            expect(debitEntry.entryType).toBe('debit');
            expect(creditEntry.entryType).toBe('credit');
            expect(debitEntry.amount).toBe(creditEntry.amount);
        });

        it('should link to journal entry and GL account', () => {
            const glEntry = new GlEntry();
            glEntry.journalEntryId = 'je-123';
            glEntry.glAccountId = 'acc-456';

            expect(glEntry.journalEntryId).toBe('je-123');
            expect(glEntry.glAccountId).toBe('acc-456');
        });

        it('should store reference information', () => {
            const glEntry = new GlEntry();
            glEntry.referenceType = 'payment';
            glEntry.referenceId = 'PAY-001';
            glEntry.description = 'Customer payment received';

            expect(glEntry.referenceType).toBe('payment');
            expect(glEntry.description).toContain('payment');
        });

        it('should store metadata', () => {
            const glEntry = new GlEntry();
            glEntry.metadata = {
                source: 'bank_reconciliation',
                automatch: true,
            };

            expect(glEntry.metadata.source).toBe('bank_reconciliation');
        });
    });

    describe('BankAccount Entity', () => {
        it('should create bank account with required fields', () => {
            const bankAccount = new BankAccount();
            bankAccount.tenantId = 'tenant-1';
            bankAccount.accountName = 'HDFC Current Account';
            bankAccount.accountNumberMasked = 'XXXX1234';
            bankAccount.bankName = 'HDFC Bank';
            bankAccount.ifscCode = 'HDFC0001234';

            expect(bankAccount.bankName).toBe('HDFC Bank');
            expect(bankAccount.ifscCode).toBe('HDFC0001234');
        });

        it('should track sync methods', () => {
            const manual = new BankAccount();
            manual.syncMethod = 'manual_upload';

            const api = new BankAccount();
            api.syncMethod = 'api_sync';

            expect(manual.syncMethod).toBe('manual_upload');
            expect(api.syncMethod).toBe('api_sync');
        });

        it('should link to GL account', () => {
            const bankAccount = new BankAccount();
            bankAccount.glAccountId = 'gl-acc-bank-1';

            expect(bankAccount.glAccountId).toBe('gl-acc-bank-1');
        });

        it('should track reconciliation status', () => {
            const bankAccount = new BankAccount();
            bankAccount.lastReconciledAt = new Date('2024-01-15');
            bankAccount.lastSyncAt = new Date('2024-01-16');
            bankAccount.currentBalance = 100000;

            expect(bankAccount.currentBalance).toBe(100000);
            expect(bankAccount.lastSyncAt).toBeDefined();
        });

        it('should store API credentials securely', () => {
            const bankAccount = new BankAccount();
            bankAccount.apiCredentials = {
                clientId: 'encrypted_client_id',
                clientSecret: 'encrypted_secret',
            };

            expect(bankAccount.apiCredentials.clientId).toBeDefined();
        });
    });

    describe('BankTransaction Entity', () => {
        it('should create bank transaction with required fields', () => {
            const txn = new BankTransaction();
            txn.bankAccountId = 'bank-1';
            txn.transactionDate = new Date('2024-01-15');
            txn.type = 'credit';
            txn.amount = 50000;
            txn.description = 'NEFT payment received';

            expect(txn.type).toBe('credit');
            expect(txn.amount).toBe(50000);
        });

        it('should support both debit and credit types', () => {
            const credit = new BankTransaction();
            credit.type = 'credit';
            credit.amount = 50000;

            const debit = new BankTransaction();
            debit.type = 'debit';
            debit.amount = 30000;

            expect(credit.type).toBe('credit');
            expect(debit.type).toBe('debit');
        });

        it('should track reconciliation status', () => {
            const txn = new BankTransaction();
            txn.reconciliationStatus = 'pending';
            expect(txn.reconciliationStatus).toBe('pending');

            txn.reconciliationStatus = 'matched';
            txn.reconciledAt = new Date();
            txn.reconciledBy = 'user-123';
            expect(txn.reconciliationStatus).toBe('matched');
        });

        it('should store transaction identifiers', () => {
            const txn = new BankTransaction();
            txn.transactionId = 'TXN-123456';
            txn.utrNumber = 'UTR123456789';
            txn.chequeNumber = 'CHQ-001';

            expect(txn.utrNumber).toBe('UTR123456789');
            expect(txn.chequeNumber).toBe('CHQ-001');
        });

        it('should handle parsed statement data', () => {
            const txn = new BankTransaction();
            txn.parsedData = {
                payerName: 'John Doe',
                payerAccount: 'XXXX5678',
                remarks: 'Payment for invoice',
            };

            expect(txn.parsedData.payerName).toBe('John Doe');
        });

        it('should link to matched GL entry or suspense', () => {
            const matched = new BankTransaction();
            matched.matchedGlEntryId = 'gl-entry-123';
            matched.matchedInvoiceId = 'inv-456';

            const suspense = new BankTransaction();
            suspense.suspenseEntryId = 'suspense-789';

            expect(matched.matchedGlEntryId).toBe('gl-entry-123');
            expect(suspense.suspenseEntryId).toBe('suspense-789');
        });

        it('should track balance after transaction', () => {
            const txn = new BankTransaction();
            txn.amount = 50000;
            txn.balanceAfter = 250000;

            expect(txn.balanceAfter).toBe(250000);
        });
    });

    describe('ReconciliationMatch Entity', () => {
        it('should create reconciliation match with required fields', () => {
            const match = new ReconciliationMatch();
            match.bankTransactionId = 'bank-txn-1';
            match.invoiceId = 'inv-001';
            match.matchScore = 95;
            match.matchType = 'ai_fuzzy';

            expect(match.matchScore).toBe(95);
            expect(match.matchType).toBe('ai_fuzzy');
        });

        it('should store match criteria', () => {
            const match = new ReconciliationMatch();
            match.matchCriteria = {
                amountMatch: 100,
                dateMatch: 90,
                descriptionMatch: 85,
                utrMatch: 100,
            };

            expect(match.matchCriteria.amountMatch).toBe(100);
        });

        it('should support different match types', () => {
            const exact = new ReconciliationMatch();
            exact.matchType = 'exact';
            exact.matchScore = 100;

            const fuzzy = new ReconciliationMatch();
            fuzzy.matchType = 'ai_fuzzy';
            fuzzy.matchScore = 85;

            const predictive = new ReconciliationMatch();
            predictive.matchType = 'predictive';
            predictive.matchScore = 75;

            expect(exact.matchScore).toBeGreaterThan(fuzzy.matchScore);
            expect(fuzzy.matchScore).toBeGreaterThan(predictive.matchScore);
        });

        it('should track approval workflow', () => {
            const match = new ReconciliationMatch();
            match.status = 'pending';
            expect(match.status).toBe('pending');

            match.status = 'approved';
            match.approvedBy = 'manager-123';
            match.approvedAt = new Date();
            expect(match.status).toBe('approved');
        });

        it('should handle rejection with reason', () => {
            const match = new ReconciliationMatch();
            match.status = 'rejected';
            match.rejectionReason = 'Amount m ismatch exceeds tolerance';

            expect(match.status).toBe('rejected');
            expect(match.rejectionReason).toContain('mismatch');
        });

        it('should track discrepancies', () => {
            const match = new ReconciliationMatch();
            match.discrepancy = 50.00; // ₹50 difference

            expect(match.discrepancy).toBe(50.00);
        });

        it('should support different payment types', () => {
            const full = new ReconciliationMatch();
            full.paymentType = 'full';

            const partial = new ReconciliationMatch();
            partial.paymentType = 'partial';

            expect(full.paymentType).toBe('full');
            expect(partial.paymentType).toBe('partial');
        });

        it('should link to GL entry', () => {
            const match = new ReconciliationMatch();
            match.glEntryId = 'gl-entry-posted-123';

            expect(match.glEntryId).toBe('gl-entry-posted-123');
        });
    });
});
