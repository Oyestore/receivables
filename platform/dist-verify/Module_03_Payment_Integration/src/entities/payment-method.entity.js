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
exports.PaymentMethod = exports.PaymentMethodStatus = exports.PaymentMethodType = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../Module_11_Common/organization.entity");
const payment_transaction_entity_1 = require("./payment-transaction.entity");
var PaymentMethodType;
(function (PaymentMethodType) {
    PaymentMethodType["CREDIT_CARD"] = "credit_card";
    PaymentMethodType["DEBIT_CARD"] = "debit_card";
    PaymentMethodType["UPI"] = "upi";
    PaymentMethodType["NETBANKING"] = "netbanking";
    PaymentMethodType["WALLET"] = "wallet";
    PaymentMethodType["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethodType["EMI"] = "emi";
    PaymentMethodType["COD"] = "cod";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
var PaymentMethodStatus;
(function (PaymentMethodStatus) {
    PaymentMethodStatus["ACTIVE"] = "active";
    PaymentMethodStatus["INACTIVE"] = "inactive";
    PaymentMethodStatus["PENDING"] = "pending";
})(PaymentMethodStatus || (exports.PaymentMethodStatus = PaymentMethodStatus = {}));
let PaymentMethod = class PaymentMethod {
};
exports.PaymentMethod = PaymentMethod;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentMethod.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentMethod.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentMethodType,
    }),
    __metadata("design:type", String)
], PaymentMethod.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentMethodStatus,
        default: PaymentMethodStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], PaymentMethod.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentMethod.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentMethod.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentMethod.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentMethod.prototype, "transactionFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentMethod.prototype, "transactionFeeFixed", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PaymentMethod.prototype, "isCustomerBearsFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PaymentMethod.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentMethod.prototype, "isAvailableForMobile", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", organization_entity_1.Organization)
], PaymentMethod.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentMethod.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_transaction_entity_1.PaymentTransaction, transaction => transaction.paymentMethod),
    __metadata("design:type", Array)
], PaymentMethod.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentMethod.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentMethod.prototype, "updatedAt", void 0);
exports.PaymentMethod = PaymentMethod = __decorate([
    (0, typeorm_1.Entity)()
], PaymentMethod);
//# sourceMappingURL=payment-method.entity.js.map