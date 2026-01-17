import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum DistributionRuleType {
  AMOUNT_BASED = 'amount_based',
  CUSTOMER_BASED = 'customer_based', 
  INDUSTRY_BASED = 'industry_based',
  GEOGRAPHIC = 'geographic',
  CUSTOM = 'custom'
}

export enum DistributionStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export enum DistributionChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  POSTAL = 'postal',
  EDI = 'edi',
  API = 'api'
}

@Entity('distribution_rules')
export class DistributionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'rule_name', length: 200 })
  ruleName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    name: 'rule_type', 
    length: 20,
    type: 'varchar',
    default: DistributionRuleType.CUSTOM
  })
  ruleType: DistributionRuleType;

  @Column({ type: 'jsonb' })
  conditions: Record<string, any>;

  @Column({ name: 'target_channel', length: 50 })
  targetChannel: DistributionChannel;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @OneToMany(() => DistributionAssignment, 'ruleId')
  assignments: DistributionAssignment[];
}

@Entity('distribution_assignments')
export class DistributionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'assigned_channel', length: 50 })
  assignedChannel: DistributionChannel;

  @Column({ name: 'rule_id', nullable: true })
  ruleId: string;

  @Column({ name: 'assignment_reason' })
  assignmentReason: string;

  @Column({ 
    name: 'distribution_status', 
    length: 20,
    type: 'varchar',
    default: DistributionStatus.PENDING
  })
  distributionStatus: DistributionStatus;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
