import { Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { WidgetService } from '../services/widget.service';
import { CreateWidgetDto, UpdateWidgetDto, WidgetQueryDto } from '../dto/widget.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

@Injectable()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class WidgetController {
  private readonly logger = new Logger(WidgetController.name);

  constructor(private readonly widgetService: WidgetService) {}

  async createWidget(createWidgetDto: CreateWidgetDto, dashboardId: string, user: any) {
    this.logger.log(`POST /dashboards/:id/widgets - Creating widget: ${createWidgetDto.name}`);
    return await this.widgetService.createWidget(createWidgetDto, dashboardId, user.id);
  }

  async getWidgets(dashboardId: string, query: WidgetQueryDto, user: any) {
    this.logger.log(`GET /dashboards/:id/widgets - Fetching widgets for dashboard: ${dashboardId}`);
    return await this.widgetService.getWidgets(dashboardId, query, user.id);
  }

  async getWidgetById(id: string, user: any) {
    this.logger.log(`GET /widgets/:id - Fetching widget: ${id}`);
    return await this.widgetService.getWidgetById(id, user.id);
  }

  async updateWidget(id: string, updateWidgetDto: UpdateWidgetDto, user: any) {
    this.logger.log(`PUT /widgets/:id - Updating widget: ${id}`);
    return await this.widgetService.updateWidget(id, updateWidgetDto, user.id);
  }

  async deleteWidget(id: string, user: any) {
    this.logger.log(`DELETE /widgets/:id - Deleting widget: ${id}`);
    return await this.widgetService.deleteWidget(id, user.id);
  }

  async duplicateWidget(id: string, name: string, position: any, user: any) {
    this.logger.log(`POST /widgets/:id/duplicate - Duplicating widget: ${id}`);
    return await this.widgetService.duplicateWidget(id, name, position, user.id);
  }

  async updateWidgetPositions(widgetPositions: any[], user: any) {
    this.logger.log(`PUT /widgets/positions - Updating positions for ${widgetPositions.length} widgets`);
    return await this.widgetService.updateWidgetPositions(widgetPositions, user.id);
  }

  async refreshWidget(id: string, user: any) {
    this.logger.log(`POST /widgets/:id/refresh - Refreshing widget: ${id}`);
    return await this.widgetService.refreshWidget(id, user.id);
  }

  async getWidgetData(id: string, user: any) {
    this.logger.log(`GET /widgets/:id/data - Fetching data for widget: ${id}`);
    return await this.widgetService.getWidgetData(id, user.id);
  }
}
