import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('personalization_rules')
@Index(['tenantId', 'templateId'])
@Index(['ruleType'])
@Index(['priority'])
export class PersonalizationRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'template_id', type: 'uuid' })
    templateId: string;

    @Column({ name: 'rule_name', length: 200 })
    ruleName: string;

    @Column({ name: 'rule_type', length: 50 })
    ruleType: string;

    @Column({ type: 'jsonb' })
    conditions: any;

    @Column({ type: 'jsonb' })
    modifications: any;

    @Column({ default: 0 })
    priority: number;

    @Column({ default: true })
    active: boolean;

    @Column({ name: 'performance_metrics', type: 'jsonb', default: {} })
    performanceMetrics: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
