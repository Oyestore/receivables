import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Dashboard } from './dashboard.entity';
import { User } from './user.entity';

@Entity('dashboard_collaboration')
@Unique(['dashboardId', 'userId'])
export class DashboardCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dashboard_id' })
  dashboardId: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.collaborations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, default: 'viewer' })
  role: string; // owner, editor, viewer

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @Column({ name: 'invited_by' })
  invitedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;

  @Column({ name: 'invited_at' })
  invitedAt: Date;

  @Column({ name: 'accepted_at', nullable: true })
  acceptedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
