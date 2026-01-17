import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

/**
 * Entity representing a workflow instance for a financing request
 * 
 * This entity tracks the execution of a workflow for a specific financing request,
 * including current status, history, and assigned users.
 */
@Entity('financing_workflow_instances')
export class FinancingWorkflowInstance extends BaseEntity {
  @Column({ name: 'workflow_id', nullable: false })
  @Index()
  workflowId: string;

  @Column({ name: 'financing_request_id', nullable: false })
  @Index()
  financingRequestId: string;

  @Column({ name: 'current_step_id', nullable: true })
  currentStepId: string;

  @Column({ name: 'current_step_name', length: 100, nullable: true })
  currentStepName: string;

  @Column({ name: 'status', length: 50, default: 'INITIATED' })
  @Index()
  status: string;

  @Column({ name: 'start_date', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  startDate: Date;

  @Column({ name: 'end_date', nullable: true })
  endDate: Date;

  @Column({ name: 'current_assignee_id', nullable: true })
  currentAssigneeId: string;

  @Column({ name: 'current_assignee_name', length: 100, nullable: true })
  currentAssigneeName: string;

  @Column({ name: 'current_assignee_role', length: 50, nullable: true })
  currentAssigneeRole: string;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ name: 'is_overdue', default: false })
  isOverdue: boolean;

  @Column({ name: 'step_history', type: 'jsonb', nullable: true })
  stepHistory: Array<{
    stepId: string;
    stepName: string;
    assigneeId: string;
    assigneeName: string;
    assigneeRole: string;
    startDate: Date;
    endDate: Date;
    action: string;
    comments: string;
    documents: string[];
  }>;

  @Column({ name: 'decision', length: 50, nullable: true })
  decision: string;

  @Column({ name: 'decision_reason', length: 255, nullable: true })
  decisionReason: string;

  @Column({ name: 'decision_date', nullable: true })
  decisionDate: Date;

  @Column({ name: 'decision_by', nullable: true })
  decisionBy: string;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: Record<string, any>[];

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
