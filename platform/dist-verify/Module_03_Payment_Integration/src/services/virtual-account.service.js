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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VirtualAccountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualAccountService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const virtual_account_entity_1 = require("../entities/virtual-account.entity");
let VirtualAccountService = VirtualAccountService_1 = class VirtualAccountService {
    constructor(virtualAccountRepository) {
        this.virtualAccountRepository = virtualAccountRepository;
        this.logger = new common_1.Logger(VirtualAccountService_1.name);
    }
    /**
     * Create a new Virtual Account for a Customer Invoice
     */
    async createVirtualAccount(customerId, invoiceId, bankName = 'HDFC Bank') {
        // In a real scenario, call Bank API to generate/reserve a VA number
        const uniqueSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const virtualAccountNumber = `SME${customerId.substring(0, 4).toUpperCase()}${uniqueSuffix}`;
        const account = this.virtualAccountRepository.create({
            virtualAccountNumber,
            ifscCode: 'HDFC0001234', // Mock IFSC
            bankName,
            customerId,
            invoiceId,
            status: virtual_account_entity_1.VirtualAccountStatus.ACTIVE,
        });
        return this.virtualAccountRepository.save(account);
    }
    /**
     * Resolve an incoming payment to an invoice via Virtual Account
     */
    async resolvePayment(virtualAccountNumber) {
        return this.virtualAccountRepository.findOne({
            where: { virtualAccountNumber, status: virtual_account_entity_1.VirtualAccountStatus.ACTIVE },
        });
    }
    async closeAccount(id) {
        await this.virtualAccountRepository.update(id, { status: virtual_account_entity_1.VirtualAccountStatus.CLOSED });
    }
};
exports.VirtualAccountService = VirtualAccountService;
exports.VirtualAccountService = VirtualAccountService = VirtualAccountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(virtual_account_entity_1.VirtualAccount)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VirtualAccountService);
//# sourceMappingURL=virtual-account.service.js.map