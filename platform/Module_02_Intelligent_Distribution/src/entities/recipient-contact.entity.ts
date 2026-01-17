import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export enum CommunicationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

@Entity('recipient_contacts')
export class RecipientContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_name', length: 255 })
  recipientName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({
    name: 'preferred_channel',
    type: 'enum',
    enum: CommunicationChannel,
    default: CommunicationChannel.EMAIL,
  })
  preferredChannel: CommunicationChannel;

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
