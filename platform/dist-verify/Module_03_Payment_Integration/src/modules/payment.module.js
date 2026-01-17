"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
// Entities
const payment_gateway_entity_1 = require("../entities/payment-gateway.entity");
const payment_method_entity_1 = require("../entities/payment-method.entity");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const payment_reconciliation_entity_1 = require("../entities/payment-reconciliation.entity");
const virtual_account_entity_1 = require("../entities/virtual-account.entity");
// Services
const payment_gateway_factory_service_1 = require("../services/payment-gateway-factory.service");
const payment_processing_service_1 = require("../services/payment-processing.service");
const invoice_payment_integration_service_1 = require("../services/invoice-payment-integration.service");
const distribution_payment_integration_service_1 = require("../services/distribution-payment-integration.service");
const upi_integration_service_1 = require("../services/upi-integration.service");
const rural_payment_service_1 = require("../services/rural-payment.service");
const virtual_account_service_1 = require("../services/virtual-account.service");
const financing_provider_integration_service_1 = require("../services/financing-provider-integration.service");
const sms_payment_service_1 = require("../services/sms-payment.service");
// Controllers
const payment_gateway_controller_1 = require("../controllers/payment-gateway.controller");
const payment_method_controller_1 = require("../controllers/payment-method.controller");
const payment_transaction_controller_1 = require("../controllers/payment-transaction.controller");
const advanced_payment_phase3_module_1 = require("./advanced-payment-phase3.module");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                payment_gateway_entity_1.PaymentGateway,
                payment_method_entity_1.PaymentMethod,
                payment_transaction_entity_1.PaymentTransaction,
                payment_reconciliation_entity_1.PaymentReconciliation,
                virtual_account_entity_1.VirtualAccount,
            ]),
            config_1.ConfigModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            advanced_payment_phase3_module_1.AdvancedPaymentModule,
        ],
        controllers: [
            payment_gateway_controller_1.PaymentGatewayController,
            payment_method_controller_1.PaymentMethodController,
            payment_transaction_controller_1.PaymentTransactionController,
        ],
        providers: [
            payment_gateway_factory_service_1.PaymentGatewayFactory,
            payment_processing_service_1.PaymentProcessingService,
            invoice_payment_integration_service_1.InvoicePaymentIntegrationService,
            distribution_payment_integration_service_1.DistributionPaymentIntegrationService,
            upi_integration_service_1.UPIIntegrationService,
            rural_payment_service_1.RuralPaymentService,
            virtual_account_service_1.VirtualAccountService,
            financing_provider_integration_service_1.FinancingProviderIntegrationService,
            sms_payment_service_1.SMSPaymentService,
        ],
        exports: [
            payment_processing_service_1.PaymentProcessingService,
            invoice_payment_integration_service_1.InvoicePaymentIntegrationService,
            distribution_payment_integration_service_1.DistributionPaymentIntegrationService,
            upi_integration_service_1.UPIIntegrationService,
            rural_payment_service_1.RuralPaymentService,
            virtual_account_service_1.VirtualAccountService,
            financing_provider_integration_service_1.FinancingProviderIntegrationService,
            sms_payment_service_1.SMSPaymentService,
        ],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map