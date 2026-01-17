import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { GlEntry } from './gl-entry.entity';

@Entity('journal_entries')
@Index(['tenantId', 'entryDate'])
@Index(['status'])
@Index(['entryNumber'])
export class JournalEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'entry_number', type: 'varchar', length: 50, unique: true })
    entryNumber: string;

    @Column({ name: 'entry_date', type: 'date' })
    entryDate: Date;

    @Column({ name: 'entry_type', type: 'varchar', length: 20, default: 'manual' })
    entryType: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ name: 'total_debit', type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalDebit: number;

    @Column({ name: 'total_credit', type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalCredit: number;

    @Column({ name: 'is_balanced', type: 'boolean', default: false })
    isBalanced: boolean;

    @Column({ type: 'varchar', length: 20, default: 'draft' })
    status: string;

    @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
    postedAt: Date;

    @Column({ name: 'posted_by', type: 'varchar', length: 255, nullable: true })
    postedBy: string;

    @Column({ name: 'reversed_by_entry_id', type: 'uuid', nullable: true })
    reversedByEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'reversed_by_entry_id' })
    reversedByEntry: JournalEntry;

    @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
    referenceType: string;

    @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
    referenceId: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
    createdBy: string;

    @OneToMany(() => GlEntry, (glEntry) => glEntry.journalEntry)
    entries: GlEntry[];
}
