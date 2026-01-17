import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: configService.get('CORS_CREDENTIALS', true),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Swagger configuration
  if (configService.get('ENABLE_SWAGGER', true)) {
    const config = new DocumentBuilder()
      .setTitle('Payment Integration API')
      .setDescription('Advanced Payment Integration Module with Multi-Gateway Support and AI-Powered Analytics')
      .setVersion('3.0.0')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'apiKey')
      .addBearerAuth()
      .addTag('Payment')
      .addTag('Health')
      .addTag('Analytics')
      .addTag('Integrations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
      customSiteTitle: 'Payment Integration API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper img { content: url('https://example.com/logo.png'); }
        .swagger-ui .topbar { background-color: #1a73e8; }
        .swagger-ui .topbar-wrapper .link { color: white; }
      `,
    });
  }

  // Health check endpoint for Docker
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Start the application
  const port = configService.get('PORT', 3003);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Payment Integration API is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
