import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { RecurringSubscription } from '../entities/recurring-subscription.entity';
import { SubscriptionPayment } from '../entities/subscription-payment.entity';
import { InstallmentPlan } from '../entities/installment-plan.entity';
import { InstallmentPayment } from '../entities/installment-payment.entity';
import { PaymentBehaviorScore } from '../entities/payment-behavior-score.entity';
import { FinancingRequest } from '../entities/financing-request.entity';
import { SupplyChainRelationship } from '../entities/supply-chain-relationship.entity';
import { PaymentSuccessPrediction } from '../entities/payment-prediction.entity';

// Services
import { SubscriptionService } from '../services/subscription.service';
import { InstallmentService } from '../services/installment.service';
import { PaymentPredictionService } from '../services/payment-prediction.service';
import { PaymentBehaviorScoringService } from '../services/payment-behavior-scoring.service';
import { SupplyChainFinanceService } from '../services/supply-chain-finance.service';
import { PaymentSecurityService } from '../services/payment-security.service';

// Controllers
import { DeepSeekIntegrationController } from '../controllers/deepseek-integration.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            RecurringSubscription,
            SubscriptionPayment,
            InstallmentPlan,
            InstallmentPayment,
            PaymentBehaviorScore,
            FinancingRequest,
            SupplyChainRelationship,
            PaymentSuccessPrediction
        ]),
        ConfigModule,
    ],
    controllers: [
        DeepSeekIntegrationController
    ],
    providers: [
        SubscriptionService,
        InstallmentService,
        PaymentPredictionService,
        PaymentBehaviorScoringService,
        SupplyChainFinanceService,
        PaymentSecurityService
    ],
    exports: [
        SubscriptionService,
        InstallmentService,
        PaymentPredictionService,
        PaymentBehaviorScoringService,
        SupplyChainFinanceService,
        PaymentSecurityService
    ],
})
export class AdvancedPaymentModule { }