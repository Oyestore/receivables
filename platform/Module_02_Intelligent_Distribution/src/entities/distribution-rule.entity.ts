import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

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

  @Column({ name: 'rule_type', length: 20 })
  ruleType: 'amount_based' | 'customer_based' | 'industry_based' | 'geographic' | 'custom';

  @Column({ type: 'jsonb' })
  conditions: Record<string, any>;

  @Column({ name: 'target_channel', length: 50 })
  targetChannel: string;

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

  @OneToMany(() => DistributionAssignment, assignment => assignment.rule)
  assignments: DistributionAssignment[];
}

@Entity('distribution_assignments')
export class DistributionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'assigned_channel', length: 50 })
  assignedChannel: string;

  @Column({ name: 'rule_id', nullable: true })
  ruleId: string;

  @ManyToOne(() => DistributionRule, rule => rule.assignments)
  @JoinColumn({ name: 'rule_id' })
  rule: DistributionRule;

  @Column({ name: 'assignment_reason' })
  assignmentReason: string;

  @Column({ name: 'distribution_status', length: 20 })
  distributionStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

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
