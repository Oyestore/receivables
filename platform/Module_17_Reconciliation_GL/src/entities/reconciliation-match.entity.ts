import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BankTransaction } from './bank-transaction.entity';
import { JournalEntry } from './journal-entry.entity';

@Entity('reconciliation_matches')
@Index(['bankTransactionId'])
@Index(['invoiceId'])
@Index(['status'])
export class ReconciliationMatch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'bank_transaction_id', type: 'uuid' })
    bankTransactionId: string;

    @ManyToOne(() => BankTransaction)
    @JoinColumn({ name: 'bank_transaction_id' })
    bankTransaction: BankTransaction;

    @Column({ name: 'invoice_id', type: 'uuid' })
    invoiceId: string;

    @Column({ name: 'match_score', type: 'integer', nullable: true })
    matchScore: number;

    @Column({ name: 'match_criteria', type: 'jsonb', nullable: true })
    matchCriteria: any;

    @Column({ name: 'match_type', type: 'varchar', length: 20, nullable: true })
    matchType: string;

    @Column({ name: 'payment_type', type: 'varchar', length: 10, nullable: true })
    paymentType: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    discrepancy: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: string;

    @Column({ name: 'approved_by', type: 'varchar', length: 255, nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'gl_entry_id', type: 'uuid', nullable: true })
    glEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'gl_entry_id' })
    glEntry: JournalEntry;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
