import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { TypeOrmModule } from './typeorm.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
import { ClickHouseService } from './services/clickhouse.service';
import { HealthCheckService } from './services/health-check.service';
import { SchedulerService } from './services/scheduler.service';
import { CacheService } from './services/cache.service';
import { AnalyticsTrackingService } from './services/analytics-tracking.service';
import { NotificationService } from './services/notification.service';
import { QueueService } from './services/queue.service';
import { MaintenanceService } from './services/maintenance.service';
import { ReportGenerationService } from './services/report-generation.service';
import { ReportTemplateService } from './services/report-template.service';
import { ScheduledReportService } from './services/scheduled-report.service';

// NEW: Business Intelligence Services
import { EventIngestionService } from './services/event-ingestion.service';
import { InsightGenerationService } from './services/insight-generation.service';

// Controllers
import { DashboardController } from './controllers/dashboard.controller';
import { WidgetController } from './controllers/widget.controller';
import { ReportController } from './controllers/report.controller';
import { UserController } from './controllers/user.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { HealthController } from './controllers/health.controller';

// NEW: Business Intelligence Controller
import { BusinessIntelligenceController } from './controllers/business-intelligence.controller';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Interceptors
import { ResponseInterceptor } from './interceptors/response.interceptor';

// NEW: WebSocket Gateway
import { BusinessIntelligenceGateway } from './gateway/business-intelligence.gateway';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule,
    // Enable event-driven architecture
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
  ],
  controllers: [
    DashboardController,
    WidgetController,
    ReportController,
    UserController,
    AnalyticsController,
    HealthController,
    // NEW: Business Intelligence Controller
    BusinessIntelligenceController,
  ],
  providers: [
    // Services
    DashboardService,
    WidgetService,
    ReportService,
    UserService,
    AnalyticsService,
    ClickHouseService,
    HealthCheckService,
    SchedulerService,
    CacheService,
    AnalyticsTrackingService,
    NotificationService,
    QueueService,
    MaintenanceService,
    ReportGenerationService,
    ReportTemplateService,
    ScheduledReportService,

    // NEW: Business Intelligence Services
    EventIngestionService,
    InsightGenerationService,

    // Guards
    JwtAuthGuard,

    // Interceptors
    ResponseInterceptor,

    // NEW: WebSocket Gateway
    BusinessIntelligenceGateway,
  ],
  exports: [
    DashboardService,
    WidgetService,
    ReportService,
    UserService,
    AnalyticsService,
    ClickHouseService,
    EventIngestionService,
    InsightGenerationService,
  ],
})
export class AppModule { }

