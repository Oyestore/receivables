import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { DashboardWidget, WidgetType } from '../entities/dashboard-widget.entity';
import { Dashboard } from '../entities/dashboard.entity';
import { CreateWidgetDto, UpdateWidgetDto, WidgetQueryDto } from '../dto/widget.dto';

@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly dashboardRepository: Repository<Dashboard>,
  ) {}

  async createWidget(createWidgetDto: CreateWidgetDto, dashboardId: string, userId: string): Promise<DashboardWidget> {
    this.logger.log(`Creating widget: ${createWidgetDto.name} for dashboard: ${dashboardId}`);

    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
      relations: ['collaborations'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check edit permissions
    if (!this.hasEditAccess(dashboard, userId)) {
      throw new BadRequestException('Edit access denied');
    }

    const widget = this.widgetRepository.create({
      ...createWidgetDto,
      dashboardId,
    });

    const savedWidget = await this.widgetRepository.save(widget);

    this.logger.log(`Widget created successfully: ${savedWidget.id}`);
    return savedWidget;
  }

  async getWidgets(dashboardId: string, query: WidgetQueryDto, userId: string): Promise<{ widgets: DashboardWidget[]; total: number }> {
    this.logger.log(`Fetching widgets for dashboard: ${dashboardId}`);

    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
      relations: ['collaborations'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check access permissions
    if (!this.hasAccess(dashboard, userId)) {
      throw new BadRequestException('Access denied');
    }

    const findOptions: FindManyOptions<DashboardWidget> = {
      where: { dashboardId },
      order: {},
    };

    // Apply filters
    if (query.search) {
      findOptions.where = { name: Like(`%${query.search}%`), dashboardId };
    }

    if (query.type) {
      findOptions.where = { type: query.type, dashboardId };
    }

    if (query.isVisible !== undefined) {
      findOptions.where = { isVisible: query.isVisible, dashboardId };
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'asc';
    
    if (findOptions.order) {
      (findOptions.order as any)[sortBy] = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    }

    // Apply pagination
    if (query.page && query.limit) {
      findOptions.skip = (query.page - 1) * query.limit;
      findOptions.take = query.limit;
    }

    const [widgets, total] = await this.widgetRepository.findAndCount(findOptions);

    this.logger.log(`Found ${widgets.length} widgets out of ${total} total`);
    return { widgets, total };
  }

  async getWidgetById(id: string, userId: string): Promise<DashboardWidget> {
    this.logger.log(`Fetching widget: ${id}`);

    const widget = await this.widgetRepository.findOne({
      where: { id },
      relations: ['dashboard', 'dashboard.collaborations'],
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    // Check access permissions
    if (!this.hasAccess(widget.dashboard, userId)) {
      throw new BadRequestException('Access denied');
    }

    this.logger.log(`Widget fetched successfully: ${id}`);
    return widget;
  }

  async updateWidget(id: string, updateWidgetDto: UpdateWidgetDto, userId: string): Promise<DashboardWidget> {
    this.logger.log(`Updating widget: ${id}`);

    const widget = await this.getWidgetById(id, userId);

    // Check edit permissions
    if (!this.hasEditAccess(widget.dashboard, userId)) {
      throw new BadRequestException('Edit access denied');
    }

    Object.assign(widget, updateWidgetDto);
    const updatedWidget = await this.widgetRepository.save(widget);

    this.logger.log(`Widget updated successfully: ${id}`);
    return updatedWidget;
  }

  async deleteWidget(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting widget: ${id}`);

    const widget = await this.getWidgetById(id, userId);

    // Check edit permissions
    if (!this.hasEditAccess(widget.dashboard, userId)) {
      throw new BadRequestException('Edit access denied');
    }

    await this.widgetRepository.remove(widget);

    this.logger.log(`Widget deleted successfully: ${id}`);
  }

  async duplicateWidget(id: string, name: string, position: Record<string, any>, userId: string): Promise<DashboardWidget> {
    this.logger.log(`Duplicating widget: ${id} as ${name}`);

    const originalWidget = await this.getWidgetById(id, userId);

    const duplicatedWidget = this.widgetRepository.create({
      dashboardId: originalWidget.dashboardId,
      name,
      type: originalWidget.type,
      position,
      config: originalWidget.config,
      dataSource: originalWidget.dataSource,
      isVisible: originalWidget.isVisible,
      refreshInterval: originalWidget.refreshInterval,
    });

    const savedWidget = await this.widgetRepository.save(duplicatedWidget);

    this.logger.log(`Widget duplicated successfully: ${savedWidget.id}`);
    return savedWidget;
  }

  async updateWidgetPositions(widgetPositions: Array<{ id: string; position: Record<string, any> }>, userId: string): Promise<void> {
    this.logger.log(`Updating positions for ${widgetPositions.length} widgets`);

    for (const { id, position } of widgetPositions) {
      const widget = await this.getWidgetById(id, userId);

      // Check edit permissions
      if (!this.hasEditAccess(widget.dashboard, userId)) {
        throw new BadRequestException(`Edit access denied for widget: ${id}`);
      }

      widget.position = position;
      await this.widgetRepository.save(widget);
    }

    this.logger.log(`Widget positions updated successfully`);
  }

  async refreshWidget(id: string, userId: string): Promise<DashboardWidget> {
    this.logger.log(`Refreshing widget: ${id}`);

    const widget = await this.getWidgetById(id, userId);

    // Update last refreshed timestamp
    widget.lastRefreshedAt = new Date();
    await this.widgetRepository.save(widget);

    this.logger.log(`Widget refreshed successfully: ${id}`);
    return widget;
  }

  async getWidgetData(id: string, userId: string): Promise<any> {
    this.logger.log(`Fetching data for widget: ${id}`);

    const widget = await this.getWidgetById(id, userId);

    // Check access permissions
    if (!this.hasAccess(widget.dashboard, userId)) {
      throw new BadRequestException('Access denied');
    }

    // This would integrate with the analytics service to fetch actual data
    // For now, return mock data based on widget type
    const data = await this.fetchWidgetData(widget);

    this.logger.log(`Widget data fetched successfully: ${id}`);
    return data;
  }

  private async fetchWidgetData(widget: DashboardWidget): Promise<any> {
    // Mock implementation - in real scenario, this would call analytics service
    switch (widget.type) {
      case WidgetType.CHART:
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [12000, 19000, 15000, 25000, 22000, 30000],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }],
        };

      case WidgetType.METRIC:
        return {
          value: 125000,
          label: 'Total Revenue',
          trend: 'up',
          trendValue: 12.5,
        };

      case WidgetType.TABLE:
        return {
          columns: ['Name', 'Value', 'Status'],
          rows: [
            ['Product A', 5000, 'Active'],
            ['Product B', 7500, 'Active'],
            ['Product C', 3000, 'Inactive'],
          ],
        };

      default:
        return {};
    }
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
}
