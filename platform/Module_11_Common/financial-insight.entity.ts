import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Entity for storing financial insights and analysis
 */
@Entity('financial_insights')
export class FinancialInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100 })
  insightType: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'varchar', length: 50 })
  severity: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isActionable: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recommendedAction: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
