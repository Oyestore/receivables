import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity('customer_health')
export class CustomerHealth {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    customerId: string;

    @Column({ type: 'float', default: 100 })
    overallScore: number;

    @Column({ type: 'float', default: 0 })
    engagementScore: number;

    @Column({ type: 'float', default: 0 })
    productUsageScore: number;

    @Column({ type: 'float', default: 0 })
    paymentHealthScore: number;

    @Column({ type: 'float', default: 0 })
    supportHealthScore: number;

    @Column({ nullable: true })
    lastAssessmentDate: Date;

    @Column({ type: 'jsonb', nullable: true })
    riskFactors: string[];

    @Column({ type: 'jsonb', nullable: true })
    recommendations: string[];

    @UpdateDateColumn()
    updatedAt: Date;
}
