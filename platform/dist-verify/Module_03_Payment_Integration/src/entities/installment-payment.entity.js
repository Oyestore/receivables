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
exports.InstallmentPayment = exports.InstallmentPaymentStatus = void 0;
const typeorm_1 = require("typeorm");
const installment_plan_entity_1 = require("./installment-plan.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
var InstallmentPaymentStatus;
(function (InstallmentPaymentStatus) {
    InstallmentPaymentStatus["SCHEDULED"] = "scheduled";
    InstallmentPaymentStatus["PENDING"] = "pending";
    InstallmentPaymentStatus["PAID"] = "paid";
    InstallmentPaymentStatus["PARTIALLY_PAID"] = "partially_paid";
    InstallmentPaymentStatus["OVERDUE"] = "overdue";
    InstallmentPaymentStatus["DEFAULTED"] = "defaulted";
    InstallmentPaymentStatus["CANCELLED"] = "cancelled";
})(InstallmentPaymentStatus || (exports.InstallmentPaymentStatus = InstallmentPaymentStatus = {}));
let InstallmentPayment = class InstallmentPayment {
};
exports.InstallmentPayment = InstallmentPayment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => installment_plan_entity_1.InstallmentPlan, plan => plan.payments),
    __metadata("design:type", installment_plan_entity_1.InstallmentPlan)
], InstallmentPayment.prototype, "installmentPlan", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "installmentPlanId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "installmentNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "interestAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "principalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "remainingAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "lateFeeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], InstallmentPayment.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], InstallmentPayment.prototype, "paidDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: InstallmentPaymentStatus,
        default: InstallmentPaymentStatus.SCHEDULED,
    }),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_transaction_entity_1.PaymentTransaction, { nullable: true }),
    __metadata("design:type", typeof (_a = typeof payment_transaction_entity_1.PaymentTransaction !== "undefined" && payment_transaction_entity_1.PaymentTransaction) === "function" ? _a : Object)
], InstallmentPayment.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "paymentMethodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], InstallmentPayment.prototype, "reminderSentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], InstallmentPayment.prototype, "remindersSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InstallmentPayment.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], InstallmentPayment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], InstallmentPayment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], InstallmentPayment.prototype, "updatedAt", void 0);
exports.InstallmentPayment = InstallmentPayment = __decorate([
    (0, typeorm_1.Entity)()
], InstallmentPayment);
//# sourceMappingURL=installment-payment.entity.js.map