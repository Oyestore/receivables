import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { DashboardWidget } from './dashboard-widget.entity';
import { DashboardVersion } from './dashboard-version.entity';
import { DashboardCollaboration } from './dashboard-collaboration.entity';
import { User } from './user.entity';

export enum DashboardType {
  BUSINESS = 'business',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  CUSTOM = 'custom'
}

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DashboardType,
    default: DashboardType.CUSTOM
  })
  type: DashboardType;

  @Column({ type: 'jsonb', default: {} })
  layout: Record<string, any>;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => DashboardWidget, widget => widget.dashboard, { cascade: true })
  widgets: DashboardWidget[];

  @OneToMany(() => DashboardVersion, version => version.dashboard, { cascade: true })
  versions: DashboardVersion[];

  @OneToMany(() => DashboardCollaboration, collaboration => collaboration.dashboard, { cascade: true })
  collaborations: DashboardCollaboration[];

  @ManyToMany(() => User, user => user.sharedDashboards)
  @JoinTable({
    name: 'dashboard_shares',
    joinColumn: { name: 'dashboard_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  sharedWith: User[];

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'last_accessed_at', nullable: true })
  lastAccessedAt: Date;

  @Column({ name: 'access_count', default: 0 })
  accessCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
