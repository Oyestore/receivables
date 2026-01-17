import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ABTest } from './ab-test.entity';

@Entity('ab_test_variants')
@Index(['abTestId'])
@Index(['conversionRate'])
export class ABTestVariant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'ab_test_id', type: 'uuid' })
    abTestId: string;

    @ManyToOne(() => ABTest, (test) => test.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ab_test_id' })
    abTest: ABTest;

    @Column({ name: 'variant_name', length: 100 })
    variantName: string;

    @Column({ name: 'template_data', type: 'jsonb' })
    templateData: any;

    @Column({ name: 'traffic_allocation', type: 'decimal', precision: 5, scale: 2 })
    trafficAllocation: number;

    @Column({ name: 'performance_metrics', type: 'jsonb', default: {} })
    performanceMetrics: any;

    @Column({ name: 'participant_count', type: 'integer', default: 0 })
    participantCount: number;

    @Column({ name: 'conversion_rate', type: 'decimal', precision: 5, scale: 4, nullable: true })
    conversionRate: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
