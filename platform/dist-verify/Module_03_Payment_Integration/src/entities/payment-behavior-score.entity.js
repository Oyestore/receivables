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
exports.PaymentBehaviorScore = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
const customer_entity_1 = require("../../../customers/entities/customer.entity");
/**
 * Entity for storing customer payment behavior scores
 */
let PaymentBehaviorScore = class PaymentBehaviorScore {
};
exports.PaymentBehaviorScore = PaymentBehaviorScore;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentBehaviorScore.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PaymentBehaviorScore.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    (0, typeorm_1.JoinColumn)({ name: 'organizationId' }),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], PaymentBehaviorScore.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PaymentBehaviorScore.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", typeof (_b = typeof customer_entity_1.Customer !== "undefined" && customer_entity_1.Customer) === "function" ? _b : Object)
], PaymentBehaviorScore.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 50.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "overallScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 50.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "paymentTimeliness", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 50.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "paymentConsistency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 50.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "communicationScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 50.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "disputeFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "totalInvoicesAnalyzed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "totalPaymentsAnalyzed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "totalAmountAnalyzed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0.00 }),
    __metadata("design:type", Number)
], PaymentBehaviorScore.prototype, "averagePaymentDelay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], PaymentBehaviorScore.prototype, "scoreFactors", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], PaymentBehaviorScore.prototype, "scoreHistory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'standard' }),
    __metadata("design:type", String)
], PaymentBehaviorScore.prototype, "riskCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentBehaviorScore.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PaymentBehaviorScore.prototype, "lastScoreUpdate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentBehaviorScore.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PaymentBehaviorScore.prototype, "updatedAt", void 0);
exports.PaymentBehaviorScore = PaymentBehaviorScore = __decorate([
    (0, typeorm_1.Entity)('payment_behavior_scores')
], PaymentBehaviorScore);
//# sourceMappingURL=payment-behavior-score.entity.js.map