import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { ErrorHandlingMiddleware } from './middleware/error-handling.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Custom middleware
  app.use(new LoggingMiddleware().use);
  app.use(new ErrorHandlingMiddleware().use);
  app.use(new AuthMiddleware().use);
  app.use(new ValidationMiddleware().use);
  app.use(new RateLimitMiddleware().use);

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Swagger documentation
  if (process.env.ENABLE_SWAGGER !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Analytics & Reporting API')
      .setDescription('Advanced Analytics and Reporting Module with AI-Powered Insights')
      .setVersion('4.0.0')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'apiKey')
      .addBearerAuth()
      .addTag('Analytics')
      .addTag('Dashboards')
      .addTag('Reports')
      .addTag('AI Insights')
      .addTag('Anomaly Detection')
      .addTag('Health Check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Start server
  const port = process.env.PORT || 3004;
  await app.listen(port);

  console.log(`🚀 Analytics & Reporting API is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
