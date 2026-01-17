import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
    try {
        const app = await NestFactory.create(AppModule);

        app.setGlobalPrefix('api');

        // Swagger/OpenAPI Configuration
        const config = new DocumentBuilder()
            .setTitle('SME Receivables Platform API')
            .setDescription('Complete API documentation for SME Receivables Management Platform with Payment Intelligence')
            .setVersion('1.0')
            .addTag('payment-intelligence', 'Payment Intelligence & ML-based predictions')
            .addTag('invoices', 'Invoice generation and management')
            .addTag('payments', 'Payment processing and gateways')
            .addTag('distribution', 'Intelligent invoice distribution')
            .addTag('analytics', 'Analytics and reporting')
            .addBearerAuth()
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document, {
            customSiteTitle: 'SME Platform API Docs',
            customCss: '.swagger-ui .topbar { display: none }',
            swaggerOptions: {
                persistAuthorization: true,
                docExpansion: 'list',
                filter: true,
                showRequestDuration: true,
            },
        });

        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
                    scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", 'data:'],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            noSniff: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        }));

        app.use(rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
        }));

        app.useGlobalFilters(new HttpExceptionFilter());

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        app.enableCors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });

        const port = process.env.PORT || 4000;
        await app.listen(port);

        console.log(`🚀 Application is running on: http://localhost:${port}/api`);
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        console.log(`🔒 Security: Rate limiting active (100 req/15min)`);
        console.log(`🔒 Security: CSP hardened (no unsafe-inline)`);
        console.log(`🔒 Security: Global exception filter active`);
    } catch (err: any) {
        const payload = {
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
            cause: err?.cause || undefined,
        };
        console.error('❌ Startup error:', JSON.stringify(payload, null, 2));
        process.exit(1);
    }
}
bootstrap();
