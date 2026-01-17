import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

export enum ExperimentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ExperimentType {
  DISCOUNT_STRATEGY = 'discount_strategy',
  LATE_FEE_STRATEGY = 'late_fee_strategy',
  PAYMENT_METHOD_PREFERENCE = 'payment_method_preference',
  COMMUNICATION_STRATEGY = 'communication_strategy',
}

@Entity()
export class ABTestExperiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ExperimentStatus,
    default: ExperimentStatus.DRAFT,
  })
  status: ExperimentStatus;

  @Column({
    type: 'enum',
    enum: ExperimentType,
  })
  experimentType: ExperimentType;

  @Column({ type: 'json' })
  variants: {
    id: string;
    name: string;
    description?: string;
    configuration: Record<string, any>;
    trafficAllocation: number;
  }[];

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'json', nullable: true })
  targetCriteria: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metrics: {
    primary: string;
    secondary: string[];
  };

  @Column({ default: false })
  isAutomaticWinnerSelection: boolean;

  @Column({ nullable: true })
  winnerVariantId: string;

  @Column({ type: 'json', nullable: true })
  results: Record<string, any>;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
