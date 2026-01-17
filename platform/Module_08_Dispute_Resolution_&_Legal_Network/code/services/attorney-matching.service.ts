import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalProviderProfile } from '../entities/legal-provider-profile.entity';
import { DisputeCase, DisputeType } from '../entities/dispute-case.entity';
import { CollectionCase } from '../entities/collection-case.entity';
import { CommunicationAdapter } from '../integrations/adapters/communication.adapter';

interface MatchCriteria {
    caseType: DisputeType | string;
    amount: number;
    location?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    languagePreference?: string;
}

interface MatchScore {
    lawerId: string;
    lawyer: LegalProviderProfile;
    score: number;
    breakdown: {
        specializationMatch: number;
        locationMatch: number;
        performanceScore: number;
        availabilityScore: number;
        experienceScore: number;
    };
}

@Injectable()
export class AttorneyMatchingService {
    private readonly logger = new Logger(AttorneyMatchingService.name);

    // Scoring weights
    private readonly WEIGHTS = {
        specialization: 0.35,
        location: 0.20,
        performance: 0.25,
        availability: 0.10,
        experience: 0.10,
    };

    constructor(
        @InjectRepository(LegalProviderProfile)
        private legalProviderRepo: Repository<LegalProviderProfile>,
        @InjectRepository(DisputeCase)
        private disputeCaseRepo: Repository<DisputeCase>,
        @InjectRepository(CollectionCase)
        private collectionCaseRepo: Repository<CollectionCase>,
        private communicationAdapter: CommunicationAdapter,
    ) { }

