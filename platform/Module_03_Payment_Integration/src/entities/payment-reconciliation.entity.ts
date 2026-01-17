import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  PARTIAL_MATCH = 'partial_match',
  UNMATCHED = 'unmatched',
  MANUAL_MATCH = 'manual_match',
  IGNORED = 'ignored',
}

export enum ReconciliationSource {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  AI_SUGGESTED = 'ai_suggested',
}

@Entity()
export class PaymentReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({
    type: 'enum',
    enum: ReconciliationSource,
    default: ReconciliationSource.AUTOMATIC,
  })
  source: ReconciliationSource;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  matchingCriteria: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => PaymentTransaction)
  transaction: PaymentTransaction;

  @Column()
  transactionId: string;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice: Invoice;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ nullable: true })
  reconciledBy: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ nullable: true })
  reconciledAt: Date;
}
