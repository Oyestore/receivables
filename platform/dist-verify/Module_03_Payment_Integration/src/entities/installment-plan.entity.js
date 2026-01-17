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
exports.InstallmentPlan = exports.InstallmentFrequency = exports.InstallmentPlanStatus = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const installment_payment_entity_1 = require("./installment-payment.entity");
var InstallmentPlanStatus;
(function (InstallmentPlanStatus) {
    InstallmentPlanStatus["DRAFT"] = "draft";
    InstallmentPlanStatus["ACTIVE"] = "active";
    InstallmentPlanStatus["COMPLETED"] = "completed";
    InstallmentPlanStatus["DEFAULTED"] = "defaulted";
    InstallmentPlanStatus["CANCELLED"] = "cancelled";
})(InstallmentPlanStatus || (exports.InstallmentPlanStatus = InstallmentPlanStatus = {}));
var InstallmentFrequency;
(function (InstallmentFrequency) {
    InstallmentFrequency["WEEKLY"] = "weekly";
    InstallmentFrequency["BI_WEEKLY"] = "bi_weekly";
    InstallmentFrequency["MONTHLY"] = "monthly";
    InstallmentFrequency["QUARTERLY"] = "quarterly";
    InstallmentFrequency["CUSTOM"] = "custom";
})(InstallmentFrequency || (exports.InstallmentFrequency = InstallmentFrequency = {}));
let InstallmentPlan = class InstallmentPlan {
};
exports.InstallmentPlan = InstallmentPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: InstallmentPlanStatus,
        default: InstallmentPlanStatus.DRAFT,
    }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "remainingAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "numberOfInstallments", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: InstallmentFrequency,
        default: InstallmentFrequency.MONTHLY,
    }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "frequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "customFrequencyDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "downPaymentAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], InstallmentPlan.prototype, "downPaymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "downPaymentTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], InstallmentPlan.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], InstallmentPlan.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "interestRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], InstallmentPlan.prototype, "isInterestBearing", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], InstallmentPlan.prototype, "isAutoPay", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "defaultPaymentMethodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], InstallmentPlan.prototype, "isEarlyPaymentAllowed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "earlyPaymentDiscountPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "latePaymentFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPlan.prototype, "latePaymentFeeFixed", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], InstallmentPlan.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], InstallmentPlan.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice, { nullable: true }),
    __metadata("design:type", typeof (_b = typeof invoice_entity_1.Invoice !== "undefined" && invoice_entity_1.Invoice) === "function" ? _b : Object)
], InstallmentPlan.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPlan.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => installment_payment_entity_1.InstallmentPayment, payment => payment.installmentPlan),
    __metadata("design:type", Array)
], InstallmentPlan.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], InstallmentPlan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], InstallmentPlan.prototype, "updatedAt", void 0);
exports.InstallmentPlan = InstallmentPlan = __decorate([
    (0, typeorm_1.Entity)()
], InstallmentPlan);
//# sourceMappingURL=installment-plan.entity.js.map