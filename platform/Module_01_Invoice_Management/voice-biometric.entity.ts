import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class VoiceBiometric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  organizationId: string;

  @Column('bytea')
  voiceprintTemplate: Buffer;

  @Column()
  enrollmentStatus: string; // 'pending', 'completed', 'failed'

  @Column('json')
  enrollmentHistory: {
    date: Date;
    status: string;
    confidence: number;
  }[];

  @Column()
  lastVerificationDate: Date;

  @Column()
  verificationSuccessRate: number;

  @Column('json')
  securitySettings: {
    confidenceThreshold: number;
    maxAttempts: number;
    lockoutPeriod: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
