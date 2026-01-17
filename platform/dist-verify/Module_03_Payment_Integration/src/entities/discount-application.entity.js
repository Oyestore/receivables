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
exports.DiscountApplication = exports.DiscountApplicationStatus = void 0;
const typeorm_1 = require("typeorm");
const payment_discount_rule_entity_1 = require("./payment-discount-rule.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
var DiscountApplicationStatus;
(function (DiscountApplicationStatus) {
    DiscountApplicationStatus["PENDING"] = "pending";
    DiscountApplicationStatus["APPLIED"] = "applied";
    DiscountApplicationStatus["EXPIRED"] = "expired";
    DiscountApplicationStatus["CANCELLED"] = "cancelled";
})(DiscountApplicationStatus || (exports.DiscountApplicationStatus = DiscountApplicationStatus = {}));
let DiscountApplication = class DiscountApplication {
};
exports.DiscountApplication = DiscountApplication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DiscountApplication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_discount_rule_entity_1.PaymentDiscountRule),
    __metadata("design:type", payment_discount_rule_entity_1.PaymentDiscountRule)
], DiscountApplication.prototype, "discountRule", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DiscountApplication.prototype, "discountRuleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice),
    __metadata("design:type", typeof (_a = typeof invoice_entity_1.Invoice !== "undefined" && invoice_entity_1.Invoice) === "function" ? _a : Object)
], DiscountApplication.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DiscountApplication.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_transaction_entity_1.PaymentTransaction, { nullable: true }),
    __metadata("design:type", typeof (_b = typeof payment_transaction_entity_1.PaymentTransaction !== "undefined" && payment_transaction_entity_1.PaymentTransaction) === "function" ? _b : Object)
], DiscountApplication.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DiscountApplication.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DiscountApplication.prototype, "originalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DiscountApplication.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], DiscountApplication.prototype, "finalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountApplicationStatus,
        default: DiscountApplicationStatus.PENDING,
    }),
    __metadata("design:type", String)
], DiscountApplication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DiscountApplication.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DiscountApplication.prototype, "appliedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], DiscountApplication.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], DiscountApplication.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], DiscountApplication.prototype, "updatedAt", void 0);
exports.DiscountApplication = DiscountApplication = __decorate([
    (0, typeorm_1.Entity)()
], DiscountApplication);
//# sourceMappingURL=discount-application.entity.js.map