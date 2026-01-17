import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { QualityCheckDetail } from './quality-check-detail.entity';
import { AutoFix } from './auto-fix.entity';

@Entity('quality_checks')
@Index(['tenantId', 'createdAt'])
@Index(['status'])
@Index(['sessionId'])
@Index(['templateId', 'createdAt'])
export class QualityCheck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'template_id', type: 'uuid' })
    templateId: string;

    @Column({ name: 'invoice_data', type: 'jsonb' })
    invoiceData: any;

    @Column({ length: 50, default: 'pending' })
    status: string;

    @Column({ name: 'overall_quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    overallQualityScore: number;

    @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
    processingTimeMs: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'session_id', length: 100, nullable: true })
    sessionId: string;

    @Column({ name: 'audit_level', length: 20, default: 'standard' })
    auditLevel: string;

    @OneToMany(() => QualityCheckDetail, (detail) => detail.qualityCheck, { cascade: true })
    details: QualityCheckDetail[];

    @OneToMany(() => AutoFix, (fix) => fix.qualityCheck, { cascade: true })
    autoFixes: AutoFix[];
}
