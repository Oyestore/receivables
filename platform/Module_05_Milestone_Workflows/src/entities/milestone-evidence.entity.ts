import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Milestone } from './milestone.entity';

export enum EvidenceType {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  SCREENSHOT = 'SCREENSHOT',
  LOG_FILE = 'LOG_FILE',
  REPORT = 'REPORT',
  CERTIFICATE = 'CERTIFICATE',
  SIGNATURE = 'SIGNATURE',
  URL_LINK = 'URL_LINK',
  CUSTOM = 'CUSTOM',
}

export enum EvidenceStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('milestone_evidence')
@Index(['tenantId', 'status'])
@Index(['milestoneId', 'status'])
@Index(['evidenceType'])
@Index(['uploadedDate'])
export class MilestoneEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  milestoneId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EvidenceType,
    default: EvidenceType.DOCUMENT,
  })
  evidenceType: EvidenceType;

  @Column({
    type: 'enum',
    enum: EvidenceStatus,
    default: EvidenceStatus.PENDING,
  })
  status: EvidenceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verifiedBy: string;

  @Column({ type: 'varchar', length: 500 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  fileUrl: string;

  @Column({ type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fileHash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true })
  extractionData: any;

  @Column({ type: 'jsonb', nullable: true })
  verificationResults: any;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'date', nullable: true })
  uploadedDate: Date;

  @Column({ type: 'date', nullable: true })
  verifiedDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'integer', nullable: true })
  version: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentEvidenceId: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  categories: string[];

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Milestone, (milestone) => milestone.evidence)
  milestone: Milestone;
}
