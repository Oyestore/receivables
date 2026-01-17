import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Comprehensive health check',
    description: 'Returns detailed health status of all system components including database, Redis, external services, and system metrics.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        version: { type: 'string' },
        environment: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                responseTime: { type: 'number' },
                error: { type: 'string' }
              }
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                responseTime: { type: 'number' },
                error: { type: 'string' }
              }
            },
            email: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['available', 'unavailable'] },
                providers: {
                  type: 'object',
                  properties: {
                    sendgrid: { type: 'string', enum: ['available', 'unavailable'] },
                    ses: { type: 'string', enum: ['available', 'unavailable'] },
                    mailgun: { type: 'string', enum: ['available', 'unavailable'] }
                  }
                }
              }
            },
            sms: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['available', 'unavailable'] },
                providers: {
                  type: 'object',
                  properties: {
                    twilio: { type: 'string', enum: ['available', 'unavailable'] },
                    sns: { type: 'string', enum: ['available', 'unavailable'] },
                    plivo: { type: 'string', enum: ['available', 'unavailable'] }
                  }
                }
              }
            },
            whatsapp: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['available', 'unavailable'] },
                responseTime: { type: 'number' },
                error: { type: 'string' }
              }
            },
            queue: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                activeJobs: { type: 'number' },
                failedJobs: { type: 'number' },
                completedJobs: { type: 'number' }
              }
            }
          }
        },
        metrics: {
          type: 'object',
          properties: {
            totalRules: { type: 'number' },
            activeRules: { type: 'number' },
            totalAssignments: { type: 'number' },
            pendingAssignments: { type: 'number' },
            memoryUsage: {
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
                percentage: { type: 'number' }
              }
            },
            cpuUsage: { type: 'number' }
          }
        }
      }
    }
  })
  async getHealth() {
    return this.healthCheckService.checkHealth();
  }

  @Get('liveness')
  @ApiOperation({ 
    summary: 'Liveness probe',
    description: 'Simple liveness check for Kubernetes/container orchestration. Returns OK if the application is running.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getLiveness() {
    return this.healthCheckService.checkLiveness();
  }

  @Get('readiness')
  @ApiOperation({ 
    summary: 'Readiness probe',
    description: 'Readiness check for Kubernetes/container orchestration. Returns ready only when all critical dependencies are available.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is ready to serve traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ready', 'not ready'] },
        timestamp: { type: 'string', format: 'date-time' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] }
              }
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] }
              }
            },
            queue: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                activeJobs: { type: 'number' },
                failedJobs: { type: 'number' },
                completedJobs: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  async getReadiness() {
    return this.healthCheckService.checkReadiness();
  }

  @Get('providers')
  @ApiOperation({ 
    summary: 'External service providers status',
    description: 'Detailed status of all external service providers (email, SMS, WhatsApp) with individual provider health checks.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Provider status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['available', 'unavailable'] },
            providers: {
              type: 'object',
              properties: {
                sendgrid: { type: 'string', enum: ['available', 'unavailable'] },
                ses: { type: 'string', enum: ['available', 'unavailable'] },
                mailgun: { type: 'string', enum: ['available', 'unavailable'] }
              }
            }
          }
        },
        sms: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['available', 'unavailable'] },
            providers: {
              type: 'object',
              properties: {
                twilio: { type: 'string', enum: ['available', 'unavailable'] },
                sns: { type: 'string', enum: ['available', 'unavailable'] },
                plivo: { type: 'string', enum: ['available', 'unavailable'] }
              }
            }
          }
        },
        whatsapp: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['available', 'unavailable'] },
            responseTime: { type: 'number' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getProviders() {
    const health = await this.healthCheckService.checkHealth();
    return {
      email: health.services.email,
      sms: health.services.sms,
      whatsapp: health.services.whatsapp,
    };
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'System metrics',
    description: 'Current system metrics including database statistics, queue status, and resource usage.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRules: { type: 'number' },
        activeRules: { type: 'number' },
        totalAssignments: { type: 'number' },
        pendingAssignments: { type: 'number' },
        memoryUsage: {
          type: 'object',
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
            percentage: { type: 'number' }
          }
        },
        cpuUsage: { type: 'number' },
        uptime: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getMetrics() {
    const health = await this.healthCheckService.checkHealth();
    return {
      ...health.metrics,
      uptime: health.uptime,
      timestamp: health.timestamp,
    };
  }
}
