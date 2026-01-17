import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

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

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Milestone Workflows API')
    .setDescription('Advanced Milestone-Based Payment Workflow Management System')
    .setVersion('5.0.0')
    .addTag('milestones')
    .addTag('workflows')
    .addTag('escalations')
    .addTag('verification')
    .addTag('evidence')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Health check endpoint
  app.getHttpServer().on('request', (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'milestone-workflows',
        version: '5.0.0',
      }));
    }
  });

  const port = configService.get('PORT', 3005);
  await app.listen(port);

  console.log(`🚀 Milestone Workflows API running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`🏥 Health check at http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
