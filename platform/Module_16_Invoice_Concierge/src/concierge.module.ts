import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConciergeController } from './controllers/concierge.controller';
import { PortalController } from './controllers/portal.controller';
import { ConciergeService } from './services/concierge.service';
import { PrivacyGatewayService } from './services/privacy-gateway.service';
import { StaticPortalService } from './services/static-portal.service';
import { ChatSession } from './entities/chat-session.entity';
import { PayerPortalSessionEntity } from './entities/payer-portal-session.entity';
import { InvoiceModule } from '../../Module_01_Smart_Invoice_Generation/src/invoice.module';
import { PaymentModule } from '../../Module_03_Payment_Integration/src/payment.module';
import { DisputeResolutionModule } from '../../Module_08_Dispute_Resolution_&_Legal_Network/code/dispute-resolution.module';
import { CreditScoringModule } from '../../Module_06_Credit_Scoring/src/credit-scoring.module';
import { AdministrationModule } from '../../Module_12_Administration/src/administration.module';
import { OrchestrationHubModule } from '../../Module_10_Orchestration_Hub/src/orchestration-hub.module';
import { CommonModule } from '../../Module_11_Common/common.module';
import { FinancingModule } from '../../Module_07_Financing/src/financing.module';

import { PaymentIntegrationService } from './services/payment-integration.service';
import { DisputeIntegrationService } from './services/dispute-integration.service';
import { ReferralIntegrationService } from './services/referral-integration.service';
import { OrchestrationService } from './services/orchestration.service';
import { NotificationService } from './services/notification.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, PayerPortalSessionEntity]),
        ConfigModule, // Needed for OrchestrationService
        InvoiceModule, // No circular dependency
        PaymentModule, // No circular dependency
        // forwardRef used for others just in case, but these two are definitely clean
        forwardRef(() => DisputeResolutionModule),
        CreditScoringModule,
        forwardRef(() => AdministrationModule),
        forwardRef(() => OrchestrationHubModule),
        forwardRef(() => CommonModule),
        forwardRef(() => FinancingModule),
    ],
    controllers: [ConciergeController, PortalController],
    providers: [
        ConciergeService,
        PrivacyGatewayService,
        StaticPortalService,
        PaymentIntegrationService,
        DisputeIntegrationService,
        ReferralIntegrationService,
        OrchestrationService,
        NotificationService
    ],
    exports: [ConciergeService, StaticPortalService]
})
export class ConciergeModule { }

