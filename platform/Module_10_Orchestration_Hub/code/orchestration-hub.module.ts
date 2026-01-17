/**
 * Module 10: Orchestration Hub - NestJS Module Configuration
 * 
 * Complete module wiring with all services and adapters
 * Phase 10.1 + 10.2 (AI Intelligence)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// Phase 10.1 Services
import { OrchestrationService } from './services/enhanced-orchestration.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { ConstraintAnalysisService } from './services/constraint-analysis.service';
import { StrategicRecommendationService } from './services/strategic-recommendation.service';
import { IntegrationGatewayService } from './services/integration-gateway.service';
import { EventBridgeService } from './services/event-bridge.service';
import { MonitoringService } from './services/monitoring.service';
import { AuditLoggingService } from './services/audit-logging.service';

// Phase 10.2 AI Intelligence Services
import { AIIntelligenceService } from './services/ai-intelligence.service';
import { NLPService } from './services/nlp.service';
import { MLPatternRecognitionService } from './services/ml-pattern-recognition.service';

// Prometheus Metrics
import { prometheusProviders } from './metrics/prometheus.providers';

// Adapters
import { InvoiceManagementAdapter } from './adapters/invoice-management.adapter';
import { CustomerCommunicationAdapter } from './adapters/customer-communication.adapter';
import { PaymentIntegrationAdapter } from './adapters/payment-integration.adapter';
import { AnalyticsReportingAdapter } from './adapters/analytics-reporting.adapter';
import {
    MilestoneWorkflowsAdapter,
    CreditScoringAdapter,
    FinancingFactoringAdapter,
    DisputeResolutionAdapter,
    MarketingCustomerSuccessAdapter,
} from './adapters/remaining-adapters';

// Entities (from other modules - assuming they're available)
import { Invoice } from '../../Module_01_Invoice_Management/code/entities/invoice.entity';
import { Payment } from '../../Module_03_Payment_Integration/code/entities/payment.entity';
import { CreditProfile } from '../../Module_06_Credit_Scoring/code/entities/credit-profile.entity';

@Module({
    imports: [
        // Configuration module
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        // TypeORM for database entities
        TypeOrmModule.forFeature([
            Invoice,
            Payment,
            CreditProfile,
        ]),

        // Event emitter for event bridge
        EventEmitterModule.forRoot({
            wildcard: true,
            delimiter: '.',
            maxListeners: 20,
        }),

        // HTTP module for adapters and AI service
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 5,
        }),

        // Prometheus metrics
        PrometheusModule.register({
            defaultMetrics: {
                enabled: true,
            },
        }),
    ],

    providers: [
        // Phase 10.1 - Core orchestration services
        OrchestrationService,
        WorkflowEngineService,
        ConstraintAnalysisService,
        StrategicRecommendationService,
        IntegrationGatewayService,
        EventBridgeService,
        MonitoringService,
        AuditLoggingService,

        // Phase 10.2 - AI Intelligence services
        AIIntelligenceService,
        NLPService,
        MLPatternRecognitionService,

        // Prometheus metric providers
        ...prometheusProviders,

        // Module adapters
        InvoiceManagementAdapter,
        CustomerCommunicationAdapter,
        PaymentIntegrationAdapter,
        AnalyticsReportingAdapter,
        MilestoneWorkflowsAdapter,
        CreditScoringAdapter,
        FinancingFactoringAdapter,
        DisputeResolutionAdapter,
        MarketingCustomerSuccessAdapter,
    ],

    exports: [
        // Export main services for use in other modules
        // Phase 10.1
        OrchestrationService,
        WorkflowEngineService,
        ConstraintAnalysisService,
        StrategicRecommendationService,
        IntegrationGatewayService,
        EventBridgeService,
        MonitoringService,
        AuditLoggingService,

        // Phase 10.2
        AIIntelligenceService,
        NLPService,
        MLPatternRecognitionService,
    ],
})
export class OrchestrationHubModule { }
