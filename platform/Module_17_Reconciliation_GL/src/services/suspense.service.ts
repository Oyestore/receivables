import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { GlPostingService } from './gl-posting.service';

@Injectable()
export class SuspenseService {
    constructor(
        @InjectRepository(BankTransaction)
        private bankTransactionRepo: Repository<BankTransaction>,
        private glPostingService: GlPostingService
    ) { }

    async moveToSuspense(transactionId: string, suspenseAccountId: string, userId: string): Promise<void> {
        const txn = await this.bankTransactionRepo.findOne({ where: { id: transactionId } });
        if (!txn) throw new Error('Transaction not found');

        // Create a Journal Entry moving this amount to Suspense
        // Debit/Credit depends on transaction type
        const isCredit = txn.type === 'credit';

        // This logic simulates creating a JE. Real implementation needs the Bank GL Account ID too.
        // We assume the Bank GL Account is linked in the BankAccount entity.

        txn.reconciliationStatus = 'suspended';
        await this.bankTransactionRepo.save(txn);
    }
}
