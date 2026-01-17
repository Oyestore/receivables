import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled',
}

export enum ReviewType {
  MANUAL_REVIEW = 'manual_review',
  ESCALATION = 'escalation',
  EXCEPTION = 'exception',
  POLICY_VIOLATION = 'policy_violation',
  HIGH_VALUE = 'high_value',
  RISK_ASSESSMENT = 'risk_assessment',
}

export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('manual_reviews')
@Index(['decisionId'])
@Index(['reviewerId'])
@Index(['status'])
@Index(['reviewType'])
@Index(['priority'])
@Index(['createdAt'])
export class ManualReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'decision_id' })
  decisionId: string;

  @Column({
    type: 'enum',
    enum: ReviewType,
  })
  reviewType: ReviewType;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({
    type: 'enum',
    enum: ReviewPriority,
    default: ReviewPriority.MEDIUM,
  })
  priority: ReviewPriority;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'reviewer_role', length: 100 })
  reviewerRole: string;

  @Column({ name: 'reviewer_name', length: 255 })
  reviewerName: string;

  @Column({ name: 'assigned_by' })
  assignedBy: string;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ name: 'review_reason', type: 'text' })
  reviewReason: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'recommendation', type: 'text', nullable: true })
  recommendation: string;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: Array<{
    condition: string;
    description: string;
    isMandatory: boolean;
    dueDate?: Date;
  }>;

  @Column({ name: 'supporting_documents', type: 'jsonb', default: '[]' })
  supportingDocuments: Array<{
    documentId: string;
    documentName: string;
    documentType: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;

  @Column({ name: 'review_criteria', type: 'jsonb', nullable: true })
  reviewCriteria: Array<{
    criterion: string;
    weight: number;
    score: number;
    notes: string;
  }>;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation: string;
  }>;

  @Column({ name: 'escalation_history', type: 'jsonb', default: '[]' })
  escalationHistory: Array<{
    escalatedAt: Date;
    escalatedBy: string;
    escalatedTo: string;
    reason: string;
  }>;

  @Column({ name: 'approval_chain', type: 'jsonb', nullable: true })
  approvalChain: Array<{
    approverId: string;
    approverRole: string;
    status: 'pending' | 'approved' | 'rejected';
    decisionAt: Date;
    notes: string;
  }>;

  @Column({ name: 'communication_log', type: 'jsonb', default: '[]' })
  communicationLog: Array<{
    timestamp: Date;
    senderId: string;
    senderRole: string;
    recipientId: string;
    recipientRole: string;
    message: string;
    type: 'note' | 'question' | 'response' | 'escalation';
  }>;

  @Column({ name: 'sla_metrics', type: 'jsonb', nullable: true })
  slaMetrics: {
    targetCompletionTime: number;
    actualCompletionTime: number;
    breachOccurred: boolean;
    breachReason?: string;
  };

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ name: 'compliance_flags', type: 'jsonb', default: '[]' })
  complianceFlags: Array<{
    flag: string;
    description: string;
    severity: 'info' | 'warning' | 'error';
    resolved: boolean;
  }>;

  @Column({ name: 'override_reason', type: 'text', nullable: true })
  overrideReason: string;

  @Column({ name: 'override_by', nullable: true })
  overrideBy: string;

  @Column({ name: 'override_at', type: 'timestamp', nullable: true })
  overrideAt: Date;

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
  @ManyToOne(() => CreditDecision, { nullable: true })
  @JoinColumn({ name: 'decision_id' })
  decision: CreditDecision;
}
