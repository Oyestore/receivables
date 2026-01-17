import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Milestone, MilestoneStatus, MilestoneType, MilestonePriority } from '../entities/milestone.entity';
import { MilestoneWorkflow } from '../entities/milestone-workflow.entity';
import { MilestoneOwner } from '../entities/milestone-owner.entity';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';

@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneWorkflow)
    private workflowRepository: Repository<MilestoneWorkflow>,
    @InjectRepository(MilestoneOwner)
    private ownerRepository: Repository<MilestoneOwner>,
    private dataSource: DataSource,
  ) {}

  async create(createMilestoneDto: CreateMilestoneDto, createdBy: string): Promise<Milestone> {
    this.logger.log(`Creating milestone: ${createMilestoneDto.title}`);

    // Validate workflow exists if provided
    if (createMilestoneDto.workflowId) {
      const workflow = await this.workflowRepository.findOne({
        where: { id: createMilestoneDto.workflowId, isDeleted: false },
      });
      if (!workflow) {
        throw new NotFoundException(`Workflow with ID ${createMilestoneDto.workflowId} not found`);
      }
    }

    // Validate dependencies exist
    if (createMilestoneDto.dependencies && createMilestoneDto.dependencies.length > 0) {
      const dependencies = await this.milestoneRepository.find({
        where: { 
          id: { $in: createMilestoneDto.dependencies },
          isDeleted: false 
        },
      });
      if (dependencies.length !== createMilestoneDto.dependencies.length) {
        throw new BadRequestException('One or more dependency milestones not found');
      }
    }

    const milestone = this.milestoneRepository.create({
      ...createMilestoneDto,
      createdBy,
      updatedBy: createdBy,
      status: MilestoneStatus.DRAFT,
      progressPercentage: 0,
      version: 1,
    });

    const savedMilestone = await this.milestoneRepository.save(milestone);

    // Update workflow milestone count
    if (createMilestoneDto.workflowId) {
      await this.workflowRepository.increment(
        { id: createMilestoneDto.workflowId },
        'totalMilestones',
        1,
      );
    }

    this.logger.log(`Milestone created successfully: ${savedMilestone.id}`);
    return savedMilestone;
  }

  async findAll(tenantId: string, filters?: {
    projectId?: string;
    workflowId?: string;
    status?: MilestoneStatus;
    type?: MilestoneType;
    priority?: MilestonePriority;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ milestones: Milestone[]; total: number }> {
    const {
      projectId,
      workflowId,
      status,
      type,
      priority,
      search,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (projectId) where.projectId = projectId;
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;
    if (type) where.milestoneType = type;
    if (priority) where.priority = priority;
    if (search) {
      where.title = Like(`%${search}%`);
    }

    const [milestones, total] = await this.milestoneRepository.findAndCount({
      where,
      relations: ['owners', 'evidence', 'verifications'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { milestones, total };
  }

  async findOne(id: string, tenantId: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: [
        'owners',
        'evidence',
        'verifications',
        'escalations',
        'statusProbes',
        'workflow',
      ],
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return milestone;
  }

  async update(id: string, updateMilestoneDto: UpdateMilestoneDto, updatedBy: string): Promise<Milestone> {
    this.logger.log(`Updating milestone: ${id}`);

    const milestone = await this.findOne(id, updateMilestoneDto.tenantId);

    // Validate workflow change
    if (updateMilestoneDto.workflowId && updateMilestoneDto.workflowId !== milestone.workflowId) {
      const workflow = await this.workflowRepository.findOne({
        where: { id: updateMilestoneDto.workflowId, isDeleted: false },
      });
      if (!workflow) {
        throw new NotFoundException(`Workflow with ID ${updateMilestoneDto.workflowId} not found`);
      }
    }

    // Validate dependencies
    if (updateMilestoneDto.dependencies) {
      const dependencies = await this.milestoneRepository.find({
        where: { 
          id: { $in: updateMilestoneDto.dependencies },
          isDeleted: false 
        },
      });
      if (dependencies.length !== updateMilestoneDto.dependencies.length) {
        throw new BadRequestException('One or more dependency milestones not found');
      }
    }

    // Check for circular dependencies
    if (updateMilestoneDto.dependencies && updateMilestoneDto.dependencies.includes(id)) {
      throw new BadRequestException('Milestone cannot depend on itself');
    }

    const oldWorkflowId = milestone.workflowId;
    const updatedMilestone = this.milestoneRepository.merge(milestone, {
      ...updateMilestoneDto,
      updatedBy,
      version: milestone.version + 1,
    });

    const savedMilestone = await this.milestoneRepository.save(updatedMilestone);

    // Update workflow milestone counts if workflow changed
    if (oldWorkflowId !== updateMilestoneDto.workflowId) {
      if (oldWorkflowId) {
        await this.workflowRepository.decrement(
          { id: oldWorkflowId },
          'totalMilestones',
          1,
        );
      }
      if (updateMilestoneDto.workflowId) {
        await this.workflowRepository.increment(
          { id: updateMilestoneDto.workflowId },
          'totalMilestones',
          1,
        );
      }
    }

    // Update workflow progress
    await this.updateWorkflowProgress(savedMilestone.workflowId);

    this.logger.log(`Milestone updated successfully: ${savedMilestone.id}`);
    return savedMilestone;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    this.logger.log(`Deleting milestone: ${id}`);

    const milestone = await this.findOne(id, tenantId);

    // Check if milestone can be deleted (not in progress)
    if ([MilestoneStatus.IN_PROGRESS, MilestoneStatus.COMPLETED].includes(milestone.status)) {
      throw new BadRequestException('Cannot delete milestone that is in progress or completed');
    }

    // Soft delete
    await this.milestoneRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    // Update workflow milestone count
    if (milestone.workflowId) {
      await this.workflowRepository.decrement(
        { id: milestone.workflowId },
        'totalMilestones',
        1,
      );
    }

    this.logger.log(`Milestone deleted successfully: ${id}`);
  }

  async updateProgress(id: string, progressPercentage: number, updatedBy: string): Promise<Milestone> {
    this.logger.log(`Updating milestone progress: ${id} to ${progressPercentage}%`);

    const milestone = await this.findOne(id, milestone.tenantId);

    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new BadRequestException('Progress percentage must be between 0 and 100');
    }

    const updatedMilestone = await this.milestoneRepository.save({
      ...milestone,
      progressPercentage,
      updatedBy,
      updatedAt: new Date(),
    });

    // Update workflow progress
    await this.updateWorkflowProgress(milestone.workflowId);

    // Auto-complete milestone if 100% progress
    if (progressPercentage === 100 && milestone.status === MilestoneStatus.IN_PROGRESS) {
      await this.completeMilestone(id, updatedBy);
    }

    return updatedMilestone;
  }

  async completeMilestone(id: string, completedBy: string): Promise<Milestone> {
    this.logger.log(`Completing milestone: ${id}`);

    const milestone = await this.findOne(id, milestone.tenantId);

    if (milestone.status === MilestoneStatus.COMPLETED) {
      throw new BadRequestException('Milestone is already completed');
    }

    if (milestone.status !== MilestoneStatus.IN_PROGRESS) {
      throw new BadRequestException('Milestone must be in progress to be completed');
    }

    const updatedMilestone = await this.milestoneRepository.save({
      ...milestone,
      status: MilestoneStatus.COMPLETED,
      progressPercentage: 100,
      completedDate: new Date(),
      updatedBy: completedBy,
      updatedAt: new Date(),
    });

    // Update workflow progress and completed count
    await this.updateWorkflowProgress(milestone.workflowId);

    // Check and start dependent milestones
    await this.startDependentMilestones(id);

    this.logger.log(`Milestone completed successfully: ${id}`);
    return updatedMilestone;
  }

  async startMilestone(id: string, startedBy: string): Promise<Milestone> {
    this.logger.log(`Starting milestone: ${id}`);

    const milestone = await this.findOne(id, milestone.tenantId);

    if (milestone.status !== MilestoneStatus.ACTIVE && milestone.status !== MilestoneStatus.PENDING) {
      throw new BadRequestException('Milestone must be active or pending to start');
    }

    // Check if all dependencies are completed
    if (milestone.dependencies && milestone.dependencies.length > 0) {
      const dependencies = await this.milestoneRepository.find({
        where: { id: { $in: milestone.dependencies }, isDeleted: false },
      });
      const incompleteDeps = dependencies.filter(dep => dep.status !== MilestoneStatus.COMPLETED);
      if (incompleteDeps.length > 0) {
        throw new BadRequestException('Cannot start milestone until all dependencies are completed');
      }
    }

    const updatedMilestone = await this.milestoneRepository.save({
      ...milestone,
      status: MilestoneStatus.IN_PROGRESS,
      progressPercentage: 0,
      startDate: new Date(),
      updatedBy: startedBy,
      updatedAt: new Date(),
    });

    this.logger.log(`Milestone started successfully: ${id}`);
    return updatedMilestone;
  }

  async getMilestoneAnalytics(tenantId: string, projectId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
    averageProgress: number;
  }> {
    const where: any = { tenantId, isDeleted: false };
    if (projectId) where.projectId = projectId;

    const [total, completed, inProgress, pending] = await Promise.all([
      this.milestoneRepository.count({ where }),
      this.milestoneRepository.count({ where: { ...where, status: MilestoneStatus.COMPLETED } }),
      this.milestoneRepository.count({ where: { ...where, status: MilestoneStatus.IN_PROGRESS } }),
      this.milestoneRepository.count({ where: { ...where, status: MilestoneStatus.PENDING } }),
    ]);

    // Count overdue milestones
    const overdue = await this.milestoneRepository.count({
      where: {
        ...where,
        dueDate: { $lt: new Date() },
        status: { $in: [MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS] },
      },
    });

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate average progress
    const progressResult = await this.milestoneRepository
      .createQueryBuilder('milestone')
      .select('AVG(milestone.progressPercentage)', 'avgProgress')
      .where(where)
      .getRawOne();
    
    const averageProgress = parseFloat(progressResult?.avgProgress) || 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      completionRate,
      averageProgress,
    };
  }

  private async updateWorkflowProgress(workflowId: string): Promise<void> {
    if (!workflowId) return;

    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId, isDeleted: false },
    });

    if (!workflow) return;

    const [totalMilestones, completedMilestones] = await Promise.all([
      this.milestoneRepository.count({
        where: { workflowId, isDeleted: false },
      }),
      this.milestoneRepository.count({
        where: { workflowId, status: MilestoneStatus.COMPLETED, isDeleted: false },
      }),
    ]);

    const progressPercentage = totalMilestones > 0 
      ? (completedMilestones / totalMilestones) * 100 
      : 0;

    await this.workflowRepository.update(workflowId, {
      totalMilestones,
      completedMilestones,
      progressPercentage,
      updatedAt: new Date(),
    });
  }

  private async startDependentMilestones(completedMilestoneId: string): Promise<void> {
    // Find milestones that depend on the completed milestone
    const dependentMilestones = await this.milestoneRepository.find({
      where: {
        dependencies: { $contains: [completedMilestoneId] },
        status: MilestoneStatus.ACTIVE,
        isDeleted: false,
      },
    });

    for (const milestone of dependentMilestones) {
      // Check if all dependencies are now completed
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        const dependencies = await this.milestoneRepository.find({
          where: { id: { $in: milestone.dependencies }, isDeleted: false },
        });
        const allCompleted = dependencies.every(dep => dep.status === MilestoneStatus.COMPLETED);
        
        if (allCompleted) {
          await this.milestoneRepository.update(milestone.id, {
            status: MilestoneStatus.PENDING,
            updatedAt: new Date(),
          });
        }
      }
    }
  }

  async duplicateMilestone(id: string, newTitle: string, duplicatedBy: string): Promise<Milestone> {
    this.logger.log(`Duplicating milestone: ${id}`);

    const originalMilestone = await this.findOne(id, originalMilestone.tenantId);

    const duplicatedMilestone = this.milestoneRepository.create({
      ...originalMilestone,
      id: undefined,
      title: newTitle,
      status: MilestoneStatus.DRAFT,
      progressPercentage: 0,
      completedDate: null,
      verifiedDate: null,
      approvedDate: null,
      actualHours: null,
      createdBy: duplicatedBy,
      updatedBy: duplicatedBy,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMilestone = await this.milestoneRepository.save(duplicatedMilestone);

    // Update workflow milestone count
    if (originalMilestone.workflowId) {
      await this.workflowRepository.increment(
        { id: originalMilestone.workflowId },
        'totalMilestones',
        1,
      );
    }

    this.logger.log(`Milestone duplicated successfully: ${savedMilestone.id}`);
    return savedMilestone;
  }

  async bulkUpdateStatus(milestoneIds: string[], status: MilestoneStatus, updatedBy: string): Promise<void> {
    this.logger.log(`Bulk updating status for ${milestoneIds.length} milestones to ${status}`);

    await this.milestoneRepository.update(milestoneIds, {
      status,
      updatedBy,
      updatedAt: new Date(),
    });

    // Update workflow progress for affected workflows
    const milestones = await this.milestoneRepository.find({
      where: { id: { $in: milestoneIds } },
      select: ['workflowId'],
    });

    const uniqueWorkflowIds = [...new Set(milestones.map(m => m.workflowId).filter(Boolean))];
    for (const workflowId of uniqueWorkflowIds) {
      await this.updateWorkflowProgress(workflowId);
    }

    this.logger.log(`Bulk status update completed`);
  }
}
