import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Entity('anomaly_detections')
export class AnomalyDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AnomalySeverity
  })
  severity: AnomalySeverity;

  @Column({ name: 'metric_name', length: 255 })
  metricName: string;

  @Column({ name: 'metric_value', type: 'decimal', precision: 15, scale: 4, nullable: true })
  metricValue: number;

  @Column({ name: 'expected_value', type: 'decimal', precision: 15, scale: 4, nullable: true })
  expectedValue: number;

  @Column({ name: 'deviation_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  deviationPercentage: number;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'data_source', length: 255 })
  dataSource: string;

  @Column({ type: 'jsonb', default: {} })
  detectionConfig: Record<string, any>;

  @Column({ length: 50, default: 'active' })
  status: string; // active, resolved, ignored

  @Column({ name: 'detected_at' })
  detectedAt: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
