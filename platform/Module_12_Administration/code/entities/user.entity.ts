import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked',
  PASSWORD_EXPIRED = 'password_expired',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
@Index(['tenantId', 'username'], { unique: true })
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column()
  tenantId: string;

  @Column({ length: 255 })
  username: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 100, nullable: true })
  jobTitle: string;

  @Column({ length: 100, nullable: true })
  employeeId: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @CreateDateColumn()
  createdDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  activatedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLogin: Date;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  passwordChangedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  passwordExpiresDate: Date;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ length: 255, nullable: true })
  mfaSecret: string;

  @Column({ type: 'jsonb', default: '[]' })
  mfaBackupCodes: string[];

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lockedUntil: Date;

  @Column({ type: 'jsonb', default: '{}' })
  preferences: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @UpdateDateColumn()
  updatedDate: Date;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}
