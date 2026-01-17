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
var AuthMiddleware_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AuthMiddleware = AuthMiddleware_1 = class AuthMiddleware {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AuthMiddleware_1.name);
        this.validApiKeys = this.configService.get('VALID_API_KEYS')?.split(',') || [];
    }
    use(req, res, next) {
        const apiKey = this.extractApiKey(req);
        if (!apiKey) {
            this.logger.warn(`Missing API key for request: ${req.method} ${req.url}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'API key is required',
                    timestamp: new Date().toISOString(),
                },
            });
        }
        if (!this.isValidApiKey(apiKey)) {
            this.logger.warn(`Invalid API key used: ${apiKey.substring(0, 8)}... for request: ${req.method} ${req.url}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid API key',
                    timestamp: new Date().toISOString(),
                },
            });
        }
        // Add API key info to request for logging
        req.apiKey = apiKey;
        req.apiKeyPrefix = apiKey.substring(0, 8);
        this.logger.debug(`Authenticated request: ${req.method} ${req.url} with key: ${req.apiKeyPrefix}...`);
        next();
    }
    extractApiKey(req) {
        // Check header first
        const headerKey = req.headers['x-api-key'];
        if (headerKey)
            return headerKey;
        // Check query parameter
        const queryKey = req.query.api_key;
        if (queryKey)
            return queryKey;
        // Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
    isValidApiKey(apiKey) {
        return this.validApiKeys.includes(apiKey);
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = AuthMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map