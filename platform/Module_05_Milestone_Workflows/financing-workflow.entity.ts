import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

/**
 * Entity representing a workflow definition for financing processes
 * 
 * This entity defines the approval workflows and process flows
 * for different financing operations, including approval steps,
 * conditions, and actions.
 */
@Entity('financing_workflows')
export class FinancingWorkflow extends BaseEntity {
  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ length: 50, nullable: false, unique: true })
  @Index()
  code: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ name: 'workflow_type', length: 50, nullable: false })
  @Index()
  workflowType: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'applicable_financing_types', type: 'jsonb', nullable: true })
  applicableFinancingTypes: string[];

  @Column({ name: 'applicable_amount_min', type: 'decimal', precision: 18, scale: 2, nullable: true })
  applicableAmountMin: number;

  @Column({ name: 'applicable_amount_max', type: 'decimal', precision: 18, scale: 2, nullable: true })
  applicableAmountMax: number;

  @Column({ name: 'steps', type: 'jsonb', nullable: false })
  steps: Array<{
    id: string;
    name: string;
    type: string;
    assigneeType: string;
    assigneeRoles: string[];
    actions: string[];
    conditions: Record<string, any>[];
    timeoutHours: number;
    escalationRoles: string[];
    nextSteps: Record<string, string>;
  }>;

  @Column({ name: 'entry_conditions', type: 'jsonb', nullable: true })
  entryConditions: Record<string, any>[];

  @Column({ name: 'exit_conditions', type: 'jsonb', nullable: true })
  exitConditions: Record<string, any>[];

  @Column({ name: 'auto_assignment_rules', type: 'jsonb', nullable: true })
  autoAssignmentRules: Record<string, any>[];

  @Column({ name: 'sla_hours', type: 'int', nullable: true })
  slaHours: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
