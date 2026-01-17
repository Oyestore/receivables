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
exports.RecurringSubscription = exports.SubscriptionBillingFrequency = exports.SubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../Module_11_Common/organization.entity");
const subscription_payment_entity_1 = require("./subscription-payment.entity");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["UNPAID"] = "unpaid";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["PAUSED"] = "paused";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SubscriptionBillingFrequency;
(function (SubscriptionBillingFrequency) {
    SubscriptionBillingFrequency["WEEKLY"] = "weekly";
    SubscriptionBillingFrequency["MONTHLY"] = "monthly";
    SubscriptionBillingFrequency["QUARTERLY"] = "quarterly";
    SubscriptionBillingFrequency["SEMI_ANNUALLY"] = "semi_annually";
    SubscriptionBillingFrequency["ANNUALLY"] = "annually";
    SubscriptionBillingFrequency["CUSTOM"] = "custom";
})(SubscriptionBillingFrequency || (exports.SubscriptionBillingFrequency = SubscriptionBillingFrequency = {}));
let RecurringSubscription = class RecurringSubscription {
};
exports.RecurringSubscription = RecurringSubscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionBillingFrequency,
        default: SubscriptionBillingFrequency.MONTHLY,
    }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "billingFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "customFrequencyDays", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "trialEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "nextBillingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "lastBillingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "totalBillingCycles", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "completedBillingCycles", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "maxBillingCycles", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], RecurringSubscription.prototype, "isAutoRenew", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], RecurringSubscription.prototype, "isAutoPay", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "defaultPaymentMethodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "lateFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "lateFeeFixed", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 3 }),
    __metadata("design:type", Number)
], RecurringSubscription.prototype, "maxRetryAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RecurringSubscription.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", organization_entity_1.Organization)
], RecurringSubscription.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RecurringSubscription.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => subscription_payment_entity_1.SubscriptionPayment, payment => payment.subscription),
    __metadata("design:type", Array)
], RecurringSubscription.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], RecurringSubscription.prototype, "updatedAt", void 0);
exports.RecurringSubscription = RecurringSubscription = __decorate([
    (0, typeorm_1.Entity)()
], RecurringSubscription);
//# sourceMappingURL=recurring-subscription.entity.js.map