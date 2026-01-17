import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany } from 'typeorm';
import { Dashboard } from './dashboard.entity';
import { DashboardCollaboration } from './dashboard-collaboration.entity';
import { ReportExecution } from './report-execution.entity';
import { ScheduledReport } from './scheduled-report.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  firstName: string;

  @Column({ length: 255 })
  lastName: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'preferences', type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @Column({ name: 'timezone', default: 'UTC' })
  timezone: string;

  @OneToMany(() => Dashboard, dashboard => dashboard.creator)
  createdDashboards: Dashboard[];

  @ManyToMany(() => Dashboard, dashboard => dashboard.sharedWith)
  sharedDashboards: Dashboard[];

  @OneToMany(() => DashboardCollaboration, collaboration => collaboration.user)
  collaborations: DashboardCollaboration[];

  @OneToMany(() => ReportExecution, execution => execution.createdByUser)
  reportExecutions: ReportExecution[];

  @OneToMany(() => ScheduledReport, scheduledReport => scheduledReport.createdByUser)
  scheduledReports: ScheduledReport[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
