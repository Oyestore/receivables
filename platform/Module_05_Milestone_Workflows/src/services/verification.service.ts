import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { MilestoneVerification, VerificationStatus, VerificationType } from '../entities/milestone-verification.entity';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneOwner } from '../entities/milestone-owner.entity';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { UpdateVerificationDto } from '../dto/update-verification.dto';
import { ApproveVerificationDto } from '../dto/approve-verification.dto';
import { RejectVerificationDto } from '../dto/reject-verification.dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(MilestoneVerification)
    private verificationRepository: Repository<MilestoneVerification>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneOwner)
    private ownerRepository: Repository<MilestoneOwner>,
    private dataSource: DataSource,
  ) {}

  async createVerification(createDto: CreateVerificationDto, createdBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Creating verification for milestone: ${createDto.milestoneId}`);

    // Validate milestone exists
    const milestone = await this.milestoneRepository.findOne({
      where: { id: createDto.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${createDto.milestoneId} not found`);
    }

    // Check if verification already exists
    const existingVerification = await this.verificationRepository.findOne({
      where: {
        milestoneId: createDto.milestoneId,
        verificationType: createDto.verificationType,
        isDeleted: false,
      },
    });

    if (existingVerification) {
      throw new BadRequestException(`Verification of type ${createDto.verificationType} already exists for this milestone`);
    }

    const verification = this.verificationRepository.create({
      ...createDto,
      createdBy,
      updatedBy: createdBy,
      status: VerificationStatus.PENDING,
      version: 1,
      verificationHistory: [],
      notifications: [],
      escalations: [],
    });

    const savedVerification = await this.verificationRepository.save(verification);

    // Initialize verification workflow
    await this.initializeVerificationWorkflow(savedVerification.id);

    this.logger.log(`Verification created: ${savedVerification.id}`);
    return savedVerification;
  }

  async updateVerification(id: string, updateDto: UpdateVerificationDto, updatedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Updating verification: ${id}`);

    const verification = await this.findVerification(id);

    const updatedVerification = this.verificationRepository.merge(verification, {
      ...updateDto,
      updatedBy,
      version: verification.version + 1,
    });

    const savedVerification = await this.verificationRepository.save(updatedVerification);
    this.logger.log(`Verification updated: ${savedVerification.id}`);
    return savedVerification;
  }

  async findVerification(id: string): Promise<MilestoneVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['milestone', 'verifiers'],
    });

    if (!verification) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }

    return verification;
  }

  async findAllVerifications(tenantId: string, filters?: {
    milestoneId?: string;
    status?: VerificationStatus;
    type?: VerificationType;
    verifierId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ verifications: MilestoneVerification[]; total: number }> {
    const {
      milestoneId,
      status,
      type,
      verifierId,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (milestoneId) where.milestoneId = milestoneId;
    if (status) where.status = status;
    if (type) where.verificationType = type;
    if (verifierId) where.verifierId = verifierId;

    const [verifications, total] = await this.verificationRepository.findAndCount({
      where,
      relations: ['milestone', 'verifiers'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { verifications, total };
  }

  async approveVerification(id: string, approveDto: ApproveVerificationDto, approvedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Approving verification: ${id}`);

    const verification = await this.findVerification(id);

    if (verification.status !== VerificationStatus.PENDING && verification.status !== VerificationStatus.IN_REVIEW) {
      throw new BadRequestException(`Verification must be PENDING or IN_REVIEW to approve`);
    }

    // Check if user is authorized verifier
    if (!await this.isAuthorizedVerifier(id, approvedBy)) {
      throw new BadRequestException(`User ${approvedBy} is not authorized to approve this verification`);
    }

    const approvalRecord = {
      approvedBy,
      approvedAt: new Date(),
      comments: approveDto.comments,
      evidence: approveDto.evidence || [],
      nextAction: approveDto.nextAction,
    };

    const updatedVerification = await this.verificationRepository.save({
      ...verification,
      status: VerificationStatus.APPROVED,
      approvedBy,
      approvedDate: new Date(),
      approvalComments: approveDto.comments,
      verificationHistory: [
        ...(verification.verificationHistory || []),
        {
          action: 'APPROVED',
          timestamp: new Date(),
          userId: approvedBy,
          comments: approveDto.comments,
        },
      ],
      updatedBy: approvedBy,
      updatedAt: new Date(),
    });

    // Update milestone status if all verifications are approved
    await this.updateMilestoneVerificationStatus(verification.milestoneId);

    // Trigger next actions
    if (approveDto.nextAction) {
      await this.executeNextAction(approveDto.nextAction, verification);
    }

    this.logger.log(`Verification approved: ${id}`);
    return updatedVerification;
  }

  async rejectVerification(id: string, rejectDto: RejectVerificationDto, rejectedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Rejecting verification: ${id}`);

    const verification = await this.findVerification(id);

    if (verification.status !== VerificationStatus.PENDING && verification.status !== VerificationStatus.IN_REVIEW) {
      throw new BadRequestException(`Verification must be PENDING or IN_REVIEW to reject`);
    }

    // Check if user is authorized verifier
    if (!await this.isAuthorizedVerifier(id, rejectedBy)) {
      throw new BadRequestException(`User ${rejectedBy} is not authorized to reject this verification`);
    }

    const rejectionRecord = {
      rejectedBy,
      rejectedAt: new Date(),
      reason: rejectDto.reason,
      comments: rejectDto.comments,
      requiredChanges: rejectDto.requiredChanges || [],
      resubmissionDeadline: rejectDto.resubmissionDeadline,
    };

    const updatedVerification = await this.verificationRepository.save({
      ...verification,
      status: VerificationStatus.REJECTED,
      rejectedBy,
      rejectedDate: new Date(),
      rejectionReason: rejectDto.reason,
      rejectionComments: rejectDto.comments,
      requiredChanges: rejectDto.requiredChanges,
      resubmissionDeadline: rejectDto.resubmissionDeadline,
      verificationHistory: [
        ...(verification.verificationHistory || []),
        {
          action: 'REJECTED',
          timestamp: new Date(),
          userId: rejectedBy,
          comments: rejectDto.comments,
          reason: rejectDto.reason,
        },
      ],
      updatedBy: rejectedBy,
      updatedAt: new Date(),
    });

    // Create escalation if critical
    if (rejectDto.createEscalation) {
      await this.createVerificationEscalation(id, rejectDto.reason, rejectedBy);
    }

    this.logger.log(`Verification rejected: ${id}`);
    return updatedVerification;
  }

  async submitForReview(id: string, submittedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Submitting verification for review: ${id}`);

    const verification = await this.findVerification(id);

    if (verification.status !== VerificationStatus.PENDING && verification.status !== VerificationStatus.DRAFT) {
      throw new BadRequestException(`Verification must be PENDING or DRAFT to submit for review`);
    }

    // Validate required evidence
    if (!verification.evidence || verification.evidence.length === 0) {
      throw new BadRequestException(`Verification must have evidence before submitting for review`);
    }

    const updatedVerification = await this.verificationRepository.save({
      ...verification,
      status: VerificationStatus.IN_REVIEW,
      submittedDate: new Date(),
      submittedBy,
      verificationHistory: [
        ...(verification.verificationHistory || []),
        {
          action: 'SUBMITTED_FOR_REVIEW',
          timestamp: new Date(),
          userId: submittedBy,
        },
      ],
      updatedBy: submittedBy,
      updatedAt: new Date(),
    });

    // Notify verifiers
    await this.notifyVerifiers(id);

    this.logger.log(`Verification submitted for review: ${id}`);
    return updatedVerification;
  }

  async requestResubmission(id: string, comments: string, requestedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Requesting verification resubmission: ${id}`);

    const verification = await this.findVerification(id);

    if (verification.status !== VerificationStatus.REJECTED) {
      throw new BadRequestException(`Verification must be REJECTED to request resubmission`);
    }

    const updatedVerification = await this.verificationRepository.save({
      ...verification,
      status: VerificationStatus.PENDING,
      resubmissionRequested: true,
      resubmissionRequestedDate: new Date(),
      resubmissionRequestedBy: requestedBy,
      verificationHistory: [
        ...(verification.verificationHistory || []),
        {
          action: 'RESUBMISSION_REQUESTED',
          timestamp: new Date(),
          userId: requestedBy,
          comments,
        },
      ],
      updatedBy: requestedBy,
      updatedAt: new Date(),
    });

    // Notify milestone owner
    await this.notifyMilestoneOwner(verification.milestoneId, 'RESUBMISSION_REQUESTED', comments);

    this.logger.log(`Verification resubmission requested: ${id}`);
    return updatedVerification;
  }

  async addEvidence(id: string, evidence: any[], addedBy: string): Promise<MilestoneVerification> {
    this.logger.log(`Adding evidence to verification: ${id}`);

    const verification = await this.findVerification(id);

    const updatedVerification = await this.verificationRepository.save({
      ...verification,
      evidence: [...(verification.evidence || []), ...evidence],
      verificationHistory: [
        ...(verification.verificationHistory || []),
        {
          action: 'EVIDENCE_ADDED',
          timestamp: new Date(),
          userId: addedBy,
          evidenceCount: evidence.length,
        },
      ],
      updatedBy: addedBy,
      updatedAt: new Date(),
    });

    this.logger.log(`Evidence added to verification: ${id}`);
    return updatedVerification;
  }

  async getVerificationHistory(id: string): Promise<any[]> {
    const verification = await this.findVerification(id);
    return verification.verificationHistory || [];
  }

  async getVerificationAnalytics(tenantId: string, timeRange?: string): Promise<{
    totalVerifications: number;
    pendingVerifications: number;
    approvedVerifications: number;
    rejectedVerifications: number;
    inReviewVerifications: number;
    averageVerificationTime: number;
    approvalRate: number;
    rejectionRate: number;
  }> {
    const where: any = { tenantId, isDeleted: false };

    if (timeRange) {
      // Add time range filter based on timeRange parameter
      const dateFilter = this.getDateFilter(timeRange);
      where.createdAt = dateFilter;
    }

    const [
      totalVerifications,
      pendingVerifications,
      approvedVerifications,
      rejectedVerifications,
      inReviewVerifications,
    ] = await Promise.all([
      this.verificationRepository.count({ where }),
      this.verificationRepository.count({ where: { ...where, status: VerificationStatus.PENDING } }),
      this.verificationRepository.count({ where: { ...where, status: VerificationStatus.APPROVED } }),
      this.verificationRepository.count({ where: { ...where, status: VerificationStatus.REJECTED } }),
      this.verificationRepository.count({ where: { ...where, status: VerificationStatus.IN_REVIEW } }),
    ]);

    const approvalRate = totalVerifications > 0 ? (approvedVerifications / totalVerifications) * 100 : 0;
    const rejectionRate = totalVerifications > 0 ? (rejectedVerifications / totalVerifications) * 100 : 0;

    // Calculate average verification time
    const avgTimeResult = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('AVG(verification.durationMinutes)', 'avgTime')
      .where({
        ...where,
        status: VerificationStatus.APPROVED,
        durationMinutes: Not(IsNull()),
      })
      .getRawOne();

    const averageVerificationTime = parseFloat(avgTimeResult?.avgTime) || 0;

    return {
      totalVerifications,
      pendingVerifications,
      approvedVerifications,
      rejectedVerifications,
      inReviewVerifications,
      averageVerificationTime,
      approvalRate,
      rejectionRate,
    };
  }

  async getVerifierWorkload(verifierId: string): Promise<{
    pendingVerifications: number;
    inReviewVerifications: number;
    overdueVerifications: number;
    averageProcessingTime: number;
  }> {
    const [pendingVerifications, inReviewVerifications] = await Promise.all([
      this.verificationRepository.count({
        where: {
          verifierId,
          status: VerificationStatus.PENDING,
          isDeleted: false,
        },
      }),
      this.verificationRepository.count({
        where: {
          verifierId,
          status: VerificationStatus.IN_REVIEW,
          isDeleted: false,
        },
      }),
    ]);

    // Count overdue verifications
    const overdueVerifications = await this.verificationRepository.count({
      where: {
        verifierId,
        status: [VerificationStatus.PENDING, VerificationStatus.IN_REVIEW],
        isDeleted: false,
        dueDate: { $lt: new Date() },
      },
    });

    // Calculate average processing time
    const avgTimeResult = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('AVG(verification.durationMinutes)', 'avgTime')
      .where({
        verifierId,
        status: VerificationStatus.APPROVED,
        isDeleted: false,
        durationMinutes: Not(IsNull()),
      })
      .getRawOne();

    const averageProcessingTime = parseFloat(avgTimeResult?.avgTime) || 0;

    return {
      pendingVerifications,
      inReviewVerifications,
      overdueVerifications,
      averageProcessingTime,
    };
  }

  // Private Helper Methods
  private async initializeVerificationWorkflow(verificationId: string): Promise<void> {
    const verification = await this.findVerification(verificationId);

    // Set up verification steps based on type
    const workflowSteps = this.getVerificationWorkflowSteps(verification.verificationType);

    for (const step of workflowSteps) {
      // Create verification step records or update verification with steps
      // This would be implemented based on specific workflow requirements
    }

    // Set due date if not set
    if (!verification.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Default 7 days

      await this.verificationRepository.update(verificationId, {
        dueDate,
        updatedAt: new Date(),
      });
    }
  }

  private getVerificationWorkflowSteps(type: VerificationType): any[] {
    const workflows = {
      [VerificationType.MANUAL]: [
        { step: 'EVIDENCE_COLLECTION', required: true },
        { step: 'INITIAL_REVIEW', required: true },
        { step: 'FINAL_APPROVAL', required: true },
      ],
      [VerificationType.AUTOMATED]: [
        { step: 'AUTOMATED_CHECK', required: true },
        { step: 'VALIDATION', required: false },
        { step: 'CONFIRMATION', required: true },
      ],
      [VerificationType.HYBRID]: [
        { step: 'AUTOMATED_CHECK', required: true },
        { step: 'MANUAL_REVIEW', required: true },
        { step: 'FINAL_APPROVAL', required: true },
      ],
      [VerificationType.PEER_REVIEW]: [
        { step: 'PEER_ASSIGNMENT', required: true },
        { step: 'PEER_REVIEW', required: true },
        { step: 'CONSENSUS_CHECK', required: false },
      ],
      [VerificationType.EXTERNAL]: [
        { step: 'EXTERNAL_SUBMISSION', required: true },
        { step: 'EXTERNAL_VALIDATION', required: true },
        { step: 'INTERNAL_REVIEW', required: true },
      ],
    };

    return workflows[type] || workflows[VerificationType.MANUAL];
  }

  private async isAuthorizedVerifier(verificationId: string, userId: string): Promise<boolean> {
    const verification = await this.findVerification(verificationId);

    // Check if user is assigned verifier
    if (verification.verifierId === userId) {
      return true;
    }

    // Check if user is milestone owner
    const milestoneOwner = await this.ownerRepository.findOne({
      where: {
        milestoneId: verification.milestoneId,
        ownerId: userId,
        isDeleted: false,
      },
    });

    if (milestoneOwner) {
      return true;
    }

    // Check if user has admin privileges (this would be implemented based on user role system)
    // For now, return false for non-assigned users
    return false;
  }

  private async updateMilestoneVerificationStatus(milestoneId: string): Promise<void> {
    const verifications = await this.verificationRepository.find({
      where: { milestoneId, isDeleted: false },
    });

    const allApproved = verifications.every(v => v.status === VerificationStatus.APPROVED);
    const anyRejected = verifications.some(v => v.status === VerificationStatus.REJECTED);

    if (allApproved) {
      await this.milestoneRepository.update(milestoneId, {
        verifiedDate: new Date(),
        updatedAt: new Date(),
      });
    } else if (anyRejected) {
      await this.milestoneRepository.update(milestoneId, {
        status: 'REQUIRES_REVIEW',
        updatedAt: new Date(),
      });
    }
  }

  private async executeNextAction(nextAction: string, verification: MilestoneVerification): Promise<void> {
    // Implement next action execution based on action type
    switch (nextAction) {
      case 'COMPLETE_MILESTONE':
        await this.completeMilestone(verification.milestoneId);
        break;
      case 'TRIGGER_PAYMENT':
        await this.triggerPayment(verification.milestoneId);
        break;
      case 'NOTIFY_STAKEHOLDERS':
        await this.notifyStakeholders(verification.milestoneId);
        break;
      case 'START_NEXT_MILESTONE':
        await this.startNextMilestone(verification.milestoneId);
        break;
      default:
        this.logger.warn(`Unknown next action: ${nextAction}`);
    }
  }

  private async completeMilestone(milestoneId: string): Promise<void> {
    await this.milestoneRepository.update(milestoneId, {
      status: 'COMPLETED',
      completedDate: new Date(),
      progressPercentage: 100,
      updatedAt: new Date(),
    });
  }

  private async triggerPayment(milestoneId: string): Promise<void> {
    // Integration with payment module would be implemented here
    this.logger.log(`Triggering payment for milestone: ${milestoneId}`);
  }

  private async notifyStakeholders(milestoneId: string): Promise<void> {
    // Implementation for stakeholder notifications
    this.logger.log(`Notifying stakeholders for milestone: ${milestoneId}`);
  }

  private async startNextMilestone(milestoneId: string): Promise<void> {
    // Find and start next milestone in sequence
    this.logger.log(`Starting next milestone after: ${milestoneId}`);
  }

  private async createVerificationEscalation(verificationId: string, reason: string, escalatedBy: string): Promise<void> {
    // Implementation for escalation creation
    this.logger.log(`Creating escalation for verification: ${verificationId}, reason: ${reason}`);
  }

  private async notifyVerifiers(verificationId: string): Promise<void> {
    const verification = await this.findVerification(verificationId);
    // Implementation for verifier notifications
    this.logger.log(`Notifying verifiers for verification: ${verificationId}`);
  }

  private async notifyMilestoneOwner(milestoneId: string, action: string, comments: string): Promise<void> {
    // Implementation for milestone owner notifications
    this.logger.log(`Notifying milestone owner: ${milestoneId}, action: ${action}`);
  }

  private getDateFilter(timeRange: string): any {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { $gte: startDate };
  }
}
