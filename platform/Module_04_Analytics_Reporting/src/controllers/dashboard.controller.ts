import { Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { CreateDashboardDto, UpdateDashboardDto, DashboardQueryDto } from '../dto/dashboard.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

@Injectable()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  async createDashboard(createDashboardDto: CreateDashboardDto, user: any) {
    this.logger.log(`POST /dashboards - Creating dashboard: ${createDashboardDto.name}`);
    return await this.dashboardService.createDashboard(createDashboardDto, user.id);
  }

  async getDashboards(query: DashboardQueryDto, user: any) {
    this.logger.log(`GET /dashboards - Fetching dashboards`);
    return await this.dashboardService.getDashboards(query, user.id);
  }

  async getDashboardById(id: string, user: any) {
    this.logger.log(`GET /dashboards/:id - Fetching dashboard: ${id}`);
    return await this.dashboardService.getDashboardById(id, user.id);
  }

  async updateDashboard(id: string, updateDashboardDto: UpdateDashboardDto, user: any) {
    this.logger.log(`PUT /dashboards/:id - Updating dashboard: ${id}`);
    return await this.dashboardService.updateDashboard(id, updateDashboardDto, user.id);
  }

  async deleteDashboard(id: string, user: any) {
    this.logger.log(`DELETE /dashboards/:id - Deleting dashboard: ${id}`);
    return await this.dashboardService.deleteDashboard(id, user.id);
  }

  async duplicateDashboard(id: string, name: string, user: any) {
    this.logger.log(`POST /dashboards/:id/duplicate - Duplicating dashboard: ${id}`);
    return await this.dashboardService.duplicateDashboard(id, name, user.id);
  }

  async shareDashboard(id: string, userIds: string[], role: string, user: any) {
    this.logger.log(`POST /dashboards/:id/share - Sharing dashboard: ${id}`);
    return await this.dashboardService.shareDashboard(id, userIds, role, user.id);
  }

  async unshareDashboard(id: string, userId: string, user: any) {
    this.logger.log(`DELETE /dashboards/:id/share/:userId - Unsharing dashboard: ${id}`);
    return await this.dashboardService.unshareDashboard(id, userId, user.id);
  }

  async getDashboardVersions(id: string, user: any) {
    this.logger.log(`GET /dashboards/:id/versions - Fetching versions for dashboard: ${id}`);
    return await this.dashboardService.getDashboardVersions(id, user.id);
  }

  async restoreDashboardVersion(dashboardId: string, versionId: string, user: any) {
    this.logger.log(`POST /dashboards/:id/versions/:versionId/restore - Restoring version: ${versionId}`);
    return await this.dashboardService.restoreDashboardVersion(dashboardId, versionId, user.id);
  }
}
