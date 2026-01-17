import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConciergeController } from '../src/controllers/concierge.controller';
import { PortalController } from '../src/controllers/portal.controller';
import { ConciergeService } from '../src/services/concierge.service';
import { PrivacyGatewayService } from '../src/services/privacy-gateway.service';
import { StaticPortalService } from '../src/services/static-portal.service';
import { ChatSession } from '../src/entities/chat-session.entity';
import { PayerPortalSessionEntity } from '../src/entities/payer-portal-session.entity';
import { InvoiceModule } from '../../Module_01_Smart_Invoice_Generation/src/invoice.module';
import { PaymentModule } from '../../Module_03_Payment_Integration/src/payment.module';
import { DisputeResolutionModule } from '../../Module_08_Dispute_Resolution_&_Legal_Network/code/dispute-resolution.module';
import { CreditScoringModule } from '../../Module_06_Credit_Scoring/src/credit-scoring.module';
import { AdministrationModule } from '../../Module_12_Administration/src/administration.module';
import { OrchestrationHubModule } from '../../Module_10_Orchestration_Hub/src/orchestration-hub.module';
import { CommonModule } from '../../Module_11_Common/common.module';
import { FinancingModule } from '../../Module_07_Financing/src/financing.module';

import { PaymentIntegrationService } from '../src/services/payment-integration.service';
import { DisputeIntegrationService } from '../src/services/dispute-integration.service';
import { ReferralIntegrationService } from '../src/services/referral-integration.service';
import { OrchestrationService } from '../src/services/orchestration.service';
import { NotificationService } from '../src/services/notification.service';

/**
 * Module 16: Invoice Concierge Module
 * 
 * This module provides comprehensive invoice concierge functionality
 * including AI-powered invoice processing, chat interfaces, portal management,
 * and integration with multiple platform modules.
 * 
 * Key Features:
 * - AI-powered invoice processing and analysis
 * - Interactive chat interface for invoice queries
 * - Payer portal management and sessions
 * - Multi-module integration (Invoice, Payment, Dispute, etc.)
 * - Privacy gateway for secure data handling
 * - Notification and orchestration services
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, PayerPortalSessionEntity]),
        ConfigModule, // Needed for OrchestrationService
        InvoiceModule, // No circular dependency
        PaymentModule,
        DisputeResolutionModule,
        CreditScoringModule,
        AdministrationModule,
        OrchestrationHubModule,
        CommonModule,
        FinancingModule,
    ],
    controllers: [
        ConciergeController,
        PortalController,
    ],
    providers: [
        ConciergeService,
        PrivacyGatewayService,
        StaticPortalService,
        PaymentIntegrationService,
        DisputeIntegrationService,
        ReferralIntegrationService,
        OrchestrationService,
        NotificationService,
    ],
    exports: [
        ConciergeService,
        PaymentIntegrationService,
        DisputeIntegrationService,
        ReferralIntegrationService,
        OrchestrationService,
        NotificationService,
        PrivacyGatewayService,
    ],
})
export class ConciergeModule {}
