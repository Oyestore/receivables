import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { JournalEntry } from '../entities/journal-entry.entity';
import { GlEntry } from '../entities/gl-entry.entity';
import { GlAccount } from '../entities/gl-account.entity';

@Injectable()
export class GlPostingService {
    constructor(
        @InjectRepository(JournalEntry)
        private journalEntryRepo: Repository<JournalEntry>,
        @InjectRepository(GlEntry)
        private glEntryRepo: Repository<GlEntry>,
        @InjectRepository(GlAccount)
        private glAccountRepo: Repository<GlAccount>,
        private dataSource: DataSource
    ) { }

    async createEntry(data: Partial<JournalEntry>, entries: Partial<GlEntry>[]): Promise<JournalEntry> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            // 1. Validate Balance
            const totalDebit = entries
                .filter(e => e.entryType === 'debit')
                .reduce((sum, e) => sum + Number(e.amount), 0);

            const totalCredit = entries
                .filter(e => e.entryType === 'credit')
                .reduce((sum, e) => sum + Number(e.amount), 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new BadRequestException(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
            }

            // 2. Create Header
            const journalEntry = manager.create(JournalEntry, {
                ...data,
                totalDebit,
                totalCredit,
                isBalanced: true,
                status: 'draft', // Default to draft
                entryNumber: `JE-${Date.now()}` // Simple generation for now
            });
            const savedHeader = await manager.save(JournalEntry, journalEntry);

            // 3. Create Lines
            for (const entry of entries) {
                const line = manager.create(GlEntry, {
                    ...entry,
                    journalEntryId: savedHeader.id,
                    tenantId: data.tenantId
                });
                await manager.save(GlEntry, line);
            }

            return savedHeader;
        });
    }

    async postEntry(entryId: string, userId: string): Promise<JournalEntry> {
        return await this.dataSource.transaction(async (manager: EntityManager) => {
            const entry = await manager.findOne(JournalEntry, {
                where: { id: entryId },
                relations: ['entries']
            });

            if (!entry) throw new BadRequestException('Entry not found');
            if (entry.status === 'posted') throw new BadRequestException('Entry already posted');

            // Update Account Balances
            for (const line of entry.entries) {
                const account = await manager.findOne(GlAccount, { where: { id: line.glAccountId } });
                if (!account) throw new BadRequestException(`Account ${line.glAccountId} not found`);

                // Simple logic: Assets/Expenses increase with Debit. Liabilities/Equity/Revenue increase with Credit.
                // We'll trust the caller to know the "normal balance" or handle signs.
                // For this implementation, we will just add Debits and subtract Credits to a "Net Balance" if we assume Asset-heavy view,
                // BUT correct accounting updates the balance based on normal_balance.

                let change = Number(line.amount);
                if (account.normalBalance === 'debit') {
                    if (line.entryType === 'credit') change = -change;
                } else { // credit normal balance
                    if (line.entryType === 'debit') change = -change;
                }

                account.currentBalance = Number(account.currentBalance) + change;
                await manager.save(GlAccount, account);
            }

            // Update Status
            entry.status = 'posted';
            entry.postedAt = new Date();
            entry.postedBy = userId;

            return await manager.save(JournalEntry, entry);
        });
    }

    async getTrialBalance(tenantId: string): Promise<any[]> {
        return this.glAccountRepo.find({ where: { tenantId } });
    }
}
