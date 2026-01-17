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
exports.PaymentGateway = exports.PaymentGatewayStatus = exports.PaymentGatewayType = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../Module_11_Common/organization.entity");
// import { PaymentMethod } from './payment-method.entity';
// ... (enums omitted, lines differ)
// @Entity()
// export class PaymentGateway {
// ...
//   @OneToMany(() => any, (method: any) => method.gateway) // using any to break chain
//   paymentMethods: any[];
var PaymentGatewayType;
(function (PaymentGatewayType) {
    PaymentGatewayType["RAZORPAY"] = "razorpay";
    PaymentGatewayType["CCAVENUE"] = "ccavenue";
    PaymentGatewayType["PAYU"] = "payu";
    PaymentGatewayType["BILLDESK"] = "billdesk";
    PaymentGatewayType["STRIPE"] = "stripe";
    PaymentGatewayType["PAYPAL"] = "paypal";
    PaymentGatewayType["CUSTOM"] = "custom";
})(PaymentGatewayType || (exports.PaymentGatewayType = PaymentGatewayType = {}));
var PaymentGatewayStatus;
(function (PaymentGatewayStatus) {
    PaymentGatewayStatus["ACTIVE"] = "active";
    PaymentGatewayStatus["INACTIVE"] = "inactive";
    PaymentGatewayStatus["TESTING"] = "testing";
    PaymentGatewayStatus["CONFIGURATION_REQUIRED"] = "configuration_required";
    PaymentGatewayStatus["ERROR"] = "error";
})(PaymentGatewayStatus || (exports.PaymentGatewayStatus = PaymentGatewayStatus = {}));
let PaymentGateway = class PaymentGateway {
};
exports.PaymentGateway = PaymentGateway;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentGateway.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentGateway.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentGatewayType,
    }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentGatewayStatus,
        default: PaymentGatewayStatus.CONFIGURATION_REQUIRED,
    }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentGateway.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], PaymentGateway.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentGateway.prototype, "credentials", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PaymentGateway.prototype, "isSandboxMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentGateway.prototype, "baseFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PaymentGateway.prototype, "baseFeeFixed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PaymentGateway.prototype, "methodSpecificFees", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PaymentGateway.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "webhookUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "webhookSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PaymentGateway.prototype, "healthCheckUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PaymentGateway.prototype, "lastHealthCheckAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PaymentGateway.prototype, "isHealthy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", organization_entity_1.Organization)
], PaymentGateway.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PaymentGateway.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentGateway.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], PaymentGateway.prototype, "updatedAt", void 0);
exports.PaymentGateway = PaymentGateway = __decorate([
    (0, typeorm_1.Entity)()
], PaymentGateway);
//# sourceMappingURL=payment-gateway.entity.js.map