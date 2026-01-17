"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentSecurityService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSecurityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let PaymentSecurityService = PaymentSecurityService_1 = class PaymentSecurityService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PaymentSecurityService_1.name);
        this.algorithm = 'aes-256-gcm';
        // Get encryption key from environment or generate one
        const keyString = this.configService.get('PAYMENT_ENCRYPTION_KEY');
        if (!keyString) {
            this.logger.warn('PAYMENT_ENCRYPTION_KEY not found in environment, generating a temporary key');
            // In production, this should be a stable key stored securely
            this.encryptionKey = crypto.randomBytes(32);
        }
        else {
            this.encryptionKey = Buffer.from(keyString, 'hex');
        }
    }
    /**
     * Encrypts sensitive payment data
     * @param data Object containing sensitive data
     * @returns Encrypted string
     */
    encryptData(data) {
        try {
            // Generate initialization vector
            const iv = crypto.randomBytes(16);
            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
            // Encrypt data
            const jsonData = JSON.stringify(data);
            let encrypted = cipher.update(jsonData, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Get auth tag
            const authTag = cipher.getAuthTag();
            // Combine IV, encrypted data, and auth tag for storage
            return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
        }
        catch (error) {
            this.logger.error(`Encryption failed: ${error.message}`, error.stack);
            throw new Error('Failed to encrypt sensitive data');
        }
    }
    /**
     * Decrypts sensitive payment data
     * @param encryptedData Encrypted string
     * @returns Decrypted object
     */
    decryptData(encryptedData) {
        try {
            // Split the stored data
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const authTag = Buffer.from(parts[2], 'hex');
            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            // Decrypt data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        }
        catch (error) {
            this.logger.error(`Decryption failed: ${error.message}`, error.stack);
            throw new Error('Failed to decrypt sensitive data');
        }
    }
    /**
     * Masks sensitive data like card numbers
     * @param cardNumber Full card number
     * @returns Masked card number
     */
    maskCardNumber(cardNumber) {
        if (!cardNumber || cardNumber.length < 13) {
            return '****';
        }
        // Keep first 6 and last 4 digits, mask the rest
        const firstSix = cardNumber.substring(0, 6);
        const lastFour = cardNumber.substring(cardNumber.length - 4);
        const maskedLength = cardNumber.length - 10;
        const masked = '*'.repeat(maskedLength);
        return `${firstSix}${masked}${lastFour}`;
    }
    /**
     * Validates webhook signatures
     * @param payload Raw webhook payload
     * @param signature Signature from headers
     * @param secret Webhook secret
     * @returns Boolean indicating if signature is valid
     */
    validateWebhookSignature(payload, signature, secret) {
        try {
            const hmac = crypto.createHmac('sha256', secret);
            const expectedSignature = hmac.update(payload).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }
        catch (error) {
            this.logger.error(`Webhook signature validation failed: ${error.message}`, error.stack);
            return false;
        }
    }
    /**
     * Generates a secure idempotency key
     * @returns Unique idempotency key
     */
    generateIdempotencyKey() {
        return crypto.randomBytes(16).toString('hex');
    }
    /**
     * Sanitizes input to prevent injection attacks
     * @param input User input
     * @returns Sanitized input
     */
    sanitizeInput(input) {
        if (!input)
            return '';
        // Basic sanitization - remove script tags and other potentially dangerous content
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }
};
exports.PaymentSecurityService = PaymentSecurityService;
exports.PaymentSecurityService = PaymentSecurityService = PaymentSecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], PaymentSecurityService);
//# sourceMappingURL=payment-security.service.js.map