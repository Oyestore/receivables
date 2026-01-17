"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayFactory = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_gateway_entity_1 = require("../entities/payment-gateway.entity");
const razorpay_gateway_service_1 = require("../gateways/razorpay-gateway.service");
const stripe_gateway_service_1 = require("../gateways/stripe-gateway.service");
const payu_gateway_service_1 = require("../gateways/payu-gateway.service");
let PaymentGatewayFactory = class PaymentGatewayFactory {
    constructor(configService, gatewayRepository) {
        this.configService = configService;
        this.gatewayRepository = gatewayRepository;
        this.gatewayServices = new Map();
    }
    async createGatewayService(gateway) {
        // Check if we already have an instance for this gateway
        const cacheKey = `${gateway.id}-${gateway.updatedAt.getTime()}`;
        if (this.gatewayServices.has(cacheKey)) {
            return this.gatewayServices.get(cacheKey);
        }
        // Create a new gateway service instance based on the type
        let gatewayService;
        switch (gateway.type) {
            case payment_gateway_entity_1.PaymentGatewayType.RAZORPAY:
                gatewayService = new razorpay_gateway_service_1.RazorpayGatewayService();
                break;
            case payment_gateway_entity_1.PaymentGatewayType.STRIPE:
                gatewayService = new stripe_gateway_service_1.StripeGatewayService();
                break;
            case payment_gateway_entity_1.PaymentGatewayType.PAYU:
                gatewayService = new payu_gateway_service_1.PayUGatewayService();
                break;
            // Add more gateway implementations as needed
            default:
                return null;
        }
        // Initialize the gateway with its configuration
        const config = {
            ...gateway.configuration,
            ...gateway.credentials,
            isSandbox: gateway.isSandboxMode,
        };
        const initialized = await gatewayService.initialize(config);
        if (!initialized) {
            return null;
        }
        // Cache the initialized gateway service
        this.gatewayServices.set(cacheKey, gatewayService);
        return gatewayService;
    }
    async getGatewayService(gatewayId) {
        const gateway = await this.gatewayRepository.findOne({ where: { id: gatewayId } });
        if (!gateway || !gateway.isEnabled) {
            return null;
        }
        return this.createGatewayService(gateway);
    }
    async getOptimalGateway(organizationId, amount, currency, paymentMethod) {
        // Find all active gateways for the organization
        const gateways = await this.gatewayRepository.find({
            where: {
                organizationId,
                isEnabled: true,
                status: 'active',
            },
            order: {
                priority: 'ASC',
            },
        });
        if (!gateways.length) {
            return null;
        }
        // Find the optimal gateway based on fees and priority
        let optimalGateway = null;
        let optimalService = null;
        let lowestTotalFee = Number.MAX_VALUE;
        for (const gateway of gateways) {
            const gatewayService = await this.createGatewayService(gateway);
            if (!gatewayService)
                continue;
            // Check if the gateway supports the payment method and currency
            const supportedMethods = gatewayService.getSupportedPaymentMethods();
            const supportedCurrencies = gatewayService.getSupportedCurrencies();
            if (!supportedMethods.includes(paymentMethod) || !supportedCurrencies.includes(currency)) {
                continue;
            }
            // Calculate the total fee
            const { percentage, fixed } = gatewayService.getTransactionFees(amount, currency, paymentMethod);
            const totalFee = (amount * percentage / 100) + fixed;
            if (totalFee < lowestTotalFee) {
                lowestTotalFee = totalFee;
                optimalGateway = gateway;
                optimalService = gatewayService;
            }
        }
        if (!optimalGateway || !optimalService) {
            return null;
        }
        return { gateway: optimalGateway, service: optimalService };
    }
    clearCache() {
        this.gatewayServices.clear();
    }
};
exports.PaymentGatewayFactory = PaymentGatewayFactory;
exports.PaymentGatewayFactory = PaymentGatewayFactory = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(payment_gateway_entity_1.PaymentGateway)),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeorm_2.Repository])
], PaymentGatewayFactory);
//# sourceMappingURL=payment-gateway-factory.service.js.map