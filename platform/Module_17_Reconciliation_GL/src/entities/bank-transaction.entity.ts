import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BankAccount } from './bank-account.entity';
import { JournalEntry } from './journal-entry.entity';
import { GlEntry } from './gl-entry.entity';

@Entity('bank_transactions')
@Index(['bankAccountId'])
@Index(['reconciliationStatus'])
@Index(['transactionDate'])
@Index(['utrNumber'])
export class BankTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'bank_account_id', type: 'uuid' })
    bankAccountId: string;

    @ManyToOne(() => BankAccount)
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
    transactionId: string;

    @Column({ name: 'transaction_date', type: 'date' })
    transactionDate: Date;

    @Column({ type: 'varchar', length: 10 })
    type: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
    balanceAfter: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'utr_number', type: 'varchar', length: 50, nullable: true })
    utrNumber: string;

    @Column({ name: 'cheque_number', type: 'varchar', length: 50, nullable: true })
    chequeNumber: string;

    @Column({ name: 'reconciliation_status', type: 'varchar', length: 20, default: 'pending' })
    reconciliationStatus: string;

    @Column({ name: 'parsed_data', type: 'jsonb', nullable: true })
    parsedData: any;

    @Column({ name: 'imported_at', type: 'timestamptz', default: () => 'NOW()' })
    importedAt: Date;

    @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
    reconciledAt: Date;

    @Column({ name: 'reconciled_by', type: 'varchar', length: 255, nullable: true })
    reconciledBy: string;

    @Column({ name: 'matched_invoice_id', type: 'uuid', nullable: true })
    matchedInvoiceId: string;

    @Column({ name: 'matched_gl_entry_id', type: 'uuid', nullable: true })
    matchedGlEntryId: string;

    @ManyToOne(() => GlEntry)
    @JoinColumn({ name: 'matched_gl_entry_id' })
    matchedGlEntry: GlEntry;

    @Column({ name: 'suspense_entry_id', type: 'uuid', nullable: true })
    suspenseEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'suspense_entry_id' })
    suspenseEntry: JournalEntry;

    @Column({ type: 'jsonb', default: {} })
    metadata: any;
}
