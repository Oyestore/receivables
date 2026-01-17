import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metric_name', length: 255 })
  metricName: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value: number;

  @Column({ name: 'metric_type', length: 50 })
  metricType: string;

  @Column({ name: 'data_source', length: 255 })
  dataSource: string;

  @Column({ type: 'jsonb', default: {} })
  dimensions: Record<string, any>;

  @Column({ name: 'recorded_at' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
