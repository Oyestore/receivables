"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrIntegrationModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const ocr_integration_service_1 = require("./services/ocr-integration.service");
let OcrIntegrationModule = class OcrIntegrationModule {
};
exports.OcrIntegrationModule = OcrIntegrationModule;
exports.OcrIntegrationModule = OcrIntegrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 30000, // Default timeout for HTTP requests
                maxRedirects: 5, // Default max redirects
            }),
        ],
        providers: [ocr_integration_service_1.OcrIntegrationService],
        exports: [ocr_integration_service_1.OcrIntegrationService], // Export if other modules need to use this service
    })
], OcrIntegrationModule);
//# sourceMappingURL=ocr-integration.module.js.map