import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';

export enum MessageTemplateType {
  REMINDER = 'reminder',
  THANK_YOU = 'thank_you',
  OVERDUE = 'overdue',
  CUSTOM = 'custom',
}

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: MessageTemplateType,
    default: MessageTemplateType.REMINDER,
  })
  type: MessageTemplateType;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    default: CommunicationChannel.EMAIL,
  })
  channel: CommunicationChannel;

  @Column({ nullable: true, length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'simple-array', nullable: true })
  variables: string[];

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
