"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UniversalIntegrationHubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalIntegrationHubService = void 0;
const common_1 = require("@nestjs/common");
let UniversalIntegrationHubService = UniversalIntegrationHubService_1 = class UniversalIntegrationHubService {
    constructor() {
        this.logger = new common_1.Logger(UniversalIntegrationHubService_1.name);
    }
    async sync() {
        this.logger.log('Syncing with Universal Hub...');
        return { success: true };
    }
};
exports.UniversalIntegrationHubService = UniversalIntegrationHubService;
exports.UniversalIntegrationHubService = UniversalIntegrationHubService = UniversalIntegrationHubService_1 = __decorate([
    (0, common_1.Injectable)()
], UniversalIntegrationHubService);
//# sourceMappingURL=universal-integration-hub.service.js.map