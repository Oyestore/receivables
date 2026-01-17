import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { FollowUpSequence } from './follow-up-sequence.entity';
import { FollowUpRule } from './follow-up-rule.entity';

@Entity('follow_up_steps')
export class FollowUpStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sequence_id' })
  sequenceId: string;

  @ManyToOne(() => FollowUpSequence, sequence => sequence.steps)
  @JoinColumn({ name: 'sequence_id' })
  sequence: FollowUpSequence;

  @Column({ name: 'step_number' })
  stepNumber: number;

  @Column({ name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => FollowUpRule)
  @JoinColumn({ name: 'rule_id' })
  rule: FollowUpRule;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
