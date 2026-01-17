import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Invoice Management API')
    .setDescription('AI-powered Invoice Management System with DeepSeek R1 Integration')
    .setVersion('2.0.0')
    .setContact('SME Platform Support', 'https://sme-platform.com/support', 'support@sme-platform.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.sme-platform.com', 'Production Server')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'API Key')
    .addTag('Invoices', 'Invoice management operations')
    .addTag('Templates', 'Template management and optimization')
    .addTag('AI Services', 'AI-powered features and analysis')
    .addTag('Quality Assurance', 'Invoice quality validation and auto-fix')
    .addTag('Cultural Intelligence', 'Regional and cultural adaptations')
    .addTag('Analytics', 'Performance metrics and insights')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Invoice Management API Documentation',
    customCss: `
      .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzQyODVGNSIvPgo8cGF0aCBkPSJNOCAxNkwxNiA4TDI0IDE2TDE2IDI0TDggMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4='); }
      .swagger-ui .topbar { background-color: #4285F5; }
      .swagger-ui .topbar-wrapper a { color: white; }
    `,
    customfavIcon: '/favicon.ico',
    customJs: `
      window.onload = function() {
        console.log('Invoice Management API Documentation loaded');
      };
    `,
  });

  // Add custom swagger tags and descriptions
  const customOptions = {
    deepLinking: true,
    displayOperationId: false,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    persistAuthorization: false,
  };

  SwaggerModule.setup('api/docs', app, document, customOptions);
}

export const swaggerTags = {
  INVOICES: 'Invoices',
  TEMPLATES: 'Templates',
  AI_SERVICES: 'AI Services',
  QUALITY_ASSURANCE: 'Quality Assurance',
  CULTURAL_INTELLIGENCE: 'Cultural Intelligence',
  ANALYTICS: 'Analytics',
};

export const swaggerDescriptions = {
  INVOICES: 'Create, read, update, and manage invoices with AI-powered validation and optimization',
  TEMPLATES: 'Manage invoice templates with AI optimization and A/B testing',
  AI_SERVICES: 'DeepSeek R1 AI integration for intelligent invoice analysis and optimization',
  QUALITY_ASSURANCE: 'Automated quality checks, validation, and auto-fix capabilities',
  CULTURAL_INTELLIGENCE: 'Regional adaptations and cultural insights for Indian business context',
  ANALYTICS: 'Performance metrics, insights, and business intelligence',
};
