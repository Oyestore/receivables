import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualReview } from '../entities/manual-review.entity';
import { CreditDecision } from '../entities/credit-decision.entity';
import { ReviewStatus, ReviewType, ReviewPriority } from '../entities/manual-review.entity';

export interface CreateManualReviewDto {
  decisionId: string;
  reviewType: ReviewType;
  priority?: ReviewPriority;
  reviewerId: string;
  reviewerRole: string;
  reviewerName: string;
  reviewReason: string;
  dueDate: Date;
  conditions?: Array<{
    condition: string;
    description: string;
    isMandatory: boolean;
    dueDate?: Date;
  }>;
  supportingDocuments?: Array<{
    documentId: string;
    documentName: string;
    documentType: string;
  }>;
}

export interface UpdateManualReviewDto {
  status?: ReviewStatus;
  reviewNotes?: string;
  recommendation?: string;
  conditions?: Array<{
    condition: string;
    description: string;
    isMandatory: boolean;
    dueDate?: Date;
  }>;
  qualityScore?: number;
  overrideReason?: string;
}

@Injectable()
export class ManualReviewService {
  private readonly logger = new Logger(ManualReviewService.name);

  constructor(
    @InjectRepository(ManualReview)
    private manualReviewRepo: Repository<ManualReview>,
    @InjectRepository(CreditDecision)
    private creditDecisionRepo: Repository<CreditDecision>,
  ) {}

  /**
   * Create a manual review
   */
  async createManualReview(createManualReviewDto: CreateManualReviewDto, createdBy: string): Promise<ManualReview> {
    this.logger.log(`Creating manual review for decision: ${createManualReviewDto.decisionId}`);

    try {
      // Verify decision exists
      const decision = await this.creditDecisionRepo.findOne({ 
        where: { id: createManualReviewDto.decisionId } 
      });
      
      if (!decision) {
        throw new NotFoundException(`Decision with ID ${createManualReviewDto.decisionId} not found`);
      }

      const manualReview = this.manualReviewRepo.create({
        ...createManualReviewDto,
        assignedBy: createdBy,
        assignedAt: new Date(),
        status: ReviewStatus.PENDING,
        supportingDocuments: createManualReviewDto.supportingDocuments || [],
      });

      const savedReview = await this.manualReviewRepo.save(manualReview);

      // Update decision status
      decision.status = 'manual_review';
      decision.currentStep = 'manual_review';
      await this.creditDecisionRepo.save(decision);

      return savedReview;
    } catch (error) {
      this.logger.error(`Error creating manual review: ${error.message}`);
      throw new BadRequestException(`Failed to create manual review: ${error.message}`);
    }
  }

