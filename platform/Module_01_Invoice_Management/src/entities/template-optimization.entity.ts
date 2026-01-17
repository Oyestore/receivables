import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('template_optimizations')
@Index(['tenantId', 'createdAt'])
@Index(['templateId', 'createdAt'])
@Index(['status'])
export class TemplateOptimization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'template_id', type: 'uuid' })
    templateId: string;

    @Column({ name: 'optimization_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    optimizationScore: number;

    @Column({ length: 50, default: 'pending' })
    status: string;

    @Column({ name: 'optimization_types', type: 'text', array: true })
    optimizationTypes: string[];

    @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
    processingTimeMs: number;

    @Column({ name: 'quality_reference', type: 'uuid', nullable: true })
    qualityReference: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'session_id', length: 100, nullable: true })
    sessionId: string;
}
