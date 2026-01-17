import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Entity for storing financial scenario analyses
 */
@Entity('financial_scenarios')
export class FinancialScenario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100 })
  scenarioName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  scenarioType: string;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb' })
  results: Record<string, any>;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'boolean', default: false })
  isBaseline: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comparisonMetric: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
