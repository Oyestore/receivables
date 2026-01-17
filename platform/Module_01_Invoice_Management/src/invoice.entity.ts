import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { InvoiceLineItem } from './invoice-line-item.entity'; // Assuming this will be created

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  client_id: string;

  @Column({ length: 255 })
  invoice_number: string;

  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Index()
  @Column({ length: 50, default: 'draft' })
  status: string; // e.g., 'draft', 'sent', 'paid', 'overdue', 'void'

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  sub_total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  total_tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  total_discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  grand_total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  amount_paid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  balance_due: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  terms_and_conditions: string;

  @Column({ type: 'uuid', nullable: true })
  template_id: string; // For Phase 1.2

  @Column({ length: 255, nullable: true })
  ai_extraction_source: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => InvoiceLineItem, lineItem => lineItem.invoice, { cascade: true })
  line_items: InvoiceLineItem[];

  // TODO: Add relation for recurring_invoice_profiles (source_invoice_id) if needed directly here
  // @OneToMany(() => RecurringInvoiceProfile, profile => profile.source_invoice) // If Invoice is the owner side
  // recurring_profiles: RecurringInvoiceProfile[];
}

