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
exports.PaymentDiscountRule = exports.DiscountStatus = exports.DiscountTrigger = exports.DiscountType = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var DiscountTrigger;
(function (DiscountTrigger) {
    DiscountTrigger["EARLY_PAYMENT"] = "early_payment";
    DiscountTrigger["VOLUME_BASED"] = "volume_based";
    DiscountTrigger["LOYALTY_BASED"] = "loyalty_based";
    DiscountTrigger["CUSTOM"] = "custom";
})(DiscountTrigger || (exports.DiscountTrigger = DiscountTrigger = {}));
var DiscountStatus;
(function (DiscountStatus) {
    DiscountStatus["ACTIVE"] = "active";
    DiscountStatus["INACTIVE"] = "inactive";
    DiscountStatus["SCHEDULED"] = "scheduled";
    DiscountStatus["EXPIRED"] = "expired";
})(DiscountStatus || (exports.DiscountStatus = DiscountStatus = {}));
let PaymentDiscountRule = class PaymentDiscountRule {
};
exports.PaymentDiscountRule = PaymentDiscountRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountType,
        default: DiscountType.PERCENTAGE,
    }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentDiscountRule.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountTrigger,
        default: DiscountTrigger.EARLY_PAYMENT,
    }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "triggerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], PaymentDiscountRule.prototype, "triggerConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountStatus,
        default: DiscountStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentDiscountRule.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentDiscountRule.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentDiscountRule.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentDiscountRule.prototype, "minimumAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentDiscountRule.prototype, "maximumAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PaymentDiscountRule.prototype, "isAutomaticallyApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "displayMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentDiscountRule.prototype, "abTestingConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PaymentDiscountRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], PaymentDiscountRule.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentDiscountRule.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentDiscountRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentDiscountRule.prototype, "updatedAt", void 0);
exports.PaymentDiscountRule = PaymentDiscountRule = __decorate([
    (0, typeorm_1.Entity)()
], PaymentDiscountRule);
//# sourceMappingURL=payment-discount-rule.entity.js.map