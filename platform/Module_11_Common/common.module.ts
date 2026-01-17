import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

// Core Services
import { ConfigService } from './code/config/config.service';
import { DatabaseService } from './code/database/database.service';

// Entities
import { DeviceToken } from './code/entities/device-token.entity';
import { NotificationTemplate } from './code/entities/notification-template.entity';

// Services
import { DeviceTokenService } from './code/services/device-token.service';
import { TemplateManagementService } from './code/services/template-management.service';
import { TemplateTestingService } from './code/services/template-testing.service';
import { NotificationService } from './code/notifications/notification.service';

// Utilities
import { CacheService } from './code/utils/cache.service';

// Multi-Tenancy
import { TenantService } from './code/multi-tenancy/tenant.service';

// Monitoring
import { MetricsService } from './code/monitoring/metrics.service';

// Error Handling
import { AppError } from './code/errors/app-error';
import { errorHandler } from './code/errors/error-handler';

// Logging
import { Logger } from './code/logging/logger';

// Shared Modules (import and re-export)
import { SharedModule } from './shared.module';

/**
 * Common Module - Global Shared Resources
 * 
 * This module provides shared utilities, configurations, and cross-module functionality
 * across the entire SME Platform. It's marked as @Global() to make its services
 * available throughout the application without explicit imports.
 * 
 * Key Features:
 * - Database Management (TypeORM, Connection Management)
 * - Notification Services (Email, SMS, WhatsApp, Push)
 * - Device Management (Device Tokens, Fingerprinting)
 * - Multi-Tenancy Support
 * - Caching & Rate Limiting
 * - Monitoring & Metrics
 * - Error Handling & Logging
 * - Template Management
 * - Configuration Management
 */
@Global()
@Module({
  imports: [
    // Core configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
    }),
    
    // JWT Configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: {
        expiresIn: '24h',
      },
    }),

    // Database entities
    TypeOrmModule.forFeature([
      DeviceToken,
      NotificationTemplate,
    ]),

    // Scheduling for background tasks
    ScheduleModule.forRoot(),

    // Internal modules
    SharedModule,
  ],
  providers: [
    // Core Services
    ConfigService,
    DatabaseService,

    // Entity Services
    DeviceTokenService,
    TemplateManagementService,
    TemplateTestingService,
    NotificationService,

    // Utilities
    CacheService,

    // Multi-Tenancy
    TenantService,

    // Monitoring
    MetricsService,

    // Error Handling
    AppError,
    errorHandler,

    // Logging
    Logger,
  ],
  exports: [
    // Core Services
    ConfigService,
    DatabaseService,

    // Entity Services
    DeviceTokenService,
    TemplateManagementService,
    TemplateTestingService,
    NotificationService,

    // Utilities
    CacheService,

    // Multi-Tenancy
    TenantService,

    // Monitoring
    MetricsService,

    // Error Handling
    AppError,
    errorHandler,

    // Logging
    Logger,

    // Re-export internal modules
    SharedModule,
  ],
})
export class CommonModule {}
