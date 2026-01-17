import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { QualityCheck } from './quality-check.entity';

@Entity('auto_fixes')
@Index(['qualityCheckId'])
@Index(['fixType'])
@Index(['applied'])
export class AutoFix {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'quality_check_id', type: 'uuid' })
    qualityCheckId: string;

    @ManyToOne(() => QualityCheck, (check) => check.autoFixes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quality_check_id' })
    qualityCheck: QualityCheck;

    @Column({ name: 'fix_type', length: 50 })
    fixType: string;

    @Column({ name: 'original_value', type: 'jsonb', nullable: true })
    originalValue: any;

    @Column({ name: 'fixed_value', type: 'jsonb', nullable: true })
    fixedValue: any;

    @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    confidenceScore: number;

    @Column({ default: false })
    applied: boolean;

    @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
    appliedAt: Date;

    @Column({ name: 'rollback_data', type: 'jsonb', nullable: true })
    rollbackData: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
