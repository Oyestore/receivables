import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Dashboard } from './dashboard.entity';

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  METRIC = 'metric',
  TEXT = 'text',
  IMAGE = 'image',
  FILTER = 'filter'
}

@Entity('dashboard_widgets')
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dashboard_id' })
  dashboardId: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: WidgetType
  })
  type: WidgetType;

  @Column({ type: 'jsonb', default: {} })
  position: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  dataSource: Record<string, any>;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ name: 'refresh_interval', default: 300 })
  refreshInterval: number; // seconds

  @Column({ name: 'last_refreshed_at', nullable: true })
  lastRefreshedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
