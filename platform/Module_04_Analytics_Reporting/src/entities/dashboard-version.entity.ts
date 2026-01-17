import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Dashboard } from './dashboard.entity';
import { User } from './user.entity';

@Entity('dashboard_versions')
@Unique(['dashboardId', 'version'])
export class DashboardVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dashboard_id' })
  dashboardId: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  @Column()
  version: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  layout: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  widgets: Record<string, any>;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
