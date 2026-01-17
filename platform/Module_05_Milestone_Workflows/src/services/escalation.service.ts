import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { MilestoneEscalation, EscalationStatus, EscalationSeverity, EscalationType } from '../entities/milestone-escalation.entity';
import { Milestone } from '../entities/milestone.entity';
import { CreateEscalationDto } from '../dto/create-escalation.dto';
import { UpdateEscalationDto } from '../dto/update-escalation.dto';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(MilestoneEscalation)
    private escalationRepository: Repository<MilestoneEscalation>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    private dataSource: DataSource,
  ) {}

  async createEscalation(createDto: CreateEscalationDto, createdBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Creating escalation for milestone: ${createDto.milestoneId}`);

    // Validate milestone exists
    const milestone = await this.milestoneRepository.findOne({
      where: { id: createDto.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${createDto.milestoneId} not found`);
    }

    // Check if escalation already exists for this milestone and type
    const existingEscalation = await this.escalationRepository.findOne({
      where: {
        milestoneId: createDto.milestoneId,
        escalationType: createDto.escalationType,
        status: Not(EscalationStatus.RESOLVED),
        isDeleted: false,
      },
    });

    if (existingEscalation) {
      throw new BadRequestException(`Active escalation of type ${createDto.escalationType} already exists for this milestone`);
    }

    const escalation = this.escalationRepository.create({
      ...createDto,
      createdBy,
      updatedBy: createdBy,
      status: EscalationStatus.ACTIVE,
      version: 1,
      escalationHistory: [],
      notifications: [],
      actions: [],
      resolutionSteps: [],
    });

    const savedEscalation = await this.escalationRepository.save(escalation);

    // Initialize escalation workflow
    await this.initializeEscalationWorkflow(savedEscalation.id);

    // Update milestone escalation status
    await this.updateMilestoneEscalationStatus(createDto.milestoneId);

    this.logger.log(`Escalation created: ${savedEscalation.id}`);
    return savedEscalation;
  }

  async updateEscalation(id: string, updateDto: UpdateEscalationDto, updatedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Updating escalation: ${id}`);

    const escalation = await this.findEscalation(id);

    const updatedEscalation = this.escalationRepository.merge(escalation, {
      ...updateDto,
      updatedBy,
      version: escalation.version + 1,
    });

    const savedEscalation = await this.escalationRepository.save(updatedEscalation);
    this.logger.log(`Escalation updated: ${savedEscalation.id}`);
    return savedEscalation;
  }

  async findEscalation(id: string): Promise<MilestoneEscalation> {
    const escalation = await this.escalationRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['milestone'],
    });

    if (!escalation) {
      throw new NotFoundException(`Escalation with ID ${id} not found`);
    }

    return escalation;
  }

  async findAllEscalations(tenantId: string, filters?: {
    milestoneId?: string;
    status?: EscalationStatus;
    severity?: EscalationSeverity;
    type?: EscalationType;
    escalatedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ escalations: MilestoneEscalation[]; total: number }> {
    const {
      milestoneId,
      status,
      severity,
      type,
      escalatedTo,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (milestoneId) where.milestoneId = milestoneId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.escalationType = type;
    if (escalatedTo) where.escalatedTo = escalatedTo;

    const [escalations, total] = await this.escalationRepository.findAndCount({
      where,
      relations: ['milestone'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { escalations, total };
  }

  async resolveEscalation(id: string, resolutionData: any, resolvedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Resolving escalation: ${id}`);

    const escalation = await this.findEscalation(id);

    if (escalation.status !== EscalationStatus.ACTIVE && escalation.status !== EscalationStatus.IN_PROGRESS) {
      throw new BadRequestException('Escalation must be ACTIVE or IN_PROGRESS to resolve');
    }

    const resolutionRecord = {
      resolvedBy,
      resolvedAt: new Date(),
      resolution: resolutionData.resolution,
      resolutionComments: resolutionData.comments,
      resolutionEvidence: resolutionData.evidence || [],
      followUpRequired: resolutionData.followUpRequired || false,
      followUpDate: resolutionData.followUpDate,
      preventionMeasures: resolutionData.preventionMeasures || [],
    };

    const updatedEscalation = await this.escalationRepository.save({
      ...escalation,
      status: EscalationStatus.RESOLVED,
      resolvedBy,
      resolvedDate: new Date(),
      resolution: resolutionData.resolution,
      resolutionComments: resolutionData.comments,
      resolutionEvidence: resolutionData.evidence || [],
      followUpRequired: resolutionData.followUpRequired || false,
      followUpDate: resolutionData.followUpDate,
      preventionMeasures: resolutionData.preventionMeasures || [],
      escalationHistory: [
        ...(escalation.escalationHistory || []),
        {
          action: 'RESOLVED',
          timestamp: new Date(),
          userId: resolvedBy,
          comments: resolutionData.comments,
        },
      ],
      updatedBy: resolvedBy,
      updatedAt: new Date(),
    });

    // Update milestone escalation status
    await this.updateMilestoneEscalationStatus(escalation.milestoneId);

    // Trigger post-resolution actions
    if (resolutionData.followUpRequired) {
      await this.scheduleFollowUp(id, resolutionData.followUpDate);
    }

    this.logger.log(`Escalation resolved: ${id}`);
    return updatedEscalation;
  }

  async escalateToNextLevel(id: string, escalationData: any, escalatedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Escalating to next level: ${id}`);

    const escalation = await this.findEscalation(id);

    if (escalation.status !== EscalationStatus.ACTIVE) {
      throw new BadRequestException('Escalation must be ACTIVE to escalate');
    }

    const nextLevelRecord = {
      escalatedBy,
      escalatedAt: new Date(),
      previousLevel: escalation.escalatedTo,
      newLevel: escalationData.escalatedTo,
      escalationReason: escalationData.reason,
      urgency: escalationData.urgency || escalation.severity,
      additionalContext: escalationData.additionalContext || {},
    };

    const updatedEscalation = await this.escalationRepository.save({
      ...escalation,
      escalatedTo: escalationData.escalatedTo,
      escalationLevel: (escalation.escalationLevel || 1) + 1,
      lastEscalatedDate: new Date(),
      escalationHistory: [
        ...(escalation.escalationHistory || []),
        {
          action: 'ESCALATED',
          timestamp: new Date(),
          userId: escalatedBy,
          from: escalation.escalatedTo,
          to: escalationData.escalatedTo,
          reason: escalationData.reason,
        },
      ],
      updatedBy: escalatedBy,
      updatedAt: new Date(),
    });

    // Notify new escalation target
    await this.notifyEscalationTarget(id, escalationData.escalatedTo);

    this.logger.log(`Escalation escalated to: ${escalationData.escalatedTo}`);
    return updatedEscalation;
  }

  async acknowledgeEscalation(id: string, acknowledgedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Acknowledging escalation: ${id}`);

    const escalation = await this.findEscalation(id);

    if (escalation.status !== EscalationStatus.ACTIVE) {
      throw new BadRequestException('Escalation must be ACTIVE to acknowledge');
    }

    const updatedEscalation = await this.escalationRepository.save({
      ...escalation,
      acknowledgedBy,
      acknowledgedDate: new Date(),
      status: EscalationStatus.IN_PROGRESS,
      escalationHistory: [
        ...(escalation.escalationHistory || []),
        {
          action: 'ACKNOWLEDGED',
          timestamp: new Date(),
          userId: acknowledgedBy,
        },
      ],
      updatedBy: acknowledgedBy,
      updatedAt: new Date(),
    });

    this.logger.log(`Escalation acknowledged: ${id}`);
    return updatedEscalation;
  }

  async addEscalationAction(id: string, actionData: any, addedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Adding action to escalation: ${id}`);

    const escalation = await this.findEscalation(id);

    const action = {
      id: Date.now().toString(),
      action: actionData.action,
      description: actionData.description,
      assignedTo: actionData.assignedTo,
      dueDate: actionData.dueDate,
      priority: actionData.priority || escalation.severity,
      status: 'PENDING',
      addedBy,
      addedAt: new Date(),
      completedAt: null,
      completionEvidence: [],
      comments: actionData.comments || '',
    };

    const updatedEscalation = await this.escalationRepository.save({
      ...escalation,
      actions: [...(escalation.actions || []), action],
      escalationHistory: [
        ...(escalation.escalationHistory || []),
        {
          action: 'ACTION_ADDED',
          timestamp: new Date(),
          userId: addedBy,
          actionId: action.id,
        },
      ],
      updatedBy: addedBy,
      updatedAt: new Date(),
    });

    // Notify action assignee
    if (action.assignedTo) {
      await this.notifyActionAssignee(id, action.id, action.assignedTo);
    }

    this.logger.log(`Action added to escalation: ${id}`);
    return updatedEscalation;
  }

  async completeEscalationAction(id: string, actionId: string, completionData: any, completedBy: string): Promise<MilestoneEscalation> {
    this.logger.log(`Completing action ${actionId} in escalation: ${id}`);

    const escalation = await this.findEscalation(id);

    const actionIndex = escalation.actions?.findIndex(a => a.id === actionId);
    if (actionIndex === -1) {
      throw new NotFoundException(`Action with ID ${actionId} not found in escalation`);
    }

    // Update action
    const updatedActions = [...(escalation.actions || [])];
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy,
      completionEvidence: completionData.evidence || [],
      completionComments: completionData.comments || '',
    };

    const updatedEscalation = await this.escalationRepository.save({
      ...escalation,
      actions: updatedActions,
      escalationHistory: [
        ...(escalation.escalationHistory || []),
        {
          action: 'ACTION_COMPLETED',
          timestamp: new Date(),
          userId: completedBy,
          actionId,
        },
      ],
      updatedBy: completedBy,
      updatedAt: new Date(),
    });

    // Check if all actions are completed
    const allActionsCompleted = updatedActions.every(a => a.status === 'COMPLETED');
    if (allActionsCompleted) {
      await this.escalationRepository.update(id, {
        status: EscalationStatus.RESOLVED,
        resolvedBy: completedBy,
        resolvedDate: new Date(),
        resolution: 'All actions completed successfully',
        updatedAt: new Date(),
      });
    }

    this.logger.log(`Action completed in escalation: ${id}`);
    return updatedEscalation;
  }

  async getEscalationAnalytics(tenantId: string, timeRange?: string): Promise<{
    totalEscalations: number;
    activeEscalations: number;
    resolvedEscalations: number;
    overdueEscalations: number;
    averageResolutionTime: number;
    escalationsBySeverity: Record<EscalationSeverity, number>;
    escalationsByType: Record<EscalationType, number>;
    resolutionTrends: Array<{
      date: string;
      resolved: number;
      created: number;
    }>;
  }> {
    const where: any = { tenantId, isDeleted: false };

    if (timeRange) {
      const dateFilter = this.getDateFilter(timeRange);
      where.createdAt = dateFilter;
    }

    const [
      totalEscalations,
      activeEscalations,
      resolvedEscalations,
    ] = await Promise.all([
      this.escalationRepository.count({ where }),
      this.escalationRepository.count({ where: { ...where, status: EscalationStatus.ACTIVE } }),
      this.escalationRepository.count({ where: { ...where, status: EscalationStatus.RESOLVED } }),
    ]);

    // Count overdue escalations
    const overdueEscalations = await this.escalationRepository.count({
      where: {
        ...where,
        status: [EscalationStatus.ACTIVE, EscalationStatus.IN_PROGRESS],
        dueDate: { $lt: new Date() },
      },
    });

    // Calculate average resolution time
    const avgTimeResult = await this.escalationRepository
      .createQueryBuilder('escalation')
      .select('AVG(escalation.resolutionDurationMinutes)', 'avgTime')
      .where({
        ...where,
        status: EscalationStatus.RESOLVED,
        resolutionDurationMinutes: Not(IsNull()),
      })
      .getRawOne();

    const averageResolutionTime = parseFloat(avgTimeResult?.avgTime) || 0;

    // Get escalations by severity
    const severityResult = await this.escalationRepository
      .createQueryBuilder('escalation')
      .select('escalation.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('escalation.severity')
      .getRawMany();

    const escalationsBySeverity = severityResult.reduce((acc, item) => {
      acc[item.severity] = parseInt(item.count);
      return acc;
    }, {} as Record<EscalationSeverity, number>);

    // Get escalations by type
    const typeResult = await this.escalationRepository
      .createQueryBuilder('escalation')
      .select('escalation.escalationType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('escalation.escalationType')
      .getRawMany();

    const escalationsByType = typeResult.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {} as Record<EscalationType, number>);

    // Get resolution trends
    const resolutionTrends = await this.getResolutionTrends(tenantId, timeRange);

    return {
      totalEscalations,
      activeEscalations,
      resolvedEscalations,
      overdueEscalations,
      averageResolutionTime,
      escalationsBySeverity,
      escalationsByType,
      resolutionTrends,
    };
  }

  async getEscalatorWorkload(escalatorId: string): Promise<{
    activeEscalations: number;
    overdueEscalations: number;
    highSeverityEscalations: number;
    averageResolutionTime: number;
  }> {
    const [activeEscalations, highSeverityEscalations] = await Promise.all([
      this.escalationRepository.count({
        where: {
          escalatedTo: escalatorId,
          status: [EscalationStatus.ACTIVE, EscalationStatus.IN_PROGRESS],
          isDeleted: false,
        },
      }),
      this.escalationRepository.count({
        where: {
          escalatedTo: escalatorId,
          status: [EscalationStatus.ACTIVE, EscalationStatus.IN_PROGRESS],
          severity: EscalationSeverity.HIGH,
          isDeleted: false,
        },
      }),
    ]);

    // Count overdue escalations
    const overdueEscalations = await this.escalationRepository.count({
      where: {
        escalatedTo: escalatorId,
        status: [EscalationStatus.ACTIVE, EscalationStatus.IN_PROGRESS],
        dueDate: { $lt: new Date() },
        isDeleted: false,
      },
    });

    // Calculate average resolution time
    const avgTimeResult = await this.escalationRepository
      .createQueryBuilder('escalation')
      .select('AVG(escalation.resolutionDurationMinutes)', 'avgTime')
      .where({
        escalatedTo: escalatorId,
        status: EscalationStatus.RESOLVED,
        isDeleted: false,
        resolutionDurationMinutes: Not(IsNull()),
      })
      .getRawOne();

    const averageResolutionTime = parseFloat(avgTimeResult?.avgTime) || 0;

    return {
      activeEscalations,
      overdueEscalations,
      highSeverityEscalations,
      averageResolutionTime,
    };
  }

  // Private Helper Methods
  private async initializeEscalationWorkflow(escalationId: string): Promise<void> {
    const escalation = await this.findEscalation(escalationId);

    // Set due date based on severity
    const dueDate = this.calculateDueDate(escalation.severity);

    await this.escalationRepository.update(escalationId, {
      dueDate,
      escalationLevel: escalation.escalationLevel || 1,
      updatedAt: new Date(),
    });

    // Notify escalation target
    if (escalation.escalatedTo) {
      await this.notifyEscalationTarget(escalationId, escalation.escalatedTo);
    }
  }

  private calculateDueDate(severity: EscalationSeverity): Date {
    const now = new Date();
    const hours = {
      [EscalationSeverity.LOW]: 72, // 3 days
      [EscalationSeverity.MEDIUM]: 48, // 2 days
      [EscalationSeverity.HIGH]: 24, // 1 day
      [EscalationSeverity.CRITICAL]: 4, // 4 hours
    }[severity] || 48;

    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  private async updateMilestoneEscalationStatus(milestoneId: string): Promise<void> {
    const escalations = await this.escalationRepository.find({
      where: { milestoneId, isDeleted: false },
    });

    const activeEscalations = escalations.filter(e => 
      e.status === EscalationStatus.ACTIVE || e.status === EscalationStatus.IN_PROGRESS
    );

    await this.milestoneRepository.update(milestoneId, {
      hasActiveEscalations: activeEscalations.length > 0,
      escalationCount: activeEscalations.length,
      updatedAt: new Date(),
    });
  }

  private async notifyEscalationTarget(escalationId: string, targetId: string): Promise<void> {
    // Implementation for notifying escalation target
    this.logger.log(`Notifying escalation target ${targetId} for escalation: ${escalationId}`);
  }

  private async notifyActionAssignee(escalationId: string, actionId: string, assigneeId: string): Promise<void> {
    // Implementation for notifying action assignee
    this.logger.log(`Notifying assignee ${assigneeId} for action ${actionId} in escalation: ${escalationId}`);
  }

  private async scheduleFollowUp(escalationId: string, followUpDate: Date): Promise<void> {
    // Implementation for scheduling follow-up
    this.logger.log(`Scheduling follow-up for escalation: ${escalationId} on ${followUpDate}`);
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

  private async getResolutionTrends(tenantId: string, timeRange?: string): Promise<Array<{
    date: string;
    resolved: number;
    created: number;
  }>> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const [resolved, created] = await Promise.all([
        this.escalationRepository.count({
          where: {
            tenantId,
            isDeleted: false,
            status: EscalationStatus.RESOLVED,
            resolvedDate: {
              $gte: new Date(dateStr),
              $lt: new Date(dateStr + 'T23:59:59.999Z'),
            },
          },
        }),
        this.escalationRepository.count({
          where: {
            tenantId,
            isDeleted: false,
            createdAt: {
              $gte: new Date(dateStr),
              $lt: new Date(dateStr + 'T23:59:59.999Z'),
            },
          },
        }),
      ]);

      trends.push({ date: dateStr, resolved, created });
    }

    return trends;
  }
}
