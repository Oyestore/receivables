import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity'; // Assuming path

export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('recurring_invoice_profiles')
export class RecurringInvoiceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id: string;

  @Index()
  @Column({ type: 'uuid' })
  client_id: string; // Assuming a clients table exists

  @Column({ length: 255 })
  profile_name: string;

  @Column({ type: 'uuid', nullable: true })
  source_invoice_id: string; // Optional, for templating from an existing invoice

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_invoice_id' })
  source_invoice: Invoice;

  @Column({
    type: 'enum',
    enum: RecurringFrequency,
  })
  frequency: RecurringFrequency;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date; // Nullable for ongoing

  @Index()
  @Column({ type: 'date', nullable: true })
  next_run_date: Date;

  @Column({
    type: 'enum',
    enum: RecurringStatus,
    default: RecurringStatus.ACTIVE,
  })
  status: RecurringStatus;

  @Column({ type: 'jsonb', nullable: true }) // Stores a template of the invoice data to be generated
  invoice_data: any; // Consider creating a specific DTO/interface for this structure

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

