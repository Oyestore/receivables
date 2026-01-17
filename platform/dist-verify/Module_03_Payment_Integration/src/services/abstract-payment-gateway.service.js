"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractPaymentGatewayService = void 0;
const common_1 = require("@nestjs/common");
class AbstractPaymentGatewayService {
    constructor(gatewayName) {
        this.gatewayName = gatewayName;
        this.isInitialized = false;
        this.logger = new common_1.Logger(`${gatewayName}PaymentGateway`);
    }
    async initialize(config) {
        try {
            this.config = config;
            this.validateConfig();
            await this.initializeGateway();
            this.isInitialized = true;
            this.logger.log(`${this.gatewayName} payment gateway initialized successfully`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to initialize ${this.gatewayName} payment gateway: ${error.message}`, error.stack);
            return false;
        }
    }
    async checkHealth() {
        if (!this.isInitialized) {
            this.logger.warn(`${this.gatewayName} payment gateway is not initialized`);
            return false;
        }
        try {
            return await this.checkGatewayHealth();
        }
        catch (error) {
            this.logger.error(`Health check failed for ${this.gatewayName} payment gateway: ${error.message}`, error.stack);
            return false;
        }
    }
    getGatewayName() {
        return this.gatewayName;
    }
    handleError(error, operation) {
        const errorMessage = error.message || 'Unknown error';
        const errorCode = error.code || 'UNKNOWN_ERROR';
        this.logger.error(`${this.gatewayName} ${operation} failed: ${errorMessage}`, error.stack);
        throw {
            message: `${this.gatewayName} ${operation} failed: ${errorMessage}`,
            code: errorCode,
            originalError: error,
        };
    }
}
exports.AbstractPaymentGatewayService = AbstractPaymentGatewayService;
//# sourceMappingURL=abstract-payment-gateway.service.js.map