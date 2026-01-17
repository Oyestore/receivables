import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { QualityCheck } from './quality-check.entity';

@Entity('quality_check_details')
@Index(['qualityCheckId'])
@Index(['checkType'])
@Index(['passed'])
export class QualityCheckDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'quality_check_id', type: 'uuid' })
    qualityCheckId: string;

    @ManyToOne(() => QualityCheck, (check) => check.details, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quality_check_id' })
    qualityCheck: QualityCheck;

    @Column({ name: 'check_type', length: 50 })
    checkType: string;

    @Column()
    passed: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    score: number;

    @Column({ type: 'jsonb', default: [] })
    issues: any;

    @Column({ type: 'jsonb', default: [] })
    recommendations: any;

    @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
    processingTimeMs: number;

    @Column({ name: 'ai_analysis', type: 'jsonb', nullable: true })
    aiAnalysis: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