    /**
     * Find best matching attorney for a dispute
     */
    async findBestMatch(disputeId: string, tenantId: string, topN: number = 5): Promise<MatchScore[]> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new NotFoundException(`Dispute ${disputeId} not found`);
        }

        const criteria: MatchCriteria = {
            caseType: dispute.type,
            amount: Number(dispute.disputedAmount),
            urgency: this.determineUrgency(dispute.priority as any),
        };

        return this.matchLawyers(criteria, tenantId, topN);
    }

    /**
     * Find best matching attorney for a collection case
     */
    async findBestMatchForCollection(
        collectionCaseId: string,
        tenantId: string,
        topN: number = 5,
    ): Promise<MatchScore[]> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: collectionCaseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${collectionCaseId} not found`);
        }

        const criteria: MatchCriteria = {
            caseType: 'collection',
            amount: Number(collectionCase.outstandingAmount),
            urgency: collectionCase.daysOverdue > 90 ? 'urgent' : 'medium',
        };

        return this.matchLawyers(criteria, tenantId, topN);
    }

    /**
     * Core matching algorithm
     */
    async matchLawyers(
        criteria: MatchCriteria,
        tenantId: string,
        topN: number = 5,
    ): Promise<MatchScore[]> {
        // Get all active, verified lawyers
        const lawyers = await this.legalProviderRepo.find({
            where: {
                tenantId,
                isActive: true,
                isVerified: true,
            },
        });

        if (lawyers.length === 0) {
            this.logger.warn('No active verified lawyers found');
            return [];
        }

        // Score each lawyer
        const scores: MatchScore[] = [];

        for (const lawyer of lawyers) {
            const score = this.calculateMatchScore(lawyer, criteria);
            scores.push({
                lawerId: lawyer.id,
                lawyer,
                score: score.total,
                breakdown: score.breakdown,
            });
        }

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);

        // Return top N
        const topMatches = scores.slice(0, topN);

        this.logger.log(
            `Found ${topMatches.length} matching lawyers for case type ${criteria.caseType}, amount ${criteria.amount}`,
        );

        return topMatches;
    }

    /**
     * Calculate match score for a lawyer
     */
    private calculateMatchScore(
        lawyer: LegalProviderProfile,
        criteria: MatchCriteria,
    ): { total: number; breakdown: MatchScore['breakdown'] } {
        const breakdown = {
            specializationMatch: this.scoreSpecialization(lawyer, criteria.caseType),
            locationMatch: this.scoreLocation(lawyer, criteria.location),
            performanceScore: this.scorePerformance(lawyer),
            availabilityScore: this.scoreAvailability(lawyer),
            experienceScore: this.scoreExperience(lawyer, criteria.amount),
        };

        const total =
            breakdown.specializationMatch * this.WEIGHTS.specialization +
            breakdown.locationMatch * this.WEIGHTS.location +
            breakdown.performanceScore * this.WEIGHTS.performance +
            breakdown.availabilityScore * this.WEIGHTS.availability +
            breakdown.experienceScore * this.WEIGHTS.experience;

        return { total, breakdown };
    }

    /**
     * Score specialization match (0-100)
     */
    private scoreSpecialization(lawyer: LegalProviderProfile, caseType: string): number {
        // Check if any specialization matches
        const specializations = lawyer.specializations || [];
        const specializationStrings = specializations.map(s => s.toLowerCase());

        // Exact match
        if (specializationStrings.includes(caseType.toLowerCase())) {
            return 100;
        }

        // Partial matches
        if (caseType === 'non_payment' && specializationStrings.some(s => s.includes('debt'))) {
            return 90;
        }
        if (caseType === 'collection' && specializationStrings.some(s => s.includes('debt') || s.includes('recovery'))) {
            return 95;
        }
        if (caseType === 'contract_breach' && specializationStrings.some(s => s.includes('contract'))) {
            return 90;
        }

        // General commercial law
        if (specializationStrings.some(s => s.includes('commercial') || s.includes('corporate'))) {
            return 60;
        }

        // No match
        return 30;
    }

    /**
     * Score location match (0-100)
     */
    private scoreLocation(lawyer: LegalProviderProfile, preferredLocation?: string): number {
        if (!preferredLocation) {
            return 50; // Neutral if no preference
        }

        const lawyerLocation = lawyer.contactInfo?.address?.city?.toLowerCase() || '';

        if (lawyerLocation === preferredLocation.toLowerCase()) {
            return 100;
        }

        // Partial match (same state/region)
        if (lawyerLocation.includes(preferredLocation.toLowerCase()) ||
            preferredLocation.toLowerCase().includes(lawyerLocation)) {
            return 70;
        }

        return 30;
    }

    /**
     * Score performance (0-100)
     */
    private scorePerformance(lawyer: LegalProviderProfile): number {
        const successRate = lawyer.successRate || 0;
        const avgRating = Number(lawyer.rating) || 3.0;

        // Success rate contributes 60%, rating contributes 40%
        const successScore = successRate;
        const ratingScore = (avgRating / 5.0) * 100;

        return successScore * 0.6 + ratingScore * 0.4;
    }

    /**
     * Score availability (0-100)
     */
    private scoreAvailability(lawyer: LegalProviderProfile): number {
        const activeCases = lawyer.activeCases || 0;
        const casesCompleted = lawyer.totalCasesHandled - activeCases || 0;
        const totalCases = activeCases + casesCompleted;

        // High availability if few active cases
        if (activeCases === 0) {
            return 100;
        }

        if (activeCases < 5) {
            return 90;
        }

        if (activeCases < 10) {
            return 70;
        }

        if (activeCases < 20) {
            return 50;
        }

        return 30;
    }

    /**
     * Score experience based on case amount (0-100)
     */
    private scoreExperience(lawyer: LegalProviderProfile, amount: number): number {
        const yearsOfExperience = lawyer.yearsOfExperience || 0;
        const casesCompleted = lawyer.successfulResolutions || 0;

        // Experience score based on years and cases
        let experienceScore = Math.min((yearsOfExperience / 10) * 50, 50); // Max 50 from years
        experienceScore += Math.min((casesCompleted / 100) * 50, 50); // Max 50 from cases

        // Adjust based on case amount complexity
        if (amount > 1000000 && yearsOfExperience < 5) {
            // High-value cases need experienced lawyers
            return experienceScore * 0.5;
        }

        if (amount < 50000 && yearsOfExperience > 10) {
            // May be overqualified
            return experienceScore * 0.9;
        }

        return experienceScore;
    }

    /**
     * Auto-assign best matching lawyer
     */
    async autoAssign(disputeId: string, tenantId: string): Promise<LegalProviderProfile> {
        const matches = await this.findBestMatch(disputeId, tenantId, 1);

        if (matches.length === 0) {
            throw new NotFoundException('No suitable lawyers found');
        }

        const bestMatch = matches[0];

        // Update dispute with assignment
        await this.disputeCaseRepo.update(
            { id: disputeId },
            {
                assignedLegalProviderId: bestMatch.lawyer.id,
            },
        );

        this.logger.log(
            `Auto-assigned dispute ${disputeId} to lawyer ${bestMatch.lawyer.firmName} (score: ${bestMatch.score.toFixed(2)})`,
        );

        // Send notification to lawyer
        await this.communicationAdapter.sendProviderNotification({
            to: bestMatch.lawyer.contactInfo.email,
            providerName: bestMatch.lawyer.firmName,
            type: 'case_assignment',
            caseId: disputeId,
            details: {
                matchScore: bestMatch.score.toFixed(2),
                assignedAt: new Date().toISOString()
            }
        });

        return bestMatch.lawyer;
    }

    /**
     * Get lawyer recommendations with explanations
     */
    async getRecommendations(
        disputeId: string,
        tenantId: string,
    ): Promise<Array<{
        lawyer: LegalProviderProfile;
        score: number;
        reasoning: string[];
    }>> {
        const matches = await this.findBestMatch(disputeId, tenantId, 3);

        return matches.map(match => ({
            lawyer: match.lawyer,
            score: match.score,
            reasoning: this.generateReasoning(match.breakdown),
        }));
    }

    /**
     * Generate human-readable reasoning
     */
    private generateReasoning(breakdown: MatchScore['breakdown']): string[] {
        const reasons: string[] = [];

        if (breakdown.specializationMatch >= 90) {
            reasons.push('Highly specialized in this case type');
        } else if (breakdown.specializationMatch >= 60) {
            reasons.push('Relevant specialization');
        }

        if (breakdown.performanceScore >= 80) {
            reasons.push('Excellent track record and client ratings');
        } else if (breakdown.performanceScore >= 60) {
            reasons.push('Good performance history');
        }

        if (breakdown.availabilityScore >= 80) {
            reasons.push('High availability for immediate engagement');
        } else if (breakdown.availabilityScore < 50) {
            reasons.push('Currently handling multiple cases');
        }

        if (breakdown.experienceScore >= 70) {
            reasons.push('Extensive experience with similar cases');
        }

        if (breakdown.locationMatch >= 80) {
            reasons.push('Local expertise in relevant jurisdiction');
        }

        return reasons;
    }

    /**
     * Determine urgency helper
     */
    private determineUrgency(priority: 'low' | 'medium' | 'high' | 'urgent'): 'low' | 'medium' | 'high' | 'urgent' {
        return priority || 'medium';
    }
}
