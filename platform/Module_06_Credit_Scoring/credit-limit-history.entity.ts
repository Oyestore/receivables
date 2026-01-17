import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditLimit } from './credit-limit.entity';

/**
 * Entity representing credit limit history.
 * This stores historical changes to credit limits for audit and analysis.
 */
@Entity('credit_limit_history')
export class CreditLimitHistory {
  /**
   * Unique identifier for the credit limit history entry
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Credit limit ID this history entry is for
   */
  @Column({ name: 'credit_limit_id' })
  creditLimitId: string;

  /**
   * Buyer ID this credit limit applies to
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Change type (e.g., created, updated, approved, expired)
   */
  @Column({ name: 'change_type', length: 50 })
  changeType: string;

  /**
   * Previous approved limit amount
   */
  @Column({ name: 'previous_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  previousLimit: number;

  /**
   * New approved limit amount
   */
  @Column({ name: 'new_limit', type: 'decimal', precision: 19, scale: 4' })
  newLimit: number;

  /**
   * Currency code for the credit limit
   */
  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  /**
   * Change amount (new_limit - previous_limit)
   */
  @Column({ name: 'change_amount', type: 'decimal', precision: 19, scale: 4 })
  changeAmount: number;

  /**
   * Change percentage
   */
  @Column({ name: 'change_percentage', type: 'decimal', precision: 10, scale: 2, nullable: true })
  changePercentage: number;

  /**
   * Previous status
   */
  @Column({ name: 'previous_status', length: 20, nullable: true })
  previousStatus: string;

  /**
   * New status
   */
  @Column({ name: 'new_status', length: 20 })
  newStatus: string;

  /**
   * Reason for the change
   */
  @Column({ name: 'change_reason', length: 255, nullable: true })
  changeReason: string;

  /**
   * User ID who made the change
   */
  @Column({ name: 'changed_by', nullable: true })
  changedBy: string;

  /**
   * User name who made the change
   */
  @Column({ name: 'changed_by_name', length: 100, nullable: true })
  changedByName: string;

  /**
   * JSON object containing detailed changes
   */
  @Column({ name: 'change_details', type: 'jsonb', nullable: true })
  changeDetails: Record<string, any>;

  /**
   * Notes about this change
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  /**
   * Timestamp when the change occurred
   */
  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  /**
   * Relation to the credit limit
   */
  @ManyToOne(() => CreditLimit)
  @JoinColumn({ name: 'credit_limit_id' })
  creditLimit: CreditLimit;
}
