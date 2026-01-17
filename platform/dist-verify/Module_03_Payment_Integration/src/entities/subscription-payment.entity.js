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
exports.SubscriptionPayment = exports.SubscriptionPaymentStatus = void 0;
const typeorm_1 = require("typeorm");
const recurring_subscription_entity_1 = require("./recurring-subscription.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
var SubscriptionPaymentStatus;
(function (SubscriptionPaymentStatus) {
    SubscriptionPaymentStatus["SCHEDULED"] = "scheduled";
    SubscriptionPaymentStatus["PENDING"] = "pending";
    SubscriptionPaymentStatus["PAID"] = "paid";
    SubscriptionPaymentStatus["FAILED"] = "failed";
    SubscriptionPaymentStatus["OVERDUE"] = "overdue";
    SubscriptionPaymentStatus["CANCELLED"] = "cancelled";
    SubscriptionPaymentStatus["REFUNDED"] = "refunded";
})(SubscriptionPaymentStatus || (exports.SubscriptionPaymentStatus = SubscriptionPaymentStatus = {}));
let SubscriptionPayment = class SubscriptionPayment {
};
exports.SubscriptionPayment = SubscriptionPayment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => recurring_subscription_entity_1.RecurringSubscription, subscription => subscription.payments),
    __metadata("design:type", recurring_subscription_entity_1.RecurringSubscription)
], SubscriptionPayment.prototype, "subscription", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "lateFeeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "paidDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionPaymentStatus,
        default: SubscriptionPaymentStatus.SCHEDULED,
    }),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_transaction_entity_1.PaymentTransaction, { nullable: true }),
    __metadata("design:type", typeof (_a = typeof payment_transaction_entity_1.PaymentTransaction !== "undefined" && payment_transaction_entity_1.PaymentTransaction) === "function" ? _a : Object)
], SubscriptionPayment.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice, { nullable: true }),
    __metadata("design:type", typeof (_b = typeof invoice_entity_1.Invoice !== "undefined" && invoice_entity_1.Invoice) === "function" ? _b : Object)
], SubscriptionPayment.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "paymentMethodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "retryAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "lastRetryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "nextRetryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "reminderSentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPayment.prototype, "remindersSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SubscriptionPayment.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], SubscriptionPayment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SubscriptionPayment.prototype, "updatedAt", void 0);
exports.SubscriptionPayment = SubscriptionPayment = __decorate([
    (0, typeorm_1.Entity)()
], SubscriptionPayment);
//# sourceMappingURL=subscription-payment.entity.js.map