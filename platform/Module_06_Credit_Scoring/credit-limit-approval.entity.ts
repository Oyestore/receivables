import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditLimit } from './credit-limit.entity';

/**
 * Entity representing credit limit approval workflows.
 * This stores approval steps, decisions, and related information.
 */
@Entity('credit_limit_approvals')
export class CreditLimitApproval {
  /**
   * Unique identifier for the credit limit approval
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Credit limit ID this approval is for
   */
  @Column({ name: 'credit_limit_id' })
  creditLimitId: string;

  /**
   * Approval workflow ID
   */
  @Column({ name: 'workflow_id', nullable: true })
  workflowId: string;

  /**
   * Current approval step number
   */
  @Column({ name: 'current_step', type: 'integer', default: 1 })
  currentStep: number;

  /**
   * Total number of steps in the approval workflow
   */
  @Column({ name: 'total_steps', type: 'integer' })
  totalSteps: number;

  /**
   * Status of the approval (e.g., pending, approved, rejected)
   */
  @Column({ name: 'status', length: 20 })
  status: string;

  /**
   * Requested credit limit amount
   */
  @Column({ name: 'requested_limit', type: 'decimal', precision: 19, scale: 4 })
  requestedLimit: number;

  /**
   * Currency code for the credit limit
   */
  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  /**
   * Requester user ID
   */
  @Column({ name: 'requester_id', nullable: true })
  requesterId: string;

  /**
   * Requester name
   */
  @Column({ name: 'requester_name', length: 100, nullable: true })
  requesterName: string;

  /**
   * Current approver user ID
   */
  @Column({ name: 'current_approver_id', nullable: true })
  currentApproverId: string;

  /**
   * Current approver name
   */
  @Column({ name: 'current_approver_name', length: 100, nullable: true })
  currentApproverName: string;

  /**
   * Current approver role
   */
  @Column({ name: 'current_approver_role', length: 50, nullable: true })
  currentApproverRole: string;

  /**
   * Request date when the approval was requested
   */
  @Column({ name: 'request_date', type: 'timestamp' })
  requestDate: Date;

  /**
   * Due date when the approval is due
   */
  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  /**
   * Completion date when the approval was completed
   */
  @Column({ name: 'completion_date', type: 'timestamp', nullable: true })
  completionDate: Date;

  /**
   * Time spent in approval process (in hours)
   */
  @Column({ name: 'time_spent', type: 'decimal', precision: 10, scale: 2, nullable: true })
  timeSpent: number;

  /**
   * JSON object containing approval steps and decisions
   */
  @Column({ name: 'approval_steps', type: 'jsonb' })
  approvalSteps: Record<string, any>;

  /**
   * JSON object containing supporting documents
   */
  @Column({ name: 'supporting_documents', type: 'jsonb', nullable: true })
  supportingDocuments: Record<string, any>;

  /**
   * JSON object containing approval conditions
   */
  @Column({ name: 'approval_conditions', type: 'jsonb', nullable: true })
  approvalConditions: Record<string, any>;

  /**
   * Notes about this approval
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
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

  /**
   * Relation to the credit limit
   */
  @ManyToOne(() => CreditLimit)
  @JoinColumn({ name: 'credit_limit_id' })
  creditLimit: CreditLimit;
}
