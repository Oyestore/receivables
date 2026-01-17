import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

export interface MetricValue {
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MetricThreshold {
  warning: number;
  critical: number;
  operator: 'greater_than' | 'less_than' | 'equals';
}

export interface MetricAggregation {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

@Entity('performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'jsonb', nullable: true })
  threshold?: MetricThreshold;

  @Column({ name: 'current_value', type: 'decimal', precision: 15, scale: 6 })
  currentValue: number;

  @Column({ name: 'target_value', type: 'decimal', precision: 15, scale: 6, nullable: true })
  targetValue?: number;

  @Column({ name: 'baseline_value', type: 'decimal', precision: 15, scale: 6, nullable: true })
  baselineValue?: number;

  @Column({ type: 'jsonb', nullable: true })
  aggregation?: MetricAggregation;

  @Column({ name: 'trend', type: 'varchar', length: 20, default: 'stable' })
  trend: 'improving' | 'stable' | 'declining';

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'normal' })
  status: 'normal' | 'warning' | 'critical';

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'collection_frequency', type: 'int', default: 60 })
  collectionFrequency: number; // in seconds

  @Column({ name: 'retention_period', type: 'int', default: 90 })
  retentionPeriod: number; // in days

  @Column({ name: 'workflow_instance_id', nullable: true })
  workflowInstanceId?: string;

  @ManyToOne(() => WorkflowInstance, { eager: false, nullable: true })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance?: WorkflowInstance;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'last_collected', type: 'timestamp', nullable: true })
  lastCollected?: Date;

  @Column({ name: 'next_collection', type: 'timestamp', nullable: true })
  nextCollection?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isWarning(): boolean {
    if (!this.threshold) return false;
    
    switch (this.threshold.operator) {
      case 'greater_than':
        return this.currentValue > this.threshold.warning;
      case 'less_than':
        return this.currentValue < this.threshold.warning;
      case 'equals':
        return Math.abs(this.currentValue - this.threshold.warning) < 0.001;
      default:
        return false;
    }
  }

  isCritical(): boolean {
    if (!this.threshold) return false;
    
    switch (this.threshold.operator) {
      case 'greater_than':
        return this.currentValue > this.threshold.critical;
      case 'less_than':
        return this.currentValue < this.threshold.critical;
      case 'equals':
        return Math.abs(this.currentValue - this.threshold.critical) < 0.001;
      default:
        return false;
    }
  }

  updateValue(value: number): void {
    this.currentValue = value;
    this.lastCollected = new Date();
    
    // Update status based on thresholds
    if (this.isCritical()) {
      this.status = 'critical';
    } else if (this.isWarning()) {
      this.status = 'warning';
    } else {
      this.status = 'normal';
    }
    
    // Update trend (simplified - would need historical data for real trend analysis)
    if (this.targetValue) {
      if (value > this.targetValue * 1.1) {
        this.trend = 'improving';
      } else if (value < this.targetValue * 0.9) {
        this.trend = 'declining';
      } else {
        this.trend = 'stable';
      }
    }
  }

  getPerformanceScore(): number {
    if (!this.targetValue) return 100;
    
    const ratio = this.currentValue / this.targetValue;
    
    if (this.threshold?.operator === 'less_than') {
      // For metrics where lower is better (e.g., response time)
      return Math.max(0, Math.min(100, (this.targetValue / this.currentValue) * 100));
    } else {
      // For metrics where higher is better (e.g., throughput)
      return Math.max(0, Math.min(100, (this.currentValue / this.targetValue) * 100));
    }
  }

  addTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }

  isWithinThreshold(): boolean {
    return !this.isWarning() && !this.isCritical();
  }

  getNextCollectionTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + (this.collectionFrequency * 1000));
  }

  shouldCollect(): boolean {
    if (!this.isActive) return false;
    if (!this.nextCollection) return true;
    return new Date() >= this.nextCollection;
  }
}
