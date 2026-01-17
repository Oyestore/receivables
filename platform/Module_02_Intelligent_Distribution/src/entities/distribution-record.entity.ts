import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { RecipientContact } from './recipient-contact.entity';
import { CommunicationChannel } from './recipient-contact.entity';

export enum DistributionStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  OPENED = 'opened',
}

@Entity('distribution_records')
export class DistributionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => RecipientContact)
  @JoinColumn({ name: 'recipient_id' })
  recipient: RecipientContact;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    default: CommunicationChannel.EMAIL,
  })
  channel: CommunicationChannel;

  @Column({
    type: 'enum',
    enum: DistributionStatus,
    default: DistributionStatus.PENDING,
  })
  status: DistributionStatus;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'opened_at', nullable: true })
  openedAt: Date;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
