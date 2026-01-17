import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { JournalEntry } from './journal-entry.entity';
import { GlAccount } from './gl-account.entity';

@Entity('gl_entries')
@Index(['tenantId'])
@Index(['journalEntryId'])
@Index(['glAccountId'])
@Index(['referenceType', 'referenceId'])
export class GlEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'journal_entry_id', type: 'uuid' })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry, (journalEntry) => journalEntry.entries)
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @Column({ name: 'gl_account_id', type: 'uuid' })
    glAccountId: string;

    @ManyToOne(() => GlAccount)
    @JoinColumn({ name: 'gl_account_id' })
    glAccount: GlAccount;

    @Column({ name: 'entry_type', type: 'varchar', length: 10 })
    entryType: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
    referenceType: string;

    @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
    referenceId: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
