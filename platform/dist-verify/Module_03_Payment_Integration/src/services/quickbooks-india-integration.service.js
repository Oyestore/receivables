"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QuickbooksIndiaIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickbooksIndiaIntegrationService = void 0;
const common_1 = require("@nestjs/common");
let QuickbooksIndiaIntegrationService = QuickbooksIndiaIntegrationService_1 = class QuickbooksIndiaIntegrationService {
    constructor() {
        this.logger = new common_1.Logger(QuickbooksIndiaIntegrationService_1.name);
    }
    async sync() {
        this.logger.log('Syncing with QuickBooks India...');
        return { success: true };
    }
};
exports.QuickbooksIndiaIntegrationService = QuickbooksIndiaIntegrationService;
exports.QuickbooksIndiaIntegrationService = QuickbooksIndiaIntegrationService = QuickbooksIndiaIntegrationService_1 = __decorate([
    (0, common_1.Injectable)()
], QuickbooksIndiaIntegrationService);
//# sourceMappingURL=quickbooks-india-integration.service.js.map