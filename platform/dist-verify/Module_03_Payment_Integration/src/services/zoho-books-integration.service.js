"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ZohoBooksIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoBooksIntegrationService = void 0;
const common_1 = require("@nestjs/common");
let ZohoBooksIntegrationService = ZohoBooksIntegrationService_1 = class ZohoBooksIntegrationService {
    constructor() {
        this.logger = new common_1.Logger(ZohoBooksIntegrationService_1.name);
    }
    async syncInvoices() {
        this.logger.log('Syncing invoices with Zoho Books...');
        return { success: true, message: 'Sync not implemented yet' };
    }
};
exports.ZohoBooksIntegrationService = ZohoBooksIntegrationService;
exports.ZohoBooksIntegrationService = ZohoBooksIntegrationService = ZohoBooksIntegrationService_1 = __decorate([
    (0, common_1.Injectable)()
], ZohoBooksIntegrationService);
//# sourceMappingURL=zoho-books-integration.service.js.map