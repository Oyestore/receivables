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
exports.PaymentLateFeeRule = exports.LateFeeStatus = exports.LateFeeFrequency = exports.LateFeeType = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
var LateFeeType;
(function (LateFeeType) {
    LateFeeType["PERCENTAGE"] = "percentage";
    LateFeeType["FIXED_AMOUNT"] = "fixed_amount";
    LateFeeType["COMPOUND_PERCENTAGE"] = "compound_percentage";
})(LateFeeType || (exports.LateFeeType = LateFeeType = {}));
var LateFeeFrequency;
(function (LateFeeFrequency) {
    LateFeeFrequency["ONE_TIME"] = "one_time";
    LateFeeFrequency["DAILY"] = "daily";
    LateFeeFrequency["WEEKLY"] = "weekly";
    LateFeeFrequency["MONTHLY"] = "monthly";
    LateFeeFrequency["CUSTOM"] = "custom";
})(LateFeeFrequency || (exports.LateFeeFrequency = LateFeeFrequency = {}));
var LateFeeStatus;
(function (LateFeeStatus) {
    LateFeeStatus["ACTIVE"] = "active";
    LateFeeStatus["INACTIVE"] = "inactive";
    LateFeeStatus["SCHEDULED"] = "scheduled";
    LateFeeStatus["EXPIRED"] = "expired";
})(LateFeeStatus || (exports.LateFeeStatus = LateFeeStatus = {}));
let PaymentLateFeeRule = class PaymentLateFeeRule {
};
exports.PaymentLateFeeRule = PaymentLateFeeRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LateFeeType,
        default: LateFeeType.PERCENTAGE,
    }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "feeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "feeValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LateFeeFrequency,
        default: LateFeeFrequency.ONE_TIME,
    }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "frequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "maximumFeeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "maximumFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LateFeeStatus,
        default: LateFeeStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentLateFeeRule.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentLateFeeRule.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentLateFeeRule.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "minimumInvoiceAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentLateFeeRule.prototype, "isAutomaticallyApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "notificationMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentLateFeeRule.prototype, "abTestingConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PaymentLateFeeRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], PaymentLateFeeRule.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentLateFeeRule.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentLateFeeRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentLateFeeRule.prototype, "updatedAt", void 0);
exports.PaymentLateFeeRule = PaymentLateFeeRule = __decorate([
    (0, typeorm_1.Entity)()
], PaymentLateFeeRule);
//# sourceMappingURL=payment-late-fee-rule.entity.js.map