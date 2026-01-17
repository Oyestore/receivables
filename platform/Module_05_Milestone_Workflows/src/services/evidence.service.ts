import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MilestoneEvidence, EvidenceType, EvidenceStatus } from '../entities/milestone-evidence.entity';
import { Milestone } from '../entities/milestone.entity';
import { CreateEvidenceDto } from '../dto/create-evidence.dto';
import { UpdateEvidenceDto } from '../dto/update-evidence.dto';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectRepository(MilestoneEvidence)
    private evidenceRepository: Repository<MilestoneEvidence>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    private dataSource: DataSource,
  ) {}

  async createEvidence(createDto: CreateEvidenceDto, uploadedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Creating evidence for milestone: ${createDto.milestoneId}`);

    // Validate milestone exists
    const milestone = await this.milestoneRepository.findOne({
      where: { id: createDto.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${createDto.milestoneId} not found`);
    }

    // Validate file if provided
    if (createDto.fileData && !this.isValidFileType(createDto.fileData.mimeType)) {
      throw new BadRequestException(`Invalid file type: ${createDto.fileData.mimeType}`);
    }

    const evidence = this.evidenceRepository.create({
      ...createDto,
      uploadedBy,
      updatedBy: uploadedBy,
      status: EvidenceStatus.PENDING,
      version: 1,
      verificationResults: {},
      accessLog: [],
      tags: createDto.tags || [],
      metadata: createDto.metadata || {},
    });

    const savedEvidence = await this.evidenceRepository.save(evidence);

    // Update milestone evidence count
    await this.milestoneRepository.increment(
      { id: createDto.milestoneId },
      'evidenceCount',
      1,
    );

    this.logger.log(`Evidence created: ${savedEvidence.id}`);
    return savedEvidence;
  }

  async updateEvidence(id: string, updateDto: UpdateEvidenceDto, updatedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Updating evidence: ${id}`);

    const evidence = await this.findEvidence(id);

    // Validate file update if provided
    if (updateDto.fileData && !this.isValidFileType(updateDto.fileData.mimeType)) {
      throw new BadRequestException(`Invalid file type: ${updateDto.fileData.mimeType}`);
    }

    const updatedEvidence = this.evidenceRepository.merge(evidence, {
      ...updateDto,
      updatedBy,
      version: evidence.version + 1,
    });

    const savedEvidence = await this.evidenceRepository.save(updatedEvidence);
    this.logger.log(`Evidence updated: ${savedEvidence.id}`);
    return savedEvidence;
  }

  async findEvidence(id: string): Promise<MilestoneEvidence> {
    const evidence = await this.evidenceRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['milestone'],
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence with ID ${id} not found`);
    }

    return evidence;
  }

  async findAllEvidence(tenantId: string, filters?: {
    milestoneId?: string;
    type?: EvidenceType;
    status?: EvidenceStatus;
    uploadedBy?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ evidence: MilestoneEvidence[]; total: number }> {
    const {
      milestoneId,
      type,
      status,
      uploadedBy,
      search,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (milestoneId) where.milestoneId = milestoneId;
    if (type) where.evidenceType = type;
    if (status) where.status = status;
    if (uploadedBy) where.uploadedBy = uploadedBy;

    const queryBuilder = this.evidenceRepository
      .createQueryBuilder('evidence')
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(evidence.title ILIKE :search OR evidence.description ILIKE :search OR evidence.fileName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [evidence, total] = await queryBuilder
      .leftJoinAndSelect('evidence.milestone', 'milestone')
      .orderBy('evidence.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { evidence, total };
  }

  async deleteEvidence(id: string): Promise<void> {
    this.logger.log(`Deleting evidence: ${id}`);

    const evidence = await this.findEvidence(id);

    // Check if evidence can be deleted (not verified or in use)
    if (evidence.status === EvidenceStatus.VERIFIED) {
      throw new BadRequestException('Cannot delete verified evidence');
    }

    // Soft delete
    await this.evidenceRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    // Update milestone evidence count
    await this.milestoneRepository.decrement(
      { id: evidence.milestoneId },
      'evidenceCount',
      1,
    );

    this.logger.log(`Evidence deleted: ${id}`);
  }

  async verifyEvidence(id: string, verificationData: any, verifiedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Verifying evidence: ${id}`);

    const evidence = await this.findEvidence(id);

    if (evidence.status !== EvidenceStatus.PENDING && evidence.status !== EvidenceStatus.SUBMITTED) {
      throw new BadRequestException('Evidence must be PENDING or SUBMITTED to verify');
    }

    const verificationResults = {
      ...evidence.verificationResults,
      verifiedBy,
      verifiedAt: new Date(),
      verificationStatus: verificationData.status,
      verificationComments: verificationData.comments,
      verificationScore: verificationData.score,
      verificationCriteria: verificationData.criteria,
      verificationEvidence: verificationData.verificationEvidence,
    };

    const updatedEvidence = await this.evidenceRepository.save({
      ...evidence,
      status: verificationData.status === 'approved' ? EvidenceStatus.VERIFIED : EvidenceStatus.REJECTED,
      verifiedBy,
      verifiedDate: new Date(),
      verificationResults,
      updatedBy: verifiedBy,
      updatedAt: new Date(),
    });

    // Update milestone verification status
    await this.updateMilestoneEvidenceStatus(evidence.milestoneId);

    this.logger.log(`Evidence verification completed: ${id}`);
    return updatedEvidence;
  }

  async submitForVerification(id: string, submittedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Submitting evidence for verification: ${id}`);

    const evidence = await this.findEvidence(id);

    if (evidence.status !== EvidenceStatus.PENDING) {
      throw new BadRequestException('Evidence must be PENDING to submit for verification');
    }

    const updatedEvidence = await this.evidenceRepository.save({
      ...evidence,
      status: EvidenceStatus.SUBMITTED,
      submittedDate: new Date(),
      submittedBy,
      updatedBy: submittedBy,
      updatedAt: new Date(),
    });

    // Trigger verification workflow
    await this.triggerVerificationWorkflow(id);

    this.logger.log(`Evidence submitted for verification: ${id}`);
    return updatedEvidence;
  }

  async addEvidenceTag(id: string, tags: string[], updatedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Adding tags to evidence: ${id}`);

    const evidence = await this.findEvidence(id);

    const updatedTags = [...new Set([...(evidence.tags || []), ...tags])];

    const updatedEvidence = await this.evidenceRepository.save({
      ...evidence,
      tags: updatedTags,
      updatedBy,
      updatedAt: new Date(),
    });

    this.logger.log(`Tags added to evidence: ${id}`);
    return updatedEvidence;
  }

  async removeEvidenceTag(id: string, tags: string[], updatedBy: string): Promise<MilestoneEvidence> {
    this.logger.log(`Removing tags from evidence: ${id}`);

    const evidence = await this.findEvidence(id);

    const updatedTags = evidence.tags?.filter(tag => !tags.includes(tag)) || [];

    const updatedEvidence = await this.evidenceRepository.save({
      ...evidence,
      tags: updatedTags,
      updatedBy,
      updatedAt: new Date(),
    });

    this.logger.log(`Tags removed from evidence: ${id}`);
    return updatedEvidence;
  }

  async getEvidenceAnalytics(tenantId: string, timeRange?: string): Promise<{
    totalEvidence: number;
    pendingEvidence: number;
    submittedEvidence: number;
    verifiedEvidence: number;
    rejectedEvidence: number;
    averageFileSize: number;
    evidenceByType: Record<EvidenceType, number>;
    uploadTrends: Array<{
      date: string;
      count: number;
    }>;
  }> {
    const where: any = { tenantId, isDeleted: false };

    if (timeRange) {
      const dateFilter = this.getDateFilter(timeRange);
      where.createdAt = dateFilter;
    }

    const [
      totalEvidence,
      pendingEvidence,
      submittedEvidence,
      verifiedEvidence,
      rejectedEvidence,
    ] = await Promise.all([
      this.evidenceRepository.count({ where }),
      this.evidenceRepository.count({ where: { ...where, status: EvidenceStatus.PENDING } }),
      this.evidenceRepository.count({ where: { ...where, status: EvidenceStatus.SUBMITTED } }),
      this.evidenceRepository.count({ where: { ...where, status: EvidenceStatus.VERIFIED } }),
      this.evidenceRepository.count({ where: { ...where, status: EvidenceStatus.REJECTED } }),
    ]);

    // Calculate average file size
    const avgSizeResult = await this.evidenceRepository
      .createQueryBuilder('evidence')
      .select('AVG(evidence.fileSize)', 'avgSize')
      .where({
        ...where,
        fileSize: { $ne: null },
      })
      .getRawOne();

    const averageFileSize = parseFloat(avgSizeResult?.avgSize) || 0;

    // Get evidence by type
    const evidenceByTypeResult = await this.evidenceRepository
      .createQueryBuilder('evidence')
      .select('evidence.evidenceType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('evidence.evidenceType')
      .getRawMany();

    const evidenceByType = evidenceByTypeResult.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {} as Record<EvidenceType, number>);

    // Get upload trends (last 30 days)
    const uploadTrends = await this.getUploadTrends(tenantId, timeRange);

    return {
      totalEvidence,
      pendingEvidence,
      submittedEvidence,
      verifiedEvidence,
      rejectedEvidence,
      averageFileSize,
      evidenceByType,
      uploadTrends,
    };
  }

  async getEvidenceByMilestone(milestoneId: string): Promise<MilestoneEvidence[]> {
    return this.evidenceRepository.find({
      where: {
        milestoneId,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async bulkUploadEvidence(milestoneId: string, files: any[], uploadedBy: string): Promise<MilestoneEvidence[]> {
    this.logger.log(`Bulk uploading ${files.length} evidence files for milestone: ${milestoneId}`);

    const uploadedEvidence: MilestoneEvidence[] = [];

    for (const file of files) {
      try {
        const evidenceData = {
          milestoneId,
          title: file.originalname,
          description: `Bulk uploaded file: ${file.originalname}`,
          evidenceType: this.getEvidenceTypeFromMimeType(file.mimetype),
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          filePath: file.path,
          fileUrl: file.url,
          fileData: {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
          uploadedBy,
        };

        const evidence = await this.createEvidence(evidenceData, uploadedBy);
        uploadedEvidence.push(evidence);
      } catch (error) {
        this.logger.error(`Failed to upload file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    this.logger.log(`Bulk upload completed: ${uploadedEvidence.length}/${files.length} files uploaded`);
    return uploadedEvidence;
  }

  async downloadEvidence(id: string, requestedBy: string): Promise<{
    fileData: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    this.logger.log(`Downloading evidence: ${id} by user: ${requestedBy}`);

    const evidence = await this.findEvidence(id);

    // Check access permissions
    if (!await this.hasAccessPermission(evidence.milestoneId, requestedBy)) {
      throw new BadRequestException('User does not have permission to access this evidence');
    }

    // Log access
    await this.logEvidenceAccess(id, requestedBy, 'DOWNLOAD');

    if (!evidence.fileData) {
      throw new NotFoundException('Evidence file data not found');
    }

    return {
      fileData: evidence.fileData.buffer,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
    };
  }

  // Private Helper Methods
  private isValidFileType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/avi',
      'audio/mpeg',
      'audio/wav',
      'text/plain',
      'text/csv',
    ];

    return allowedTypes.includes(mimeType);
  }

  private getEvidenceTypeFromMimeType(mimeType: string): EvidenceType {
    if (mimeType.startsWith('image/')) return EvidenceType.PHOTO;
    if (mimeType.startsWith('video/')) return EvidenceType.VIDEO;
    if (mimeType.startsWith('audio/')) return EvidenceType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return EvidenceType.DOCUMENT;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return EvidenceType.SPREADSHEET;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return EvidenceType.PRESENTATION;
    return EvidenceType.OTHER;
  }

  private async updateMilestoneEvidenceStatus(milestoneId: string): Promise<void> {
    const evidence = await this.evidenceRepository.find({
      where: { milestoneId, isDeleted: false },
    });

    const verifiedCount = evidence.filter(e => e.status === EvidenceStatus.VERIFIED).length;
    const totalCount = evidence.length;

    if (totalCount > 0) {
      const verificationPercentage = (verifiedCount / totalCount) * 100;
      
      await this.milestoneRepository.update(milestoneId, {
        evidenceVerificationPercentage: verificationPercentage,
        updatedAt: new Date(),
      });
    }
  }

  private async triggerVerificationWorkflow(evidenceId: string): Promise<void> {
    // Implementation for triggering verification workflow
    this.logger.log(`Triggering verification workflow for evidence: ${evidenceId}`);
  }

  private async hasAccessPermission(milestoneId: string, userId: string): Promise<boolean> {
    // Check if user has permission to access evidence
    // This would integrate with user permissions system
    return true; // Simplified for now
  }

  private async logEvidenceAccess(evidenceId: string, userId: string, action: string): Promise<void> {
    const evidence = await this.findEvidence(evidenceId);

    const accessLog = {
      timestamp: new Date(),
      userId,
      action,
      ipAddress: '127.0.0.1', // Would get from request
      userAgent: 'Unknown', // Would get from request
    };

    await this.evidenceRepository.update(evidenceId, {
      accessLog: [...(evidence.accessLog || []), accessLog],
      updatedAt: new Date(),
    });
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

  private async getUploadTrends(tenantId: string, timeRange?: string): Promise<Array<{
    date: string;
    count: number;
  }>> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = await this.evidenceRepository.count({
        where: {
          tenantId,
          isDeleted: false,
          createdAt: {
            $gte: new Date(dateStr),
            $lt: new Date(dateStr + 'T23:59:59.999Z'),
          },
        },
      });

      trends.push({ date: dateStr, count });
    }

    return trends;
  }
}
