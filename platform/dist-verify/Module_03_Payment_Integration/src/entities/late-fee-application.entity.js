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
exports.LateFeeApplication = exports.LateFeeApplicationStatus = void 0;
const typeorm_1 = require("typeorm");
const payment_late_fee_rule_entity_1 = require("./payment-late-fee-rule.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
var LateFeeApplicationStatus;
(function (LateFeeApplicationStatus) {
    LateFeeApplicationStatus["PENDING"] = "pending";
    LateFeeApplicationStatus["APPLIED"] = "applied";
    LateFeeApplicationStatus["WAIVED"] = "waived";
    LateFeeApplicationStatus["PAID"] = "paid";
    LateFeeApplicationStatus["CANCELLED"] = "cancelled";
})(LateFeeApplicationStatus || (exports.LateFeeApplicationStatus = LateFeeApplicationStatus = {}));
let LateFeeApplication = class LateFeeApplication {
};
exports.LateFeeApplication = LateFeeApplication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_late_fee_rule_entity_1.PaymentLateFeeRule),
    __metadata("design:type", payment_late_fee_rule_entity_1.PaymentLateFeeRule)
], LateFeeApplication.prototype, "lateFeeRule", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "lateFeeRuleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice),
    __metadata("design:type", typeof (_a = typeof invoice_entity_1.Invoice !== "undefined" && invoice_entity_1.Invoice) === "function" ? _a : Object)
], LateFeeApplication.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_transaction_entity_1.PaymentTransaction, { nullable: true }),
    __metadata("design:type", typeof (_b = typeof payment_transaction_entity_1.PaymentTransaction !== "undefined" && payment_transaction_entity_1.PaymentTransaction) === "function" ? _b : Object)
], LateFeeApplication.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], LateFeeApplication.prototype, "originalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], LateFeeApplication.prototype, "feeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], LateFeeApplication.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LateFeeApplicationStatus,
        default: LateFeeApplicationStatus.PENDING,
    }),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], LateFeeApplication.prototype, "daysOverdue", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], LateFeeApplication.prototype, "appliedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], LateFeeApplication.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], LateFeeApplication.prototype, "waivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "waivedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LateFeeApplication.prototype, "waivedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], LateFeeApplication.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], LateFeeApplication.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], LateFeeApplication.prototype, "updatedAt", void 0);
exports.LateFeeApplication = LateFeeApplication = __decorate([
    (0, typeorm_1.Entity)()
], LateFeeApplication);
//# sourceMappingURL=late-fee-application.entity.js.map