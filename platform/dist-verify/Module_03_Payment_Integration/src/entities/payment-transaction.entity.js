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
exports.PaymentTransaction = exports.TransactionType = exports.TransactionStatus = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../Module_11_Common/organization.entity");
const invoice_entity_1 = require("../../../Module_01_Invoice_Management/src/invoice.entity");
const payment_method_entity_1 = require("./payment-method.entity");
const payment_reconciliation_entity_1 = require("./payment-reconciliation.entity");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["INITIATED"] = "initiated";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["REFUNDED"] = "refunded";
    TransactionStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
    TransactionStatus["CANCELLED"] = "cancelled";
    TransactionStatus["EXPIRED"] = "expired";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["PAYMENT"] = "payment";
    TransactionType["REFUND"] = "refund";
    TransactionType["INSTALLMENT"] = "installment";
    TransactionType["SUBSCRIPTION"] = "subscription";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
let PaymentTransaction = class PaymentTransaction {
};
exports.PaymentTransaction = PaymentTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "transactionReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "gatewayTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.INITIATED,
    }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionType,
        default: TransactionType.PAYMENT,
    }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "transactionFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PaymentTransaction.prototype, "isCustomerPaidFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "gatewayResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "deviceInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "paymentLink", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "paymentLinkExpiresAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", organization_entity_1.Organization)
], PaymentTransaction.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice, { nullable: true }),
    __metadata("design:type", invoice_entity_1.Invoice)
], PaymentTransaction.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_method_entity_1.PaymentMethod),
    __metadata("design:type", payment_method_entity_1.PaymentMethod)
], PaymentTransaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "paymentMethodId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PaymentTransaction, { nullable: true }),
    __metadata("design:type", PaymentTransaction)
], PaymentTransaction.prototype, "parentTransaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "parentTransactionId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PaymentTransaction, transaction => transaction.parentTransaction),
    __metadata("design:type", Array)
], PaymentTransaction.prototype, "childTransactions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_reconciliation_entity_1.PaymentReconciliation, reconciliation => reconciliation.transaction),
    __metadata("design:type", Array)
], PaymentTransaction.prototype, "reconciliations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "completedAt", void 0);
exports.PaymentTransaction = PaymentTransaction = __decorate([
    (0, typeorm_1.Entity)()
], PaymentTransaction);
//# sourceMappingURL=payment-transaction.entity.js.map