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
exports.PaymentHistory = void 0;
const typeorm_1 = require("typeorm");
const risk_level_enum_1 = require("../enums/risk-level.enum");
/**
 * Entity representing payment history for a buyer.
 * This tracks historical payment behavior used in credit assessment.
 */
let PaymentHistory = class PaymentHistory {
};
exports.PaymentHistory = PaymentHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', nullable: true }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_id', nullable: true }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_amount', type: 'decimal', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], PaymentHistory.prototype, "invoiceAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_amount', type: 'decimal', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], PaymentHistory.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency_code', length: 3, default: 'INR' }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentHistory.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PaymentHistory.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'days_past_due', type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], PaymentHistory.prototype, "daysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_status', length: 20 }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', length: 50, nullable: true }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reminder_count', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PaymentHistory.prototype, "reminderCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'had_dispute', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentHistory.prototype, "hadDispute", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'risk_level',
        type: 'enum',
        enum: risk_level_enum_1.RiskLevel,
        nullable: true
    }),
    __metadata("design:type", typeof (_a = typeof risk_level_enum_1.RiskLevel !== "undefined" && risk_level_enum_1.RiskLevel) === "function" ? _a : Object)
], PaymentHistory.prototype, "riskLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PaymentHistory.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentHistory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PaymentHistory.prototype, "updatedAt", void 0);
exports.PaymentHistory = PaymentHistory = __decorate([
    (0, typeorm_1.Entity)('payment_history')
], PaymentHistory);
//# sourceMappingURL=payment-history.entity.js.map