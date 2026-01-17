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
exports.InvoiceLineItem = void 0;
const typeorm_1 = require("typeorm");
const invoice_entity_1 = require("./invoice.entity");
const product_service_catalog_entity_1 = require("../../product-service-catalog/entities/product-service-catalog.entity"); // Assuming path
let InvoiceLineItem = class InvoiceLineItem {
};
exports.InvoiceLineItem = InvoiceLineItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "invoice_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => invoice_entity_1.Invoice, invoice => invoice.line_items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'invoice_id' }),
    __metadata("design:type", invoice_entity_1.Invoice)
], InvoiceLineItem.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 1.00 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "unit_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "item_sub_total", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "tax_rate_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0.00 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "tax_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0.00 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "discount_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "line_total", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], InvoiceLineItem.prototype, "product_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_service_catalog_entity_1.ProductServiceCatalog, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", typeof (_a = typeof product_service_catalog_entity_1.ProductServiceCatalog !== "undefined" && product_service_catalog_entity_1.ProductServiceCatalog) === "function" ? _a : Object)
], InvoiceLineItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], InvoiceLineItem.prototype, "order_index", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], InvoiceLineItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], InvoiceLineItem.prototype, "updated_at", void 0);
exports.InvoiceLineItem = InvoiceLineItem = __decorate([
    (0, typeorm_1.Entity)('invoice_line_items')
], InvoiceLineItem);
//# sourceMappingURL=invoice-line-item.entity.js.map