import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  
  if (configService.get('ENABLE_SWAGGER') !== 'true') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Intelligent Distribution API')
    .setDescription(`
      ## Intelligent Distribution & Follow-up System
      
      This module provides automated invoice distribution across multiple channels with intelligent rule-based routing and comprehensive follow-up workflows.
      
      ### Features
      - **Intelligent Rule Engine**: Amount-based, customer-based, industry-based, geographic, and custom rules
      - **Multi-Channel Distribution**: Email, SMS, WhatsApp, Postal, EDI, and API channels
      - **Follow-up Automation**: Configurable follow-up sequences with triggers
      - **Real-time Analytics**: Comprehensive performance metrics and reporting
      - **Queue Processing**: Scalable async processing with BullMQ
      
      ### Authentication
      This API uses API key authentication. Include your API key in the request:
      - Header: \`X-API-Key: your-api-key\`
      - Query parameter: \`?api_key=your-api-key\`
      - Authorization header: \`Bearer your-api-key\`
      
      ### Rate Limiting
      - **Window**: 15 minutes
      - **Max Requests**: 100 per window
      - **Headers**: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`
      
      ### Error Handling
      All errors follow a consistent format:
      \`\`\`json
      {
        "success": false,
        "error": {
          "code": "ERROR_CODE",
          "message": "Human readable error message",
          "details": {}
        },
        "meta": {
          "requestId": "uuid",
          "timestamp": "ISO 8601 timestamp"
        }
      }
      \`\`\`
      
      ### Pagination
      List endpoints support pagination:
      - Query parameters: \`page\`, \`limit\`, \`offset\`
      - Default: \`page=1\`, \`limit=20\`
      - Maximum: \`limit=100\`
      
      ### Response Format
      Successful responses follow this format:
      \`\`\`json
      {
        "success": true,
        "data": {},
        "meta": {
          "requestId": "uuid",
          "timestamp": "ISO 8601 timestamp",
          "pagination": {
            "page": 1,
            "limit": 20,
            "total": 100,
            "totalPages": 5
          }
        }
      }
      \`\`\`
    `)
    .setVersion('2.0.0')
    .setContact('SME Platform Team', 'https://sme-platform.com/support', 'support@sme-platform.com')
    .setLicense('MIT', 'https://github.com/sme-platform/module-02-intelligent-distribution/blob/main/LICENSE')
    .addServer('http://localhost:3001', 'Development Server')
    .addServer('https://api.sme-platform.com/distribution', 'Production Server')
    .addServer('https://staging-api.sme-platform.com/distribution', 'Staging Server')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication',
      },
      'apiKey',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'api_key',
        in: 'query',
        description: 'API key for authentication (alternative method)',
      },
      'apiKeyQuery',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token or API key for authentication',
      },
      'bearerAuth',
    )
    .addTag('Distribution Rules', 'Management of intelligent distribution rules')
    .addTag('Distribution Assignments', 'Distribution assignment and tracking')
    .addTag('Analytics', 'Performance analytics and reporting')
    .addTag('Health', 'Health check and monitoring endpoints')
    .addTag('Follow-up', 'Follow-up sequences and automation')
    .addTag('Recipients', 'Contact management and preferences')
    .addTag('Queue Management', 'Queue processing and job management')
    .addTag('External Services', 'External service integrations')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [
      // Add all controllers here
      'DistributionController',
      'DistributionRecordController',
      'RecipientContactController',
      // Add health check controller
      'HealthController',
    ],
  });

  // Custom Swagger UI configuration
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Intelligent Distribution API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c3e50 }
      .swagger-ui .scheme-container { background: #f8f9fa }
      .swagger-ui .opblock.opblock-post { border-color: #28a745 }
      .swagger-ui .opblock.opblock-get { border-color: #007bff }
      .swagger-ui .opblock.opblock-put { border-color: #ffc107 }
      .swagger-ui .opblock.opblock-delete { border-color: #dc3545 }
      .swagger-ui .opblock.opblock-patch { border-color: #6f42c1 }
    `,
    customJs: [
      // Custom JavaScript for enhanced UI
    ],
  });

  // Add security requirements to all endpoints
  Object.keys(document.paths).forEach(path => {
    Object.keys(document.paths[path]).forEach(method => {
      const operation = document.paths[path][method];
      if (operation.security === undefined) {
        operation.security = [{ apiKey: [] }, { apiKeyQuery: [] }, { bearerAuth: [] }];
      }
    });
  });

  // Add common responses
  const commonResponses = {
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'BAD_REQUEST' },
                  message: { type: 'string', example: 'Invalid input data' },
                  details: { type: 'object', nullable: true },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  requestId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'UNAUTHORIZED' },
                  message: { type: 'string', example: 'API key is required' },
                  details: { type: 'object', nullable: true },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  requestId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
      },
    },
    429: {
      description: 'Too Many Requests',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                  message: { type: 'string', example: 'Too many requests' },
                  details: {
                    type: 'object',
                    properties: {
                      retryAfter: { type: 'integer', example: 60 },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  requestId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
                  message: { type: 'string', example: 'An unexpected error occurred' },
                  details: { type: 'object', nullable: true },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  requestId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                },
              },
            },
          },
        },
      },
    },
  };

  // Apply common responses to all endpoints
  Object.keys(document.paths).forEach(path => {
    Object.keys(document.paths[path]).forEach(method => {
      const operation = document.paths[path][method];
      if (operation.responses) {
        Object.assign(operation.responses, commonResponses);
      }
    });
  });

  console.log(`📖 Swagger documentation available at: http://localhost:3001/api/docs`);
}
