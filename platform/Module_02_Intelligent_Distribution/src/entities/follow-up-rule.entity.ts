import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CommunicationChannel } from '../entities/recipient-contact.entity';

export enum TriggerType {
  BEFORE_DUE = 'before_due',
  ON_DUE = 'on_due',
  AFTER_DUE = 'after_due',
  ON_EVENT = 'on_event',
}

@Entity('follow_up_rules')
export class FollowUpRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.AFTER_DUE,
  })
  triggerType: TriggerType;

  @Column({ name: 'days_offset', default: 0 })
  daysOffset: number;

  @Column({ name: 'template_id', nullable: true })
  templateId: string;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    default: CommunicationChannel.EMAIL,
  })
  channel: CommunicationChannel;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
