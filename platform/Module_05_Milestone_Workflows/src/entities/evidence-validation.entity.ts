import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MilestoneEvidence } from './milestone-evidence.entity';
import { Milestone } from './milestone.entity';

export interface Finding {
    type: 'PASS' | 'FAIL' | 'WARNING';
    requirement: string;
    observation: string;
    confidence: number;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Evidence Validation Entity
 * 
 * Stores AI-powered validation results for milestone evidence
 * Tracks auto-approval decisions and human feedback for learning
 */
@Entity('evidence_validations')
@Index(['evidenceId', 'createdAt'])
@Index(['status'])
@Index(['autoApproved'])
export class EvidenceValidation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    evidenceId: string;

    @Column({ type: 'uuid' })
    milestoneId: string;

    @Column({ type: 'varchar', length: 255 })
    tenantId: string;

    @Column({ type: 'varchar', length: 50 })
    status: string; // PENDING, AUTO_APPROVED, HUMAN_REVIEW_REQUIRED, APPROVED, REJECTED

    @Column({ type: 'decimal', precision: 3, scale: 2 })
    confidence: number; // 0-1

    @Column({ type: 'boolean' })
    isValid: boolean;

    @Column({ type: 'jsonb' })
    findings: Finding[];

    @Column({ type: 'jsonb' })
    matchedRequirements: string[];

    @Column({ type: 'jsonb' })
    missingRequirements: string[];

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    qualityScore: number; // 0-100

    @Column({ type: 'boolean', default: false })
    autoApproved: boolean;

    @Column({ type: 'boolean', default: false })
    requiresHumanReview: boolean;

    @Column({ type: 'text', nullable: true })
    reviewReason: string;

    // AI Model Details
    @Column({ type: 'varchar', length: 100, nullable: true })
    aiModelVersion: string;

    @Column({ type: 'jsonb', nullable: true })
    aiProcessingMetadata: {
        processingTime: number; // ms
        documentType: string;
        pageCount: number;
        analysisTypes: string[];
        mlServiceVersion: string;
    };

    // Document Analysis Results
    @Column({ type: 'jsonb', nullable: true })
    documentAnalysis: {
        textContent: string;
        extractedData: any;
        qualityMetrics: {
            resolution: number;
            clarity: number;
            completeness: number;
        };
    };

    // Human Feedback (for continuous learning)
    @Column({ type: 'boolean', nullable: true })
    humanAgreed: boolean; // Did human agree with AI decision?

    @Column({ type: 'text', nullable: true })
    humanFeedback: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    reviewedBy: string;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    approvedBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => MilestoneEvidence)
    @JoinColumn({ name: 'evidenceId' })
    evidence: MilestoneEvidence;

    @ManyToOne(() => Milestone)
    @JoinColumn({ name: 'milestoneId' })
    milestone: Milestone;
}
