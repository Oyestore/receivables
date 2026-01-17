import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Dashboard } from './entities/dashboard.entity';
import { DashboardWidget } from './entities/dashboard-widget.entity';
import { DashboardVersion } from './entities/dashboard-version.entity';
import { DashboardCollaboration } from './entities/dashboard-collaboration.entity';
import { User } from './entities/user.entity';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportExecution } from './entities/report-execution.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { AnomalyDetection } from './entities/anomaly-detection.entity';
import { AIInsight } from './entities/ai-insight.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { PerformanceMetric } from './entities/performance-metric.entity';

// Services
import { DashboardService } from './services/dashboard.service';
import { WidgetService } from './services/widget.service';
import { ReportService } from './services/report.service';
import { UserService } from './services/user.service';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsEnhancedService } from './services/analytics-enhanced.service';
import { ClickHouseService } from './services/clickhouse.service';
import { HealthCheckService } from './services/health-check.service';
import { SchedulerService } from './services/scheduler.service';
import { CacheService } from './services/cache.service';
import { AnalyticsTrackingService } from './services/analytics-tracking.service';
import { NotificationService } from './services/notification.service';
import { QueueService } from './services/queue.service';
import { MaintenanceService } from './services/maintenance.service';

// Controllers
import { DashboardController } from './controllers/dashboard.controller';
import { WidgetController } from './controllers/widget.controller';
import { ReportController } from './controllers/report.controller';
import { UserController } from './controllers/user.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { HealthController } from './controllers/health.controller';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Interceptors
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5435,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'analytics_db',
      entities: [
        Dashboard,
        DashboardWidget,
        DashboardVersion,
        DashboardCollaboration,
        User,
        ReportTemplate,
        ReportExecution,
        ScheduledReport,
        AnomalyDetection,
        AIInsight,
        AnalyticsEvent,
        PerformanceMetric,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([
      Dashboard,
      DashboardWidget,
      DashboardVersion,
      DashboardCollaboration,
      User,
      ReportTemplate,
      ReportExecution,
      ScheduledReport,
      AnomalyDetection,
      AIInsight,
      AnalyticsEvent,
      PerformanceMetric,
    ]),
  ],
  controllers: [
    DashboardController,
    WidgetController,
    ReportController,
    UserController,
    AnalyticsController,
    HealthController,
  ],
  providers: [
    // Services
    DashboardService,
    WidgetService,
    ReportService,
    UserService,
    AnalyticsService,
    AnalyticsEnhancedService,
    ClickHouseService,
    HealthCheckService,
    SchedulerService,
    CacheService,
    AnalyticsTrackingService,
    NotificationService,
    QueueService,
    MaintenanceService,
    
    // Guards
    JwtAuthGuard,
    
    // Interceptors
    ResponseInterceptor,
  ],
  exports: [
    DashboardService,
    WidgetService,
    ReportService,
    UserService,
    AnalyticsService,
    AnalyticsEnhancedService,
    ClickHouseService,
    SchedulerService,
    CacheService,
    AnalyticsTrackingService,
    NotificationService,
    QueueService,
    MaintenanceService,
  ],
})
export class AppModule {}
