import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum DecisionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MANUAL_REVIEW = 'manual_review',
  ESCALATED = 'escalated',
  EXPIRED = 'expired',
}

export enum DecisionType {
  CREDIT_LIMIT = 'credit_limit',
  FINANCING_APPROVAL = 'financing_approval',
  RISK_ASSESSMENT = 'risk_assessment',
  POLICY_VIOLATION = 'policy_violation',
  EXCEPTION_REQUEST = 'exception_request',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('credit_decisions')
@Index(['entityId', 'entityType'])
@Index(['status'])
@Index(['decisionType'])
@Index(['createdAt'])
export class CreditDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'entity_type' })
  entityType: string; // 'customer', 'invoice', 'loan_application', etc.

  @Column({
    type: 'enum',
    enum: DecisionType,
  })
  decisionType: DecisionType;

  @Column({
    type: 'enum',
    enum: DecisionStatus,
    default: DecisionStatus.PENDING,
  })
  status: DecisionStatus;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  creditScore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  requestedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  approvedAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  @Column({ name: 'supporting_documents', type: 'jsonb', default: '[]' })
  supportingDocuments: string[];

  @Column({ name: 'applied_rules', type: 'jsonb', default: '[]' })
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    outcome: string;
    score: number;
  }>;

  @Column({ name: 'workflow_id', nullable: true })
  workflowId: string;

  @Column({ name: 'current_step', nullable: true })
  currentStep: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true })
  finalizedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  // Relationships
  @ManyToOne(() => DecisionWorkflow, { nullable: true })
  @JoinColumn({ name: 'workflow_id' })
  workflow: DecisionWorkflow;
}
