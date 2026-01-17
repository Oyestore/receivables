import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Comprehensive health check' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async getHealth() {
    return this.healthCheckService.performHealthCheck();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    return this.healthCheckService.performLivenessCheck();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  async getReadiness() {
    return this.healthCheckService.performReadinessCheck();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Check payment provider status' })
  @ApiResponse({ status: 200, description: 'Payment provider health status' })
  async getProviders() {
    return this.healthCheckService.checkPaymentGateways();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'System performance metrics' })
  async getMetrics() {
    return this.healthCheckService.getSystemMetrics();
  }
}
