"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TallyIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TallyIntegrationService = void 0;
const common_1 = require("@nestjs/common");
let TallyIntegrationService = TallyIntegrationService_1 = class TallyIntegrationService {
    constructor() {
        this.logger = new common_1.Logger(TallyIntegrationService_1.name);
    }
    async sync() {
        this.logger.log('Syncing with Tally...');
        return { success: true };
    }
};
exports.TallyIntegrationService = TallyIntegrationService;
exports.TallyIntegrationService = TallyIntegrationService = TallyIntegrationService_1 = __decorate([
    (0, common_1.Injectable)()
], TallyIntegrationService);
//# sourceMappingURL=tally-integration.service.js.map