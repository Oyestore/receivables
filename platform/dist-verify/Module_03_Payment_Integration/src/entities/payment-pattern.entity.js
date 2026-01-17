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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentPattern = void 0;
const typeorm_1 = require("typeorm");
const buyer_profile_entity_1 = require("./buyer-profile.entity");
/**
 * Entity representing payment patterns identified for a buyer.
 * This tracks recurring payment behaviors and trends used for prediction.
 */
let PaymentPattern = class PaymentPattern {
};
exports.PaymentPattern = PaymentPattern;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentPattern.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pattern_type', length: 50 }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "patternType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confidence_level', type: 'integer' }),
    __metadata("design:type", Number)
], PaymentPattern.prototype, "confidenceLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'frequency_days', type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], PaymentPattern.prototype, "frequencyDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentPattern.prototype, "avgDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentPattern.prototype, "stdDevDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_payment_amount', type: 'decimal', precision: 19, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], PaymentPattern.prototype, "avgPaymentAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pattern_data', type: 'jsonb' }),
    __metadata("design:type", Object)
], PaymentPattern.prototype, "patternData", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'identified_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentPattern.prototype, "identifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_observed_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentPattern.prototype, "lastObservedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentPattern.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_implication', length: 20, nullable: true }),
    __metadata("design:type", String)
], PaymentPattern.prototype, "riskImplication", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentPattern.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PaymentPattern.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => buyer_profile_entity_1.BuyerProfile),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id', referencedColumnName: 'buyerId' }),
    __metadata("design:type", typeof (_a = typeof buyer_profile_entity_1.BuyerProfile !== "undefined" && buyer_profile_entity_1.BuyerProfile) === "function" ? _a : Object)
], PaymentPattern.prototype, "buyerProfile", void 0);
exports.PaymentPattern = PaymentPattern = __decorate([
    (0, typeorm_1.Entity)('payment_patterns')
], PaymentPattern);
//# sourceMappingURL=payment-pattern.entity.js.map