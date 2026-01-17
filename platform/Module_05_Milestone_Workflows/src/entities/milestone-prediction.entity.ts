import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Milestone } from './milestone.entity';

/**
 * Milestone Prediction Entity
 * 
 * Stores AI predictions for milestone completion
 * Used for accuracy tracking and historical analysis
 */
@Entity('milestone_predictions')
@Index(['milestoneId', 'createdAt'])
@Index(['riskLevel'])
export class MilestonePrediction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    milestoneId: string;

    @Column({ type: 'varchar', length: 255 })
    tenantId: string;

    @Column({ type: 'timestamp' })
    estimatedCompletionDate: Date;

    @Column({ type: 'decimal', precision: 3, scale: 2 })
    confidence: number; // 0-1

    @Column({ type: 'varchar', length: 20 })
    riskLevel: string; // LOW, MEDIUM, HIGH, CRITICAL

    @Column({ type: 'decimal', precision: 3, scale: 2 })
    delayProbability: number; // 0-1

    @Column({ type: 'jsonb', nullable: true })
    recommendations: any[];

    @Column({ type: 'jsonb', nullable: true })
    factors: {
        velocity: number;
        historicalAccuracy: number;
        dependencyStatus: string;
        resourceAvailability: number;
        complexityScore: number;
    };

    // Accuracy Tracking
    @Column({ type: 'timestamp', nullable: true })
    actualCompletionDate: Date;

    @Column({ type: 'boolean', default: false })
    wasAccurate: boolean;

    @Column({ type: 'integer', nullable: true })
    deviationDays: number; // Actual - Predicted (days)

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    accuracyScore: number; // 0-100

    // Metadata
    @Column({ type: 'varchar', length: 50, default: 'ML_SERVICE' })
    predictionSource: string; // ML_SERVICE, RULE_BASED, HISTORICAL_AVERAGE

    @Column({ type: 'jsonb', nullable: true })
    mlModelMetadata: {
        modelVersion: string;
        features: string[];
        trainingDate: Date;
    };

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => Milestone)
    @JoinColumn({ name: 'milestoneId' })
    milestone: Milestone;
}
