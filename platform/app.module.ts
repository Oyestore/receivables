import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

// Security imports
import { SecurityHeadersMiddleware } from './src/middleware/security-headers.middleware';
import { AdvancedRateLimitGuard } from './src/guards/advanced-rate-limit.guard';
import { SecurityAuditInterceptor } from './src/interceptors/security-audit.interceptor';
import { SanitizationPipe } from './src/pipes/sanitization.pipe';

// Import Migrated Modules
import { AdministrationModule } from './Module_12_Administration/code/administration.module';
import { InvoiceModule } from './Module_01_Invoice_Management/src/invoice.module';
import { PaymentModule } from './Module_03_Payment_Integration/src/payment.module';
import { AnalyticsModule } from './Module_04_Analytics_Reporting/src/analytics.module';

// Import Legacy/Other Modules (keeping them for now, but pointing to src if they exist there, or commenting out if not ready)
// import { CommonModule } from './Module_11_Common/common.module';
// import { MLModule } from './Module_02_Communication_Layer/code/ml.module';
import { MilestoneModule } from './Module_05_Milestone_Workflows/src/milestone.module';
import { CreditScoringModule } from './Module_06_Credit_Scoring/src/credit-scoring.module';
import { FinancingModule } from './Module_07_Financing_Factoring/financing.module';
import { MarketingCustomerSuccessModule } from './Module_09_Marketing_Customer_Success/code/marketing-customer-success.module';
import { DisputeResolutionModule } from './Module_08_Dispute_Resolution_&_Legal_Network/code/dispute-resolution.module';
// import { OrchestrationHubModule } from './Module_10_Orchestration_Hub/code/orchestration-hub.module';
import { CommonModule } from './Module_11_Common/common.module';
import { OrchestrationHubModule } from './Module_10_Orchestration_Hub/src/orchestration-hub.module';
import { DistributionModule } from './Module_02_Intelligent_Distribution/src/distribution.module';
import { ConciergeModule } from './Module_16_Invoice_Concierge/code/concierge.module';
import { Module17ReconciliationGlModule } from './Module_17_Reconciliation_GL/src/module-17-reconciliation-gl.module';
import { CrossBorderTradeModule } from './Module_13_Cross_Border_Trade/src/cross-border-trade.module';
import { GlobalizationModule } from './Module_14_Globalization_Localization/src/globalization.module';
import { CreditDecisioningModule } from './Module_15_Credit_Decisioning/src/credit-decisioning.module';
import { MonitoringModule } from './src/monitoring/monitoring.module';
import { WorkflowEntity, WorkflowExecutionEntity } from './Module_10_Orchestration_Hub/src/entities/workflow.entity';

// Import new optimization modules
import { AccessibilityModule } from './src/modules/accessibility.module';
import { PerformanceModule } from './src/modules/performance.module';

@Module({
    imports: [
        // Global configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
            cache: true,
        }),

        // Database configuration (Global connection)
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const url = configService.get<string>('DATABASE_URL');
                // Use specific entities path like in data-source.ts to avoid loading disabled modules
                const entities = [
                    __dirname + '/Module_01_Invoice_Management/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_12_Administration/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_03_Payment_Integration/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_04_Analytics_Reporting/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_05_Milestone_Workflows/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_06_Credit_Scoring/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_07_Financing_Factoring/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_08_Dispute_Resolution_&_Legal_Network/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_09_Marketing_Customer_Success/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_11_Common/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_17_Reconciliation_GL/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_13_Cross_Border_Trade/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_14_Globalization_Localization/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_15_Credit_Decisioning/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_10_Orchestration_Hub/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_02_Intelligent_Distribution/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_16_Invoice_Concierge/code/entities/**/*.entity.{ts,js}',
                    WorkflowEntity,
                    WorkflowExecutionEntity,
                ];

                const synchronize = configService.get<string>('DB_SYNC', 'true') === 'true';
                if (url) {
                    return {
                        type: 'postgres',
                        url,
                        entities,
                        synchronize,
                        logging: false,
                    };
                }
                return {
                    type: 'postgres',
                    host: configService.get<string>('DB_HOST', 'localhost'),
                    port: configService.get<number>('DB_PORT', 5432),
                    username: configService.get<string>('DB_USERNAME', 'postgres'),
                    password: configService.get<string>('DB_PASSWORD', 'postgres'),
                    database: configService.get<string>('DB_NAME', 'sme_platform'),
                    entities,
                    synchronize,
                    logging: false,
                };
            },
            inject: [ConfigService],
        }),

        // BullModule moved to CommonModule to resolve scoping issues
        // BullModule.forRootAsync({ ... }),


        // Migrated Core Modules
        // Migrated Core Modules
        AdministrationModule,
        CommonModule,
        PaymentModule,
        AnalyticsModule, // Heavy, disabled for E2E speed
        // MonitoringModule,
        // DistributionModule,
        FinancingModule,
        CreditScoringModule,
        Module17ReconciliationGlModule,
        // CrossBorderTradeModule,
        // GlobalizationModule,
        // CreditDecisioningModule,
        // CreditDecisioningModule, // Duplicate removal
        ConciergeModule,
        OrchestrationHubModule,
        DisputeResolutionModule,
        MarketingCustomerSuccessModule,

        // New optimization modules
        AccessibilityModule,
        PerformanceModule,

        // Other modules can be re-enabled as they are migrated
    ],
    controllers: [],
    providers: [
        // Global security providers
        {
            provide: APP_GUARD,
            useClass: AdvancedRateLimitGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: SecurityAuditInterceptor,
        },
        {
            provide: APP_PIPE,
            useClass: SanitizationPipe,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(SecurityHeadersMiddleware)
            .forRoutes('*');
    }
}
