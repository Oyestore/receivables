import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditAssessment } from './credit-assessment.entity';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Entity representing payment history for a buyer.
 * This tracks historical payment behavior used in credit assessment.
 */
@Entity('payment_history')
export class PaymentHistory {
  /**
   * Unique identifier for the payment history record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID for whom the payment history is recorded
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Invoice ID associated with this payment
   */
  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  /**
   * Payment transaction ID
   */
  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  /**
   * Original invoice amount
   */
  @Column({ name: 'invoice_amount', type: 'decimal', precision: 19, scale: 4 })
  invoiceAmount: number;

  /**
   * Amount paid
   */
  @Column({ name: 'paid_amount', type: 'decimal', precision: 19, scale: 4 })
  paidAmount: number;

  /**
   * Currency code (ISO 4217)
   */
  @Column({ name: 'currency_code', length: 3, default: 'INR' })
  currencyCode: string;

  /**
   * Invoice due date
   */
  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  /**
   * Actual payment date
   */
  @Column({ name: 'payment_date', type: 'timestamp', nullable: true })
  paymentDate: Date;

  /**
   * Days past due (negative if paid early)
   */
  @Column({ name: 'days_past_due', type: 'integer', nullable: true })
  daysPastDue: number;

  /**
   * Payment status (e.g., paid, partial, overdue, defaulted)
   */
  @Column({ name: 'payment_status', length: 20 })
  paymentStatus: string;

  /**
   * Payment method used
   */
  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string;

  /**
   * Number of reminders sent before payment
   */
  @Column({ name: 'reminder_count', type: 'integer', default: 0 })
  reminderCount: number;

  /**
   * Whether a dispute was raised for this invoice
   */
  @Column({ name: 'had_dispute', type: 'boolean', default: false })
  hadDispute: boolean;

  /**
   * Risk level associated with this payment
   */
  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
    nullable: true
  })
  riskLevel: RiskLevel;

  /**
   * Notes about this payment
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Timestamp when the record was created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp when the record was last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
