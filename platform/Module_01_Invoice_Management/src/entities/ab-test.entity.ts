import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { ABTestVariant } from './ab-test-variant.entity';

@Entity('ab_tests')
@Index(['tenantId', 'status'])
@Index(['templateId'])
@Index(['startDate', 'endDate'])
export class ABTest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'test_name', length: 200 })
    testName: string;

    @Column({ name: 'template_id', type: 'uuid' })
    templateId: string;

    @Column({ length: 50, default: 'draft' })
    status: string;

    @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
    endDate: Date;

    @Column({ name: 'target_audience', type: 'jsonb', nullable: true })
    targetAudience: any;

    @Column({ name: 'success_metrics', type: 'text', array: true, nullable: true })
    successMetrics: string[];

    @Column({ name: 'statistical_significance', type: 'decimal', precision: 5, scale: 2, nullable: true })
    statisticalSignificance: number;

    @Column({ name: 'confidence_level', type: 'decimal', precision: 5, scale: 2, default: 0.95 })
    confidenceLevel: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ABTestVariant, (variant) => variant.abTest, { cascade: true })
    variants: ABTestVariant[];
}
