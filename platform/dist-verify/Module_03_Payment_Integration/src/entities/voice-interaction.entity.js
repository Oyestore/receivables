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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceInteraction = void 0;
const typeorm_1 = require("typeorm");
let VoiceInteraction = class VoiceInteraction {
};
exports.VoiceInteraction = VoiceInteraction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "interactionType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "languageCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], VoiceInteraction.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], VoiceInteraction.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], VoiceInteraction.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VoiceInteraction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('json'),
    __metadata("design:type", Array)
], VoiceInteraction.prototype, "interactionFlow", void 0);
__decorate([
    (0, typeorm_1.Column)('json'),
    __metadata("design:type", Object)
], VoiceInteraction.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.Column)('json'),
    __metadata("design:type", Object)
], VoiceInteraction.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VoiceInteraction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VoiceInteraction.prototype, "updatedAt", void 0);
exports.VoiceInteraction = VoiceInteraction = __decorate([
    (0, typeorm_1.Entity)()
], VoiceInteraction);
//# sourceMappingURL=voice-interaction.entity.js.map