import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { BankTransaction } from '../entities/bank-transaction.entity';

@Injectable()
export class BankFeedService {
    constructor(
        @InjectRepository(BankAccount)
        private bankAccountRepo: Repository<BankAccount>,
        @InjectRepository(BankTransaction)
        private bankTransactionRepo: Repository<BankTransaction>
    ) { }

    async importTransactions(bankAccountId: string, transactions: any[]): Promise<BankTransaction[]> {
        const account = await this.bankAccountRepo.findOne({ where: { id: bankAccountId } });
        if (!account) throw new Error('Bank account not found');

        const imported: BankTransaction[] = [];

        for (const tx of transactions) {
            // Deduplication check
            const exists = await this.bankTransactionRepo.findOne({
                where: {
                    bankAccountId,
                    utrNumber: tx.utrNumber
                }
            });

            if (exists) continue;

            const newTx = this.bankTransactionRepo.create({
                bankAccountId,
                transactionDate: tx.date,
                amount: tx.amount,
                type: tx.type, // 'credit' or 'debit'
                description: tx.description,
                utrNumber: tx.utrNumber,
                chequeNumber: tx.chequeNumber,
                reconciliationStatus: 'pending',
                parsedData: this.parseTransactionDescription(tx.description)
            });

            imported.push(await this.bankTransactionRepo.save(newTx));
        }

        // Update last sync
        account.lastSyncAt = new Date();
        await this.bankAccountRepo.save(account);

        return imported;
    }

    async getUnreconciledTransactions(bankAccountId: string): Promise<BankTransaction[]> {
        return this.bankTransactionRepo.find({
            where: {
                bankAccountId,
                reconciliationStatus: 'pending'
            }
        });
    }
}
