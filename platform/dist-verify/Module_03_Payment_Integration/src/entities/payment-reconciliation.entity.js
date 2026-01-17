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
exports.PaymentReconciliation = exports.ReconciliationSource = exports.ReconciliationStatus = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../organizations/entities/organization.entity");
const payment_transaction_entity_1 = require("./payment-transaction.entity");
const invoice_entity_1 = require("../../invoices/entities/invoice.entity");
var ReconciliationStatus;
(function (ReconciliationStatus) {
    ReconciliationStatus["PENDING"] = "pending";
    ReconciliationStatus["MATCHED"] = "matched";
    ReconciliationStatus["PARTIAL_MATCH"] = "partial_match";
    ReconciliationStatus["UNMATCHED"] = "unmatched";
    ReconciliationStatus["MANUAL_MATCH"] = "manual_match";
    ReconciliationStatus["IGNORED"] = "ignored";
})(ReconciliationStatus || (exports.ReconciliationStatus = ReconciliationStatus = {}));
var ReconciliationSource;
(function (ReconciliationSource) {
    ReconciliationSource["AUTOMATIC"] = "automatic";
    ReconciliationSource["MANUAL"] = "manual";
    ReconciliationSource["AI_SUGGESTED"] = "ai_suggested";
})(ReconciliationSource || (exports.ReconciliationSource = ReconciliationSource = {}));
let PaymentReconciliation = class PaymentReconciliation {
};
exports.PaymentReconciliation = PaymentReconciliation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ReconciliationStatus,
        default: ReconciliationStatus.PENDING,
    }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ReconciliationSource,
        default: ReconciliationSource.AUTOMATIC,
    }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", Number)
], PaymentReconciliation.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentReconciliation.prototype, "matchingCriteria", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PaymentReconciliation.prototype, "confidenceScore", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], PaymentReconciliation.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_transaction_entity_1.PaymentTransaction),
    __metadata("design:type", payment_transaction_entity_1.PaymentTransaction)
], PaymentReconciliation.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice, { nullable: true }),
    __metadata("design:type", typeof (_b = typeof invoice_entity_1.Invoice !== "undefined" && invoice_entity_1.Invoice) === "function" ? _b : Object)
], PaymentReconciliation.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentReconciliation.prototype, "reconciledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentReconciliation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentReconciliation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentReconciliation.prototype, "reconciledAt", void 0);
exports.PaymentReconciliation = PaymentReconciliation = __decorate([
    (0, typeorm_1.Entity)()
], PaymentReconciliation);
//# sourceMappingURL=payment-reconciliation.entity.js.map