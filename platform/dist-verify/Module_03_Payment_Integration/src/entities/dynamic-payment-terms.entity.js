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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicPaymentTerms = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
const customer_entity_1 = require("../../../customers/entities/customer.entity");
const payment_behavior_score_entity_1 = require("./payment-behavior-score.entity");
/**
 * Entity for storing dynamic payment terms based on customer reputation
 */
let DynamicPaymentTerms = class DynamicPaymentTerms {
};
exports.DynamicPaymentTerms = DynamicPaymentTerms;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DynamicPaymentTerms.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DynamicPaymentTerms.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    (0, typeorm_1.JoinColumn)({ name: 'organizationId' }),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], DynamicPaymentTerms.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DynamicPaymentTerms.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", typeof (_b = typeof customer_entity_1.Customer !== "undefined" && customer_entity_1.Customer) === "function" ? _b : Object)
], DynamicPaymentTerms.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DynamicPaymentTerms.prototype, "behaviorScoreId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_behavior_score_entity_1.PaymentBehaviorScore),
    (0, typeorm_1.JoinColumn)({ name: 'behaviorScoreId' }),
    __metadata("design:type", payment_behavior_score_entity_1.PaymentBehaviorScore)
], DynamicPaymentTerms.prototype, "behaviorScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 30 }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "paymentTermDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "earlyPaymentDiscountPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "earlyPaymentDiscountDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "latePaymentFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DynamicPaymentTerms.prototype, "requiresDeposit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "depositPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DynamicPaymentTerms.prototype, "allowsInstallments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], DynamicPaymentTerms.prototype, "maxInstallments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], DynamicPaymentTerms.prototype, "additionalTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'auto' }),
    __metadata("design:type", String)
], DynamicPaymentTerms.prototype, "termsSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], DynamicPaymentTerms.prototype, "lastReviewDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], DynamicPaymentTerms.prototype, "nextReviewDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], DynamicPaymentTerms.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DynamicPaymentTerms.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], DynamicPaymentTerms.prototype, "updatedAt", void 0);
exports.DynamicPaymentTerms = DynamicPaymentTerms = __decorate([
    (0, typeorm_1.Entity)('dynamic_payment_terms')
], DynamicPaymentTerms);
//# sourceMappingURL=dynamic-payment-terms.entity.js.map