  /**
   * Get manual review by ID
   */
  async getManualReview(id: string): Promise<ManualReview> {
    const review = await this.manualReviewRepo.findOne({
      where: { id },
      relations: ['decision'],
    });

    if (!review) {
      throw new NotFoundException(`Manual review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(reviewerId: string, filters?: {
    status?: ReviewStatus;
    reviewType?: ReviewType;
    priority?: ReviewPriority;
  }): Promise<ManualReview[]> {
    const query = this.manualReviewRepo.createQueryBuilder('review')
      .leftJoinAndSelect('review.decision', 'decision')
      .where('review.reviewerId = :reviewerId', { reviewerId });

    if (filters?.status) {
      query.andWhere('review.status = :status', { status: filters.status });
    }
    if (filters?.reviewType) {
      query.andWhere('review.reviewType = :reviewType', { reviewType: filters.reviewType });
    }
    if (filters?.priority) {
      query.andWhere('review.priority = :priority', { priority: filters.priority });
    }

    return await query
      .orderBy('review.dueDate', 'ASC')
      .addOrderBy('review.priority', 'DESC')
      .getMany();
  }

  /**
   * Get reviews by decision
   */
  async getReviewsByDecision(decisionId: string): Promise<ManualReview[]> {
    return await this.manualReviewRepo.find({
      where: { decisionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update manual review status
   */
  async updateReviewStatus(id: string, updateDto: UpdateManualReviewDto, updatedBy: string): Promise<ManualReview> {
    const review = await this.getManualReview(id);

    try {
      const previousStatus = review.status;

      Object.assign(review, updateDto, { updatedBy });

      // Set timestamps based on status
      if (updateDto.status === ReviewStatus.IN_PROGRESS && previousStatus === ReviewStatus.PENDING) {
        review.startedAt = new Date();
      }

      if (updateDto.status === ReviewStatus.APPROVED || updateDto.status === ReviewStatus.REJECTED) {
        review.completedAt = new Date();
        
        // Update decision status
        if (review.decisionId) {
          const decision = await this.creditDecisionRepo.findOne({ 
            where: { id: review.decisionId } 
          });
          
          if (decision) {
            decision.status = updateDto.status === ReviewStatus.APPROVED ? 'approved' : 'rejected';
            decision.reviewerId = updatedBy;
            decision.reviewNotes = updateDto.reviewNotes;
            decision.reviewedAt = new Date();
            decision.finalizedAt = new Date();
            await this.creditDecisionRepo.save(decision);
          }
        }
      }

      return await this.manualReviewRepo.save(review);
    } catch (error) {
      this.logger.error(`Error updating manual review: ${error.message}`);
      throw new BadRequestException(`Failed to update manual review: ${error.message}`);
    }
  }

  /**
   * Assign reviewer to review
   */
  async assignReviewer(id: string, reviewerId: string, reviewerRole: string, reviewerName: string, assignedBy: string): Promise<ManualReview> {
    const review = await this.getManualReview(id);

    review.reviewerId = reviewerId;
    review.reviewerRole = reviewerRole;
    review.reviewerName = reviewerName;
    review.assignedBy = assignedBy;
    review.assignedAt = new Date();

    return await this.manualReviewRepo.save(review);
  }

  /**
   * Escalate review
   */
  async escalateReview(id: string, escalateTo: string, reason: string, escalatedBy: string): Promise<ManualReview> {
    const review = await this.getManualReview(id);

    const escalation = {
      escalatedAt: new Date(),
      escalatedBy,
      escalatedTo,
      reason,
    };

    review.escalationHistory = [...(review.escalationHistory || []), escalation];
    review.status = ReviewStatus.ESCALATED;

    return await this.manualReviewRepo.save(review);
  }

  /**
   * Add communication log entry
   */
  async addCommunication(id: string, message: string, senderId: string, senderRole: string, recipientId: string, recipientRole: string, type: 'note' | 'question' | 'response' | 'escalation' = 'note'): Promise<ManualReview> {
    const review = await this.getManualReview(id);

    const communication = {
      timestamp: new Date(),
      senderId,
      senderRole,
      recipientId,
      recipientRole,
      message,
      type,
    };

    review.communicationLog = [...(review.communicationLog || []), communication];

    return await this.manualReviewRepo.save(review);
  }

  /**
   * Get overdue reviews
   */
  async getOverdueReviews(): Promise<ManualReview[]> {
    const now = new Date();
    
    return await this.manualReviewRepo.createQueryBuilder('review')
      .leftJoinAndSelect('review.decision', 'decision')
      .where('review.dueDate < :now', { now })
      .andWhere('review.status IN (:...statuses)', { 
        statuses: [ReviewStatus.PENDING, ReviewStatus.IN_PROGRESS] 
      })
      .orderBy('review.dueDate', 'ASC')
      .getMany();
  }

  /**
   * Get review statistics
   */
  async getReviewStats(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.manualReviewRepo.createQueryBuilder('review');

    if (startDate && endDate) {
      query.where('review.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const reviews = await query.getMany();

    const stats = {
      totalReviews: reviews.length,
      statusDistribution: {
        pending: reviews.filter(r => r.status === ReviewStatus.PENDING).length,
        inProgress: reviews.filter(r => r.status === ReviewStatus.IN_PROGRESS).length,
        approved: reviews.filter(r => r.status === ReviewStatus.APPROVED).length,
        rejected: reviews.filter(r => r.status === ReviewStatus.REJECTED).length,
        escalated: reviews.filter(r => r.status === ReviewStatus.ESCALATED).length,
        cancelled: reviews.filter(r => r.status === ReviewStatus.CANCELLED).length,
      },
      reviewTypeDistribution: reviews.reduce((acc, r) => {
        acc[r.reviewType] = (acc[r.reviewType] || 0) + 1;
        return acc;
      }, {}),
      priorityDistribution: reviews.reduce((acc, r) => {
        acc[r.priority] = (acc[r.priority] || 0) + 1;
        return acc;
      }, {}),
      overdueReviews: reviews.filter(r => r.dueDate < new Date() && 
        [ReviewStatus.PENDING, ReviewStatus.IN_PROGRESS].includes(r.status)).length,
      averageQualityScore: reviews
        .filter(r => r.qualityScore !== null)
        .reduce((sum, r) => sum + r.qualityScore, 0) / 
        reviews.filter(r => r.qualityScore !== null).length || 0,
      averageProcessingTime: this.calculateAverageProcessingTime(reviews),
    };

    return stats;
  }

  /**
   * Get reviewer workload
   */
  async getReviewerWorkload(reviewerId: string): Promise<any> {
    const reviews = await this.getReviewsByReviewer(reviewerId);

    const workload = {
      totalReviews: reviews.length,
      pendingReviews: reviews.filter(r => r.status === ReviewStatus.PENDING).length,
      inProgressReviews: reviews.filter(r => r.status === ReviewStatus.IN_PROGRESS).length,
      overdueReviews: reviews.filter(r => r.dueDate < new Date() && 
        [ReviewStatus.PENDING, ReviewStatus.IN_PROGRESS].includes(r.status)).length,
      averageCompletionTime: this.calculateAverageCompletionTime(reviews),
      approvalRate: this.calculateApprovalRate(reviews),
    };

    return workload;
  }

  /**
   * Private helper methods
   */

  private calculateAverageProcessingTime(reviews: ManualReview[]): number {
    const completedReviews = reviews.filter(r => r.completedAt && r.assignedAt);
    
    if (completedReviews.length === 0) return 0;

    const totalTime = completedReviews.reduce((sum, r) => {
      return sum + (r.completedAt!.getTime() - r.assignedAt.getTime());
    }, 0);

    return totalTime / completedReviews.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateAverageCompletionTime(reviews: ManualReview[]): number {
    const completedReviews = reviews.filter(r => r.completedAt && r.startedAt);
    
    if (completedReviews.length === 0) return 0;

    const totalTime = completedReviews.reduce((sum, r) => {
      return sum + (r.completedAt!.getTime() - r.startedAt!.getTime());
    }, 0);

    return totalTime / completedReviews.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateApprovalRate(reviews: ManualReview[]): number {
    const completedReviews = reviews.filter(r => 
      [ReviewStatus.APPROVED, ReviewStatus.REJECTED].includes(r.status)
    );
    
    if (completedReviews.length === 0) return 0;

    const approvedReviews = completedReviews.filter(r => r.status === ReviewStatus.APPROVED);
    return (approvedReviews.length / completedReviews.length) * 100;
  }
}
