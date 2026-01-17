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
var SupplyChainFinanceService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplyChainFinanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financing_request_entity_1 = require("../entities/financing-request.entity");
const supply_chain_relationship_entity_1 = require("../entities/supply-chain-relationship.entity");
const nbfc_partner_entity_1 = require("../entities/nbfc-partner.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let SupplyChainFinanceService = SupplyChainFinanceService_1 = class SupplyChainFinanceService {
    constructor(financingRequestRepository, supplyChainRepository, nbfcPartnerRepository, invoiceRepository, paymentTransactionRepository, organizationRepository, eventEmitter) {
        this.financingRequestRepository = financingRequestRepository;
        this.supplyChainRepository = supplyChainRepository;
        this.nbfcPartnerRepository = nbfcPartnerRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.organizationRepository = organizationRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SupplyChainFinanceService_1.name);
    }
    /**
     * Create a new supply chain relationship
     */
    async createSupplyChainRelationship(organizationId, partnerOrganizationId, relationshipType, metadata) {
        // Verify organizations exist
        const organization = await this.organizationRepository.findOne({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new Error('Organization not found');
        }
        const partnerOrganization = await this.organizationRepository.findOne({
            where: { id: partnerOrganizationId },
        });
        if (!partnerOrganization) {
            throw new Error('Partner organization not found');
        }
        // Check if relationship already exists
        const existingRelationship = await this.supplyChainRepository.findOne({
            where: {
                organizationId,
                partnerOrganizationId,
            },
        });
        if (existingRelationship) {
            throw new Error('Relationship already exists');
        }
        // Create inverse relationship type
        const inverseRelationshipType = relationshipType === 'buyer' ? 'supplier' : 'buyer';
        // Create relationship
        const relationship = this.supplyChainRepository.create({
            organizationId,
            organizationName: organization.name,
            partnerOrganizationId,
            partnerOrganizationName: partnerOrganization.name,
            relationshipType,
            status: 'pending',
            trustScore: 0,
            averageTransactionAmount: 0,
            transactionCount: 0,
            metadata: metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.supplyChainRepository.save(relationship);
        // Create inverse relationship
        const inverseRelationship = this.supplyChainRepository.create({
            organizationId: partnerOrganizationId,
            organizationName: partnerOrganization.name,
            partnerOrganizationId: organizationId,
            partnerOrganizationName: organization.name,
            relationshipType: inverseRelationshipType,
            status: 'pending',
            trustScore: 0,
            averageTransactionAmount: 0,
            transactionCount: 0,
            metadata: metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.supplyChainRepository.save(inverseRelationship);
        // Emit event for relationship creation
        this.eventEmitter.emit('supply_chain.relationship_created', {
            organizationId,
            partnerOrganizationId,
            relationshipType,
            relationshipId: relationship.id,
        });
        return relationship;
    }
    /**
     * Update supply chain relationship status
     */
    async updateRelationshipStatus(relationshipId, status) {
        // Get relationship
        const relationship = await this.supplyChainRepository.findOne({
            where: { id: relationshipId },
        });
        if (!relationship) {
            throw new Error('Relationship not found');
        }
        // Update status
        relationship.status = status;
        relationship.updatedAt = new Date();
        await this.supplyChainRepository.save(relationship);
        // If status is active or rejected, update inverse relationship
        if (status === 'active' || status === 'rejected') {
            const inverseRelationship = await this.supplyChainRepository.findOne({
                where: {
                    organizationId: relationship.partnerOrganizationId,
                    partnerOrganizationId: relationship.organizationId,
                },
            });
            if (inverseRelationship) {
                inverseRelationship.status = status;
                inverseRelationship.updatedAt = new Date();
                await this.supplyChainRepository.save(inverseRelationship);
            }
        }
        // Emit event for relationship update
        this.eventEmitter.emit('supply_chain.relationship_updated', {
            relationshipId,
            status,
            organizationId: relationship.organizationId,
            partnerOrganizationId: relationship.partnerOrganizationId,
        });
        return relationship;
    }
    /**
     * Update relationship trust score
     */
    async updateRelationshipTrustScore(relationshipId, trustScore) {
        // Validate trust score
        if (trustScore < 0 || trustScore > 1) {
            throw new Error('Trust score must be between 0 and 1');
        }
        // Get relationship
        const relationship = await this.supplyChainRepository.findOne({
            where: { id: relationshipId },
        });
        if (!relationship) {
            throw new Error('Relationship not found');
        }
        // Update trust score
        relationship.trustScore = trustScore;
        relationship.updatedAt = new Date();
        await this.supplyChainRepository.save(relationship);
        // Emit event for trust score update
        this.eventEmitter.emit('supply_chain.trust_score_updated', {
            relationshipId,
            trustScore,
            organizationId: relationship.organizationId,
            partnerOrganizationId: relationship.partnerOrganizationId,
        });
        return relationship;
    }
    /**
     * Record transaction for relationship
     */
    async recordTransaction(relationshipId, amount, transactionDate, metadata) {
        // Get relationship
        const relationship = await this.supplyChainRepository.findOne({
            where: { id: relationshipId },
        });
        if (!relationship) {
            throw new Error('Relationship not found');
        }
        // Update transaction metrics
        const newTransactionCount = relationship.transactionCount + 1;
        const newAverageAmount = ((relationship.averageTransactionAmount * relationship.transactionCount) + amount) / newTransactionCount;
        relationship.transactionCount = newTransactionCount;
        relationship.averageTransactionAmount = newAverageAmount;
        relationship.lastTransactionDate = transactionDate;
        relationship.updatedAt = new Date();
        // Update transaction history
        if (!relationship.metadata.transactionHistory) {
            relationship.metadata.transactionHistory = [];
        }
        relationship.metadata.transactionHistory.push({
            date: transactionDate,
            amount,
            ...metadata,
        });
        // Limit history to last 20 transactions
        if (relationship.metadata.transactionHistory.length > 20) {
            relationship.metadata.transactionHistory = relationship.metadata.transactionHistory.slice(-20);
        }
        await this.supplyChainRepository.save(relationship);
        // Update inverse relationship
        const inverseRelationship = await this.supplyChainRepository.findOne({
            where: {
                organizationId: relationship.partnerOrganizationId,
                partnerOrganizationId: relationship.organizationId,
            },
        });
        if (inverseRelationship) {
            inverseRelationship.transactionCount = newTransactionCount;
            inverseRelationship.averageTransactionAmount = newAverageAmount;
            inverseRelationship.lastTransactionDate = transactionDate;
            inverseRelationship.updatedAt = new Date();
            // Update transaction history
            if (!inverseRelationship.metadata.transactionHistory) {
                inverseRelationship.metadata.transactionHistory = [];
            }
            inverseRelationship.metadata.transactionHistory.push({
                date: transactionDate,
                amount,
                ...metadata,
            });
            // Limit history to last 20 transactions
            if (inverseRelationship.metadata.transactionHistory.length > 20) {
                inverseRelationship.metadata.transactionHistory = inverseRelationship.metadata.transactionHistory.slice(-20);
            }
            await this.supplyChainRepository.save(inverseRelationship);
        }
        // Emit event for transaction record
        this.eventEmitter.emit('supply_chain.transaction_recorded', {
            relationshipId,
            amount,
            transactionDate,
            organizationId: relationship.organizationId,
            partnerOrganizationId: relationship.partnerOrganizationId,
        });
        return relationship;
    }
    /**
     * Create buyer-led financing offer
     */
    async createBuyerFinancingOffer(buyerId, supplierId, invoiceId, amount, interestRate, tenorDays, expiryDays = 7, nbfcPartnerId) {
        // Verify organizations exist
        const buyer = await this.organizationRepository.findOne({
            where: { id: buyerId },
        });
        if (!buyer) {
            throw new Error('Buyer organization not found');
        }
        const supplier = await this.organizationRepository.findOne({
            where: { id: supplierId },
        });
        if (!supplier) {
            throw new Error('Supplier organization not found');
        }
        // Verify invoice exists
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Verify relationship exists
        const relationship = await this.supplyChainRepository.findOne({
            where: {
                organizationId: supplierId,
                partnerOrganizationId: buyerId,
                relationshipType: 'supplier',
                status: 'active',
            },
        });
        if (!relationship) {
            throw new Error('Active supplier relationship not found');
        }
        // Verify NBFC partner if provided
        let nbfcPartner = null;
        if (nbfcPartnerId) {
            nbfcPartner = await this.nbfcPartnerRepository.findOne({
                where: { id: nbfcPartnerId },
            });
            if (!nbfcPartner) {
                throw new Error('NBFC partner not found');
            }
        }
        // Calculate expiry date
        const offerExpiryDate = new Date();
        offerExpiryDate.setDate(offerExpiryDate.getDate() + expiryDays);
        // Create financing offer
        const offer = {
            id: this.generateUniqueId(),
            buyerId,
            buyerName: buyer.name,
            supplierId,
            supplierName: supplier.name,
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            amount,
            interestRate,
            tenorDays,
            offerExpiryDate,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Store offer in relationship metadata
        if (!relationship.metadata.financingOffers) {
            relationship.metadata.financingOffers = [];
        }
        relationship.metadata.financingOffers.push(offer);
        await this.supplyChainRepository.save(relationship);
        // Create financing request if NBFC partner provided
        if (nbfcPartner) {
            const financingRequest = this.financingRequestRepository.create({
                organizationId: supplierId,
                invoiceId,
                nbfcPartnerId,
                nbfcPartnerName: nbfcPartner.name,
                requestedAmount: amount,
                approvedAmount: 0,
                outstandingAmount: 0,
                interestRate,
                tenorDays,
                financingType: financing_request_entity_1.FinancingType.SUPPLY_CHAIN_FINANCE,
                status: financing_request_entity_1.FinancingStatus.PENDING,
                metadata: {
                    buyerFinancingOffer: offer,
                    buyerId,
                    buyerName: buyer.name,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await this.financingRequestRepository.save(financingRequest);
        }
        // Emit event for financing offer creation
        this.eventEmitter.emit('supply_chain.financing_offer_created', {
            offerId: offer.id,
            buyerId,
            supplierId,
            invoiceId,
            amount,
            interestRate,
            tenorDays,
            nbfcPartnerId,
        });
        return offer;
    }
    /**
     * Update financing offer status
     */
    async updateFinancingOfferStatus(offerId, supplierId, status) {
        // Find relationship with offer
        const relationship = await this.supplyChainRepository.findOne({
            where: {
                organizationId: supplierId,
                relationshipType: 'supplier',
            },
        });
        if (!relationship || !relationship.metadata.financingOffers) {
            throw new Error('Relationship or financing offers not found');
        }
        // Find offer
        const offerIndex = relationship.metadata.financingOffers.findIndex((offer) => offer.id === offerId);
        if (offerIndex === -1) {
            throw new Error('Financing offer not found');
        }
        const offer = relationship.metadata.financingOffers[offerIndex];
        // Update offer status
        offer.status = status;
        offer.updatedAt = new Date();
        relationship.metadata.financingOffers[offerIndex] = offer;
        await this.supplyChainRepository.save(relationship);
        // If accepted, create financing transaction
        if (status === 'accepted') {
            // Find financing request if exists
            const financingRequest = await this.financingRequestRepository.findOne({
                where: {
                    organizationId: supplierId,
                    invoiceId: offer.invoiceId,
                    st(Content, truncated, due, to, size, limit) { }, : .Use, line, ranges, to, read, chunks
                }
            });
        }
    }
};
exports.SupplyChainFinanceService = SupplyChainFinanceService;
exports.SupplyChainFinanceService = SupplyChainFinanceService = SupplyChainFinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financing_request_entity_1.FinancingRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(supply_chain_relationship_entity_1.SupplyChainRelationship)),
    __param(2, (0, typeorm_1.InjectRepository)(nbfc_partner_entity_1.NBFCPartner)),
    __param(3, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(4, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(5, (0, typeorm_1.InjectRepository)(organization_entity_1.Organization)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], SupplyChainFinanceService);
//# sourceMappingURL=supply-chain-finance.service.js.map