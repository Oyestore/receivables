import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvidenceValidation, Finding } from '../entities/evidence-validation.entity';
import { MilestoneEvidence } from '../entities/milestone-evidence.entity';
import { Milestone } from '../entities/milestone.entity';
import { MLServiceConnector } from '../integrations/ml/ml-service.connector';

export interface ValidationResult {
    validationId: string;
    isValid: boolean;
    confidence: number;
    status: 'AUTO_APPROVED' | 'HUMAN_REVIEW_REQUIRED' | 'PENDING';
    findings: Finding[];
    qualityScore: number;
    requiresHumanReview: boolean;
}

/**
 * Evidence Validation Service
 * 
 * Orchestrates AI-powered evidence validation
 * Handles auto-approval logic and human feedback collection
 */
@Injectable()
export class EvidenceValidationService {
    private readonly logger = new Logger(EvidenceValidationService.name);

    // Auto-approval thresholds
    private readonly AUTO_APPROVE_CONFIDENCE = 0.90;
    private readonly AUTO_APPROVE_QUALITY = 85;
    private readonly HUMAN_REVIEW_CONFIDENCE = 0.70;

    constructor(
        @InjectRepository(EvidenceValidation)
        private readonly validationRepository: Repository<EvidenceValidation>,
        @InjectRepository(MilestoneEvidence)
        private readonly evidenceRepository: Repository<MilestoneEvidence>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        private readonly mlConnector: MLServiceConnector,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.logger.log('Evidence Validation Service initialized');
    }

