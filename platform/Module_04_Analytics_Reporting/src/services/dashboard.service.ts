import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository, Like, FindManyOptions, In, Any } from 'typeorm';
import { Dashboard, DashboardType } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardVersion } from '../entities/dashboard-version.entity';
import { DashboardCollaboration } from '../entities/dashboard-collaboration.entity';
import { User } from '../entities/user.entity';
import { CreateDashboardDto, UpdateDashboardDto, DashboardQueryDto } from '../dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: Repository<Dashboard>,
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly versionRepository: Repository<DashboardVersion>,
    private readonly collaborationRepository: Repository<DashboardCollaboration>,
    private readonly userRepository: Repository<User>,
  ) {}

  async createDashboard(createDashboardDto: CreateDashboardDto, userId: string): Promise<Dashboard> {
    this.logger.log(`Creating dashboard: ${createDashboardDto.name} for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dashboard = this.dashboardRepository.create({
      ...createDashboardDto,
      createdBy: userId,
      creator: user,
    });

    const savedDashboard = await this.dashboardRepository.save(dashboard);

    // Create initial version
    await this.createVersion(savedDashboard.id, 'Initial version', savedDashboard.layout, [], userId);

    this.logger.log(`Dashboard created successfully: ${savedDashboard.id}`);
    return savedDashboard;
  }

  async getDashboards(query: DashboardQueryDto, userId: string): Promise<{ dashboards: Dashboard[]; total: number }> {
    this.logger.log(`Fetching dashboards for user: ${userId} with query: ${JSON.stringify(query)}`);

    const findOptions: FindManyOptions<Dashboard> = {
      where: [
        { createdBy: userId },
        { sharedWith: { id: userId } },
        { isPublic: true },
      ],
      relations: ['creator', 'widgets', 'sharedWith'],
      order: {},
    };

    // Apply filters
    if (query.search) {
      findOptions.where = [
        { name: Like(`%${query.search}%`), createdBy: userId },
        { name: Like(`%${query.search}%`), sharedWith: { id: userId } },
        { name: Like(`%${query.search}%`), isPublic: true },
      ];
    }

    if (query.type) {
      findOptions.where = [
        { type: query.type, createdBy: userId },
        { type: query.type, sharedWith: { id: userId } },
        { type: query.type, isPublic: true },
      ];
    }

    if (query.isPublic !== undefined) {
      findOptions.where = [
        { isPublic: query.isPublic, createdBy: userId },
        { isPublic: query.isPublic, sharedWith: { id: userId } },
        { isPublic: query.isPublic },
      ];
    }

    if (query.tags && query.tags.length > 0) {
      // For now, we'll skip tag filtering as it requires complex array operations
      // In a real implementation, you would use a custom query builder or raw SQL
      this.logger.warn('Tag filtering not implemented yet');
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    findOptions.order[sortBy] = sortOrder.toUpperCase();

    // Apply pagination
    if (query.page && query.limit) {
      findOptions.skip = (query.page - 1) * query.limit;
      findOptions.take = query.limit;
    }

    const [dashboards, total] = await this.dashboardRepository.findAndCount(findOptions);

    this.logger.log(`Found ${dashboards.length} dashboards out of ${total} total`);
    return { dashboards, total };
  }

  async getDashboardById(id: string, userId: string): Promise<Dashboard> {
    this.logger.log(`Fetching dashboard: ${id} for user: ${userId}`);

    const dashboard = await this.dashboardRepository.findOne({
      where: { id },
      relations: ['creator', 'widgets', 'versions', 'collaborations', 'sharedWith'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check access permissions
    if (!this.hasAccess(dashboard, userId)) {
      throw new UnauthorizedException('Access denied');
    }

    // Update access tracking
    await this.updateAccessStats(id);

    this.logger.log(`Dashboard fetched successfully: ${id}`);
    return dashboard;
  }

  async updateDashboard(id: string, updateDashboardDto: UpdateDashboardDto, userId: string): Promise<Dashboard> {
    this.logger.log(`Updating dashboard: ${id} for user: ${userId}`);

    const dashboard = await this.getDashboardById(id, userId);

    // Check edit permissions
    if (!this.hasEditAccess(dashboard, userId)) {
      throw new UnauthorizedException('Edit access denied');
    }

    // Create version before updating if layout changed
    if (updateDashboardDto.layout && JSON.stringify(updateDashboardDto.layout) !== JSON.stringify(dashboard.layout)) {
      await this.createVersion(
        id,
        'Layout updated',
        updateDashboardDto.layout,
        dashboard.widgets,
        userId,
      );
    }

    Object.assign(dashboard, updateDashboardDto);
    dashboard.version += 1;

    const updatedDashboard = await this.dashboardRepository.save(dashboard);

    this.logger.log(`Dashboard updated successfully: ${id}`);
    return updatedDashboard;
  }

  async deleteDashboard(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting dashboard: ${id} for user: ${userId}`);

    const dashboard = await this.getDashboardById(id, userId);

    // Check ownership
    if (dashboard.createdBy !== userId) {
      throw new UnauthorizedException('Only dashboard owner can delete');
    }

    await this.dashboardRepository.remove(dashboard);

    this.logger.log(`Dashboard deleted successfully: ${id}`);
  }

  async duplicateDashboard(id: string, name: string, userId: string): Promise<Dashboard> {
    this.logger.log(`Duplicating dashboard: ${id} as ${name} for user: ${userId}`);

    const originalDashboard = await this.getDashboardById(id, userId);

    const duplicatedDashboard = this.dashboardRepository.create({
      name,
      description: originalDashboard.description,
      type: originalDashboard.type,
      layout: originalDashboard.layout,
      isPublic: false,
      createdBy: userId,
      tags: originalDashboard.tags,
      metadata: originalDashboard.metadata,
    });

    const savedDashboard = await this.dashboardRepository.save(duplicatedDashboard);

    // Copy widgets
    if (originalDashboard.widgets) {
      for (const widget of originalDashboard.widgets) {
        const duplicatedWidget = this.widgetRepository.create({
          dashboardId: savedDashboard.id,
          name: widget.name,
          type: widget.type,
          position: widget.position,
          config: widget.config,
          dataSource: widget.dataSource,
          isVisible: widget.isVisible,
          refreshInterval: widget.refreshInterval,
        });
        await this.widgetRepository.save(duplicatedWidget);
      }
    }

    this.logger.log(`Dashboard duplicated successfully: ${savedDashboard.id}`);
    return savedDashboard;
  }

  async shareDashboard(id: string, userIds: string[], role: string, invitedBy: string): Promise<void> {
    this.logger.log(`Sharing dashboard: ${id} with users: ${userIds.join(', ')}`);

    const dashboard = await this.getDashboardById(id, invitedBy);

    // Check ownership
    if (dashboard.createdBy !== invitedBy) {
      throw new UnauthorizedException('Only dashboard owner can share');
    }

    for (const userId of userIds) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        continue;
      }

      const existingCollaboration = await this.collaborationRepository.findOne({
        where: { dashboardId: id, userId },
      });

      if (!existingCollaboration) {
        const collaboration = this.collaborationRepository.create({
          dashboardId: id,
          userId,
          role,
          invitedBy,
          invitedAt: new Date(),
        });
        await this.collaborationRepository.save(collaboration);
      }
    }

    this.logger.log(`Dashboard shared successfully: ${id}`);
  }

  async unshareDashboard(id: string, userId: string, invitedBy: string): Promise<void> {
    this.logger.log(`Unsharing dashboard: ${id} from user: ${userId}`);

    const dashboard = await this.getDashboardById(id, invitedBy);

    // Check ownership
    if (dashboard.createdBy !== invitedBy) {
      throw new UnauthorizedException('Only dashboard owner can unshare');
    }

    const collaboration = await this.collaborationRepository.findOne({
      where: { dashboardId: id, userId },
    });

    if (collaboration) {
      await this.collaborationRepository.remove(collaboration);
    }

    this.logger.log(`Dashboard unshared successfully: ${id}`);
  }

  async getDashboardVersions(id: string, userId: string): Promise<DashboardVersion[]> {
    this.logger.log(`Fetching versions for dashboard: ${id}`);

    const dashboard = await this.getDashboardById(id, userId);

    const versions = await this.versionRepository.find({
      where: { dashboardId: id },
      relations: ['creator'],
      order: { version: 'DESC' },
    });

    this.logger.log(`Found ${versions.length} versions for dashboard: ${id}`);
    return versions;
  }

  async restoreDashboardVersion(dashboardId: string, versionId: string, userId: string): Promise<Dashboard> {
    this.logger.log(`Restoring dashboard: ${dashboardId} to version: ${versionId}`);

    const dashboard = await this.getDashboardById(dashboardId, userId);
    const version = await this.versionRepository.findOne({
      where: { id: versionId, dashboardId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Check edit permissions
    if (!this.hasEditAccess(dashboard, userId)) {
      throw new UnauthorizedException('Edit access denied');
    }

    // Create version before restoring
    await this.createVersion(
      dashboardId,
      'Restored from version ' + version.version,
      dashboard.layout,
      dashboard.widgets,
      userId,
    );

    // Restore dashboard
    dashboard.layout = version.layout;
    dashboard.version += 1;

    const restoredDashboard = await this.dashboardRepository.save(dashboard);

    this.logger.log(`Dashboard restored successfully: ${dashboardId}`);
    return restoredDashboard;
  }

  private async createVersion(
    dashboardId: string,
    changeDescription: string,
    layout: Record<string, any>,
    widgets: DashboardWidget[],
    userId: string,
  ): Promise<DashboardVersion> {
    const latestVersion = await this.versionRepository.findOne({
      where: { dashboardId },
      order: { version: 'DESC' },
    });

    const version = this.versionRepository.create({
      dashboardId,
      version: (latestVersion?.version || 0) + 1,
      name: `Version ${(latestVersion?.version || 0) + 1}`,
      layout,
      widgets,
      createdBy: userId,
      changeDescription,
    });

    return await this.versionRepository.save(version);
  }

  private hasAccess(dashboard: Dashboard, userId: string): boolean {
    // Owner has full access
    if (dashboard.createdBy === userId) {
      return true;
    }

    // Public dashboards are accessible to all
    if (dashboard.isPublic) {
      return true;
    }

    // Check if shared with user
    if (dashboard.sharedWith && dashboard.sharedWith.some(user => user.id === userId)) {
      return true;
    }

    // Check collaboration
    if (dashboard.collaborations && dashboard.collaborations.some(collab => collab.userId === userId && collab.isActive)) {
      return true;
    }

    return false;
  }

  private hasEditAccess(dashboard: Dashboard, userId: string): boolean {
    // Owner has full access
    if (dashboard.createdBy === userId) {
      return true;
    }

    // Check collaboration with edit rights
    if (dashboard.collaborations) {
      const collaboration = dashboard.collaborations.find(collab => collab.userId === userId && collab.isActive);
      if (collaboration && (collaboration.role === 'owner' || collaboration.role === 'editor')) {
        return true;
      }
    }

    return false;
  }

  private async updateAccessStats(dashboardId: string): Promise<void> {
    await this.dashboardRepository.increment({ id: dashboardId }, 'accessCount', 1);
    await this.dashboardRepository.update({ id: dashboardId }, { lastAccessedAt: new Date() });
  }
}
