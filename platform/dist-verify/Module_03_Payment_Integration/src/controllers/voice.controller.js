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
var VoiceController_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceController = void 0;
const common_1 = require("@nestjs/common");
const voice_collection_service_1 = require("../services/voice-collection.service");
const voice_authentication_service_1 = require("../services/voice-authentication.service");
const voice_language_service_1 = require("../services/voice-language.service");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
let VoiceController = VoiceController_1 = class VoiceController {
    constructor(voiceCollectionService, voiceAuthenticationService, voiceLanguageService) {
        this.voiceCollectionService = voiceCollectionService;
        this.voiceAuthenticationService = voiceAuthenticationService;
        this.voiceLanguageService = voiceLanguageService;
        this.logger = new common_1.Logger(VoiceController_1.name);
    }
    async getSupportedLanguages(activeOnly = true) {
        return await this.voiceLanguageService.getAllLanguages(activeOnly);
    }
    async initiatePaymentReminder(reminderData) {
        return await this.voiceCollectionService.initiatePaymentReminder(reminderData.customerId, reminderData.organizationId, reminderData.invoiceId, reminderData.languageCode);
    }
    async processInboundCall(callData) {
        return await this.voiceCollectionService.processInboundPaymentCall(callData.phoneNumber, callData.languageCode);
    }
    async enrollVoiceBiometric(enrollmentData) {
        return await this.voiceAuthenticationService.enrollVoiceBiometric(enrollmentData.customerId, enrollmentData.organizationId, enrollmentData.voiceData);
    }
    async verifyVoiceBiometric(verificationData) {
        return await this.voiceAuthenticationService.verifyVoiceBiometric(verificationData.customerId, verificationData.organizationId, verificationData.voiceData);
    }
    async updatePaymentInformation(sessionId, paymentDetails) {
        return await this.voiceCollectionService.updatePaymentInformation(sessionId, paymentDetails);
    }
    async completeInteraction(sessionId, completionData) {
        return await this.voiceCollectionService.completeInteraction(sessionId, completionData.status, completionData.metrics);
    }
    async getInteractionDetails(sessionId) {
        return await this.voiceCollectionService.getInteractionDetails(sessionId);
    }
    // Webhook endpoints for telephony provider callbacks
    async handleCallStatusWebhook(webhookData) {
        this.logger.log(`Received call status webhook: ${JSON.stringify(webhookData)}`);
        // Process webhook data and update interaction status
        return { success: true };
    }
    async handleSpeechInputWebhook(webhookData) {
        this.logger.log(`Received speech input webhook: ${JSON.stringify(webhookData)}`);
        // Process speech input and determine next action
        return { success: true };
    }
};
exports.VoiceController = VoiceController;
__decorate([
    (0, common_1.Get)('languages'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "getSupportedLanguages", null);
__decorate([
    (0, common_1.Post)('reminder'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "initiatePaymentReminder", null);
__decorate([
    (0, common_1.Post)('inbound'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "processInboundCall", null);
__decorate([
    (0, common_1.Post)('enroll-biometric'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "enrollVoiceBiometric", null);
__decorate([
    (0, common_1.Post)('verify-biometric'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "verifyVoiceBiometric", null);
__decorate([
    (0, common_1.Post)('session/:sessionId/payment'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "updatePaymentInformation", null);
__decorate([
    (0, common_1.Post)('session/:sessionId/complete'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "completeInteraction", null);
__decorate([
    (0, common_1.Get)('session/:sessionId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "getInteractionDetails", null);
__decorate([
    (0, common_1.Post)('webhook/call-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "handleCallStatusWebhook", null);
__decorate([
    (0, common_1.Post)('webhook/speech-input'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceController.prototype, "handleSpeechInputWebhook", null);
exports.VoiceController = VoiceController = VoiceController_1 = __decorate([
    (0, common_1.Controller)('payment/voice'),
    __metadata("design:paramtypes", [typeof (_a = typeof voice_collection_service_1.VoiceCollectionService !== "undefined" && voice_collection_service_1.VoiceCollectionService) === "function" ? _a : Object, typeof (_b = typeof voice_authentication_service_1.VoiceAuthenticationService !== "undefined" && voice_authentication_service_1.VoiceAuthenticationService) === "function" ? _b : Object, typeof (_c = typeof voice_language_service_1.VoiceLanguageService !== "undefined" && voice_language_service_1.VoiceLanguageService) === "function" ? _c : Object])
], VoiceController);
//# sourceMappingURL=voice.controller.js.map