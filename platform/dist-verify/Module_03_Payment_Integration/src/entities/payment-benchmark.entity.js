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
exports.PaymentBenchmark = void 0;
const typeorm_1 = require("typeorm");
/**
 * Entity representing cross-business payment benchmarks.
 * This stores anonymized payment behavior benchmarks across businesses for comparison.
 */
let PaymentBenchmark = class PaymentBenchmark {
};
exports.PaymentBenchmark = PaymentBenchmark;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'industry_code', length: 20 }),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "industryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'industry_sector', length: 100 }),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "industrySector", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'region_code', length: 20, nullable: true }),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "regionCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_size', length: 20, nullable: true }),
    __metadata("design:type", String)
], PaymentBenchmark.prototype, "businessSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sample_size', type: 'integer' }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "sampleSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "avgDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'median_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "medianDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "stdDevDaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'p10_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "p10DaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'p25_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "p25DaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'p75_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "p75DaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'p90_days_past_due', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "p90DaysPastDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_on_time_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "avgOnTimePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_default_percentage', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "avgDefaultPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_consistency_score', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PaymentBenchmark.prototype, "avgConsistencyScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'additional_metrics', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PaymentBenchmark.prototype, "additionalMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'calculated_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "calculatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PaymentBenchmark.prototype, "updatedAt", void 0);
exports.PaymentBenchmark = PaymentBenchmark = __decorate([
    (0, typeorm_1.Entity)('payment_benchmarks')
], PaymentBenchmark);
//# sourceMappingURL=payment-benchmark.entity.js.map