    /**
     * Validate evidence using AI
     */
    async validateEvidence(evidenceId: string): Promise<ValidationResult> {
        try {
            this.logger.log(`Starting AI validation for evidence: ${evidenceId}`);

            const evidence = await this.evidenceRepository.findOne({
                where: { id: evidenceId, isDeleted: false },
                relations: ['milestone'],
            });

            if (!evidence) {
                throw new Error(`Evidence ${evidenceId} not found`);
            }

            const milestone = evidence.milestone;

            // Call ML service for evidence verification
            const mlResult = await this.mlConnector.verifyEvidenceWithAI(evidenceId, {
                type: evidence.evidenceType,
                fileUrl: evidence.fileUrl,
                requirements: milestone.verificationRequirements || [],
            });

            // Fallback to rule-based if ML unavailable
            if (!mlResult) {
                return this.ruleBasedValidation(evidence, milestone);
            }

            // Calculate comprehensive confidence score
            const confidence = this.calculateConfidenceScore(mlResult, evidence, milestone);

            // Create validation record
            const validation = await this.validationRepository.save({
                evidenceId: evidence.id,
                milestoneId: milestone.id,
                tenantId: milestone.tenantId,
                confidence,
                isValid: mlResult.isValid,
                findings: mlResult.findings || [],
                matchedRequirements: mlResult.matchedRequirements || [],
                missingRequirements: mlResult.missingRequirements || [],
                qualityScore: this.calculateQualityScore(mlResult),
                requiresHumanReview: this.shouldRequireHumanReview(confidence, mlResult, milestone),
                aiModelVersion: 'v1.0.0',
                aiProcessingMetadata: {
                    processingTime: 0,
                    documentType: evidence.evidenceType,
                    pageCount: 1,
                    analysisTypes: ['NLP', 'CV'],
                    mlServiceVersion: 'v1.0.0',
                },
                documentAnalysis: {
                    textContent: '',
                    extractedData: {},
                    qualityMetrics: {
                        resolution: 100,
                        clarity: 90,
                        completeness: mlResult.matchedRequirements.length /
                            (mlResult.matchedRequirements.length + mlResult.missingRequirements.length) * 100,
                    },
                },
                status: 'PENDING',
            });

            // Determine if auto-approve
            const shouldAutoApprove = this.shouldAutoApprove(validation);

            if (shouldAutoApprove) {
                await this.autoApproveEvidence(validation.id);
                validation.status = 'AUTO_APPROVED';
                validation.autoApproved = true;
            } else if (validation.requiresHumanReview) {
                validation.status = 'HUMAN_REVIEW_REQUIRED';
                await this.flagForHumanReview(validation.id, this.getReviewReason(validation));
            }

            await this.validationRepository.save(validation);

            // Emit validation event
            this.eventEmitter.emit('evidence.validated', {
                evidenceId: validation.evidenceId,
                milestoneId: validation.milestoneId,
                isValid: validation.isValid,
                confidence: validation.confidence,
                autoApproved: validation.autoApproved,
            });

            return {
                validationId: validation.id,
                isValid: validation.isValid,
                confidence: validation.confidence,
                status: validation.status as any,
                findings: validation.findings,
                qualityScore: validation.qualityScore,
                requiresHumanReview: validation.requiresHumanReview,
            };
        } catch (error) {
            this.logger.error(`Failed to validate evidence ${evidenceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Auto-approve evidence
     */
    async autoApproveEvidence(validationId: string): Promise<void> {
        try {
            const validation = await this.validationRepository.findOne({
                where: { id: validationId },
            });

            if (!validation) {
                throw new Error(`Validation ${validationId} not found`);
            }

            await this.validationRepository.update(validationId, {
                status: 'AUTO_APPROVED',
                autoApproved: true,
                approvedAt: new Date(),
                approvedBy: 'AI_SYSTEM',
            });

            // Update evidence status
            await this.evidenceRepository.update(validation.evidenceId, {
                status: 'APPROVED',
                approvedAt: new Date(),
            });

            // Emit auto-approval event
            this.eventEmitter.emit('evidence.auto.approved', {
                evidenceId: validation.evidenceId,
                milestoneId: validation.milestoneId,
                validationId: validation.id,
                confidence: validation.confidence,
            });

            this.logger.log(`Evidence auto-approved: ${validation.evidenceId}`);
        } catch (error) {
            this.logger.error(`Failed to auto-approve evidence: ${error.message}`);
            throw error;
        }
    }

    /**
     * Flag evidence for human review
     */
    async flagForHumanReview(validationId: string, reason: string): Promise<void> {
        try {
            await this.validationRepository.update(validationId, {
                status: 'HUMAN_REVIEW_REQUIRED',
                requiresHumanReview: true,
                reviewReason: reason,
            });

            const validation = await this.validationRepository.findOne({
                where: { id: validationId },
            });

            // Emit human review required event
            this.eventEmitter.emit('evidence.human.review.required', {
                evidenceId: validation.evidenceId,
                milestoneId: validation.milestoneId,
                reason,
                confidence: validation.confidence,
            });

            this.logger.log(`Evidence flagged for human review: ${validation.evidenceId}`);
        } catch (error) {
            this.logger.error(`Failed to flag for human review: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit human feedback for learning
     */
    async submitHumanFeedback(
        validationId: string,
        approved: boolean,
        feedback: string,
        reviewerId: string,
    ): Promise<void> {
        try {
            const validation = await this.validationRepository.findOne({
                where: { id: validationId },
            });

            if (!validation) {
                throw new Error(`Validation ${validationId} not found`);
            }

            const humanAgreed = approved === validation.isValid;

            await this.validationRepository.update(validationId, {
                humanAgreed,
                humanFeedback: feedback,
                reviewedBy: reviewerId,
                reviewedAt: new Date(),
                status: approved ? 'APPROVED' : 'REJECTED',
            });

            // Update evidence status
            await this.evidenceRepository.update(validation.evidenceId, {
                status: approved ? 'APPROVED' : 'REJECTED',
                approvedAt: approved ? new Date() : null,
            });

            // Emit feedback event for learning
            this.eventEmitter.emit('evidence.feedback.received', {
                validationId: validation.id,
                aiDecision: validation.isValid,
                humanDecision: approved,
                humanAgreed,
                confidence: validation.confidence,
                feedback,
            });

            this.logger.log(`Human feedback submitted for validation: ${validationId}`);
        } catch (error) {
            this.logger.error(`Failed to submit human feedback: ${error.message}`);
            throw error;
        }
    }

    /**
     * Determine if evidence should be auto-approved
     */
    private shouldAutoApprove(validation: EvidenceValidation): boolean {
        return (
            validation.confidence >= this.AUTO_APPROVE_CONFIDENCE &&
            validation.qualityScore >= this.AUTO_APPROVE_QUALITY &&
            validation.missingRequirements.length === 0 &&
            validation.findings.every(f => f.type !== 'FAIL') &&
            !validation.requiresHumanReview
        );
    }

    /**
     * Determine if human review is required
     */
    private shouldRequireHumanReview(
        confidence: number,
        mlResult: any,
        milestone: Milestone,
    ): boolean {
        // Always require human review for critical milestones
        if (milestone.priority === 'CRITICAL') {
            return true;
        }

        // Require review if confidence is too low
        if (confidence < this.HUMAN_REVIEW_CONFIDENCE) {
            return true;
        }

        // Require review if there are critical findings
        const hasCriticalFindings = mlResult.findings?.some(
            (f: Finding) => f.type === 'FAIL' && f.severity === 'HIGH'
        );

        return hasCriticalFindings;
    }

    /**
     * Calculate comprehensive confidence score
     */
    private calculateConfidenceScore(mlResult: any, evidence: any, milestone: Milestone): number {
        const weights = {
            mlConfidence: 0.40,        // ML model's confidence
            requirementMatch: 0.30,    // How well requirements matched
            documentQuality: 0.20,     // Document quality
            historicalAccuracy: 0.10,  // Historical accuracy for this type
        };

        const mlConfidence = mlResult.confidence || 0.5;
        const requirementMatch = mlResult.matchedRequirements.length /
            Math.max(1, mlResult.matchedRequirements.length + mlResult.missingRequirements.length);
        const documentQuality = 0.85; // TODO: Calculate from actual quality metrics
        const historicalAccuracy = 0.80; // TODO: Get from historical data

        return (
            weights.mlConfidence * mlConfidence +
            weights.requirementMatch * requirementMatch +
            weights.documentQuality * documentQuality +
            weights.historicalAccuracy * historicalAccuracy
        );
    }

    /**
     * Calculate quality score
     */
    private calculateQualityScore(mlResult: any): number {
        const baseScore = 70;
        const requirementBonus = mlResult.matchedRequirements.length * 5;
        const confidenceBonus = mlResult.confidence * 20;

        return Math.min(100, baseScore + requirementBonus + confidenceBonus);
    }

    /**
     * Get reason for human review
     */
    private getReviewReason(validation: EvidenceValidation): string {
        if (validation.confidence < this.HUMAN_REVIEW_CONFIDENCE) {
            return `Low confidence score (${(validation.confidence * 100).toFixed(0)}%)`;
        }

        if (validation.missingRequirements.length > 0) {
            return `Missing requirements: ${validation.missingRequirements.join(', ')}`;
        }

        const criticalFindings = validation.findings.filter(f => f.type === 'FAIL');
        if (criticalFindings.length > 0) {
            return `Critical findings: ${criticalFindings.map(f => f.requirement).join(', ')}`;
        }

        return 'Manual review recommended';
    }

    /**
     * Rule-based validation fallback
     */
    private async ruleBasedValidation(
        evidence: MilestoneEvidence,
        milestone: Milestone,
    ): Promise<ValidationResult> {
        this.logger.warn('Using rule-based validation fallback');

        // Simple validation logic
        const isValid = evidence.fileUrl && evidence.evidenceType;
        const confidence = isValid ? 0.60 : 0.30;

        const validation = await this.validationRepository.save({
            evidenceId: evidence.id,
            milestoneId: milestone.id,
            tenantId: milestone.tenantId,
            confidence,
            isValid,
            findings: [],
            matchedRequirements: [],
            missingRequirements: milestone.verificationRequirements || [],
            qualityScore: isValid ? 60 : 30,
            requiresHumanReview: true,
            status: 'HUMAN_REVIEW_REQUIRED',
            reviewReason: 'ML service unavailable - manual review required',
            aiModelVersion: 'RULE_BASED_FALLBACK',
        });

        return {
            validationId: validation.id,
            isValid,
            confidence,
            status: 'HUMAN_REVIEW_REQUIRED',
            findings: [],
            qualityScore: validation.qualityScore,
            requiresHumanReview: true,
        };
    }
}
