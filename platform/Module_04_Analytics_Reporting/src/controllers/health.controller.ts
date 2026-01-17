import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealth() {
    return this.healthCheckService.getHealthStatus();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Get liveness status for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    return this.healthCheckService.getLivenessStatus();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get readiness status for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    return this.healthCheckService.getReadinessStatus();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get status of external providers' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved successfully' })
  async getProviders() {
    return this.healthCheckService.getProviderStatus();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getMetrics() {
    return this.healthCheckService.getSystemMetrics();
  }
}
