"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedPaymentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
// Entities
const recurring_subscription_entity_1 = require("../entities/recurring-subscription.entity");
const subscription_payment_entity_1 = require("../entities/subscription-payment.entity");
const installment_plan_entity_1 = require("../entities/installment-plan.entity");
const installment_payment_entity_1 = require("../entities/installment-payment.entity");
const payment_behavior_score_entity_1 = require("../entities/payment-behavior-score.entity");
const financing_request_entity_1 = require("../entities/financing-request.entity");
const supply_chain_relationship_entity_1 = require("../entities/supply-chain-relationship.entity");
const payment_prediction_entity_1 = require("../entities/payment-prediction.entity");
// Services
const subscription_service_1 = require("../services/subscription.service");
const installment_service_1 = require("../services/installment.service");
const payment_prediction_service_1 = require("../services/payment-prediction.service");
const payment_behavior_scoring_service_1 = require("../services/payment-behavior-scoring.service");
const supply_chain_finance_service_1 = require("../services/supply-chain-finance.service");
const payment_security_service_1 = require("../services/payment-security.service");
// Controllers
const deepseek_integration_controller_1 = require("../controllers/deepseek-integration.controller");
let AdvancedPaymentModule = class AdvancedPaymentModule {
};
exports.AdvancedPaymentModule = AdvancedPaymentModule;
exports.AdvancedPaymentModule = AdvancedPaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                recurring_subscription_entity_1.RecurringSubscription,
                subscription_payment_entity_1.SubscriptionPayment,
                installment_plan_entity_1.InstallmentPlan,
                installment_payment_entity_1.InstallmentPayment,
                payment_behavior_score_entity_1.PaymentBehaviorScore,
                financing_request_entity_1.FinancingRequest,
                supply_chain_relationship_entity_1.SupplyChainRelationship,
                payment_prediction_entity_1.PaymentSuccessPrediction
            ]),
            config_1.ConfigModule,
        ],
        controllers: [
            deepseek_integration_controller_1.DeepSeekIntegrationController
        ],
        providers: [
            subscription_service_1.SubscriptionService,
            installment_service_1.InstallmentService,
            payment_prediction_service_1.PaymentPredictionService,
            payment_behavior_scoring_service_1.PaymentBehaviorScoringService,
            supply_chain_finance_service_1.SupplyChainFinanceService,
            payment_security_service_1.PaymentSecurityService
        ],
        exports: [
            subscription_service_1.SubscriptionService,
            installment_service_1.InstallmentService,
            payment_prediction_service_1.PaymentPredictionService,
            payment_behavior_scoring_service_1.PaymentBehaviorScoringService,
            supply_chain_finance_service_1.SupplyChainFinanceService,
            payment_security_service_1.PaymentSecurityService
        ],
    })
], AdvancedPaymentModule);
//# sourceMappingURL=advanced-payment-phase3.module.js.map