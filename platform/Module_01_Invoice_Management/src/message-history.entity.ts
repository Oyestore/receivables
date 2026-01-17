import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { RecipientContact } from '../../distribution/entities/recipient-contact.entity';
import { MessageTemplate } from './message-template.entity';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';

export enum MessageStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  OPENED = 'opened',
  REPLIED = 'replied',
}

@Entity('message_history')
export class MessageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => RecipientContact)
  @JoinColumn({ name: 'recipient_id' })
  recipient: RecipientContact;

  @Column({ name: 'template_id', nullable: true })
  templateId: string;

  @ManyToOne(() => MessageTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: MessageTemplate;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    default: CommunicationChannel.EMAIL,
  })
  channel: CommunicationChannel;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.DRAFT,
  })
  status: MessageStatus;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
