import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Import existing modules
import { DynamicDiscountingModule } from './dynamic-discounting.module';

// Entities
import { FinancingPartner, PartnerType, PartnerStatus, ApplicationStatus, FinancingType } from './entities/partner.entity';
import { DiscountOffer } from './entities/discount-offer.entity';
import { FinancingApplication, FinancingApplicationStatus, FinancingPriority } from './entities/financing-application.entity';
import { FinancingTransaction, FinancingDocument } from './entities/financing-application.entity';
import { FinancingOffer, OfferStatus, OfferType, FinancingProvider, FinancingProduct } from './entities/financing-offer.entity';
import { FinancingRiskAssessment, RiskLevel, RiskCategory, FinancingAuditLog, POFinancingRequest } from './entities/financing-risk-assessment.entity';

// Services
import { DiscountService } from './services/discount.service';
import { CapitalFloatService } from './services/capital-float.service';
import { LendingkartService } from './services/lendingkart.service';
import { InvoiceFinancingService } from './services/invoice-financing.service';
import { PartnerIntegrationService } from './services/partner-integration.service';
import { FinancingRequestService } from './services/financing-request.service';
import { FinancingCalculatorService } from './services/financing-calculator.service';
import { FinancingRiskAssessmentService } from './services/financing-risk-assessment.service';
import { FinancingAuditService } from './services/financing-audit.service';
import { POFinancingService } from './services/po-financing.service';
import { ApplicationOrchestratorService } from './code/services/application-orchestrator.service';
import { PartnerRegistryService } from './code/services/partner-registry.service';
import { OfferNormalizationService } from './code/services/offer-normalization.service';
import { OfferRankingService } from './code/services/offer-ranking.service';
import { ModuleIntegrationService } from './code/services/module-integration.service';
import { LendingKartAdapter } from './code/adapters/lendingkart.adapter';
import { CapitalFloatAdapter } from './code/adapters/capital-float.adapter';
import { AuctionService } from './code/services/auction.service';
import { FinancingAuction } from './code/entities/auction.entity';
import { PreQualificationService } from './code/services/pre-qualification.service';
import { CreditDecisioningAdapter } from './code/adapters/credit-decisioning.adapter';
import { FinancingCopilotService } from './code/services/financing-copilot.service';
import { DiscountMarketplaceService } from './code/services/discount-marketplace.service';

// Controllers
import { DiscountController } from './code/controllers/discount.controller';
import { FinancingController } from './code/controllers/financing.controller';
import { PartnerController } from './code/controllers/partner.controller';
import { ApplicationController } from './code/controllers/application.controller';

// Import dependent modules
import { InvoiceModule } from '../Module_01_Invoice_Management/src/invoice.module';
import { PaymentModule } from '../Module_03_Payment_Integration/src/payment.module';
import { BuyerCreditScoringModule } from '../Module_06_Credit_Scoring/buyer-credit-scoring.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            // Partner entities
            FinancingPartner,

            // Dynamic discounting entities
            DiscountOffer,

            // Core financing entities
            FinancingApplication,
            FinancingTransaction,
            FinancingDocument,
            FinancingOffer,
            FinancingProvider,
            FinancingProduct,

            // Risk and audit entities
            FinancingRiskAssessment,
            FinancingAuditLog,
            POFinancingRequest,

            // Phase 4: Auction entity
            FinancingAuction,
        ]),

        // Dependent modules
        InvoiceModule,
        PaymentModule,
        BuyerCreditScoringModule,

        // Dynamic discounting module
        DynamicDiscountingModule,
    ],
    controllers: [
        // Controllers
        ApplicationController,
        DiscountController,
        FinancingController,
        PartnerController,
    ],
    providers: [
        // Core Services
        ApplicationOrchestratorService,
        PartnerRegistryService,
        OfferNormalizationService,
        OfferRankingService,

        // Phase 5: AI Pre-Qualification
        PreQualificationService,
        CreditDecisioningAdapter,

        // Phase 6: Financing Copilot
        FinancingCopilotService,

        // Phase 7: Discount Marketplace
        DiscountMarketplaceService,

        // Existing services
        DiscountService,
        PartnerIntegrationService,
        FinancingRequestService,
        FinancingCalculatorService,
        FinancingRiskAssessmentService,
        FinancingAuditService,
        POFinancingService,

        // Partner Adapters
        LendingKartAdapter,
        CapitalFloatAdapter,

        // Legacy Services
        DiscountService,
        PartnerIntegrationService,
        FinancingRequestService,
        FinancingCalculatorService,
        FinancingRiskAssessmentService,
        FinancingAuditService,
        POFinancingService,

        // External Partner Services
        CapitalFloatService,
        LendingkartService,
        InvoiceFinancingService,
    ],
    exports: [
        // Export core services for other modules
        ApplicationOrchestratorService,
        PartnerRegistryService,
        OfferNormalizationService,
        OfferRankingService,
        LendingKartAdapter,
        CapitalFloatAdapter,

        // Legacy services
        DiscountService,
        PartnerIntegrationService,
        FinancingRequestService,
        FinancingCalculatorService,
        FinancingRiskAssessmentService,
        FinancingAuditService,
        POFinancingService,
        InvoiceFinancingService,
    ],
})
export class FinancingModule implements OnModuleInit {
    constructor(
        private readonly partnerRegistry: PartnerRegistryService,
        private readonly lendingKart: LendingKartAdapter,
        private readonly capitalFloat: CapitalFloatAdapter,
    ) { }

    async onModuleInit() {
        // Register partner adapters on module initialization
        this.partnerRegistry.registerPartner(this.lendingKart);
        this.partnerRegistry.registerPartner(this.capitalFloat);

        console.log('✅ Module 07: Financing & Factoring initialized');
        console.log(`✅ Registered ${this.partnerRegistry.getPartnerCount()} financing partners`);
    }
}
