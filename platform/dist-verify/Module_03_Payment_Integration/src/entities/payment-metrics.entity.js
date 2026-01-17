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
exports.PaymentMetrics = void 0;
const typeorm_1 = require("typeorm");
const buyer_profile_entity_1 = require("./buyer-profile.entity");
/**
 * Entity representing payment metrics for a buyer.
 * This stores calculated metrics about payment behavior used for credit assessment.
 */
let PaymentMetrics = class PaymentMetrics {
};
exports.PaymentMetrics = PaymentMetrics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentMetrics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], PaymentMetrics.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], PaymentMetrics.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentMetrics.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentMetrics.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_count', type: 'integer' }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "paymentCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_payment_value', type: 'decimal', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "totalPaymentValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency_code', length: 3, default: 'INR' }),
    __metadata("design:type", String)
], PaymentMetrics.prototype, "currencyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "avgDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_days_past_due', type: 'integer' }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "maxDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "stdDevDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'on_time_payment_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "onTimePaymentPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'late_payment_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "latePaymentPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'very_late_payment_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "veryLatePaymentPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'default_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "defaultPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_payment_amount', type: 'decimal', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "avgPaymentAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_consistency_score', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "paymentConsistencyScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_trend', type: 'decimal', precision: 6, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "paymentTrend", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seasonal_pattern_strength', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "seasonalPatternStrength", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispute_frequency', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "disputeFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentMetrics.prototype, "overallScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'additional_metrics', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PaymentMetrics.prototype, "additionalMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'calculated_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentMetrics.prototype, "calculatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentMetrics.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PaymentMetrics.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => buyer_profile_entity_1.BuyerProfile),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id', referencedColumnName: 'buyerId' }),
    __metadata("design:type", typeof (_a = typeof buyer_profile_entity_1.BuyerProfile !== "undefined" && buyer_profile_entity_1.BuyerProfile) === "function" ? _a : Object)
], PaymentMetrics.prototype, "buyerProfile", void 0);
exports.PaymentMetrics = PaymentMetrics = __decorate([
    (0, typeorm_1.Entity)('payment_metrics')
], PaymentMetrics);
//# sourceMappingURL=payment-metrics.entity.js.map