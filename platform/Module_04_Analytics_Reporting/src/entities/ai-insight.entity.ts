import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  PREDICTION = 'prediction',
  RECOMMENDATION = 'recommendation',
  ALERT = 'alert'
}

@Entity('ai_insights')
export class AIInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: InsightType
  })
  type: InsightType;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'data_sources', type: 'jsonb', default: [] })
  dataSources: string[];

  @Column({ type: 'jsonb', default: {} })
  insightData: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  recommendations: string[];

  @Column({ name: 'is_actionable', default: false })
  isActionable: boolean;

  @Column({ length: 50, default: 'new' })
  status: string; // new, reviewed, implemented, dismissed

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];
}
