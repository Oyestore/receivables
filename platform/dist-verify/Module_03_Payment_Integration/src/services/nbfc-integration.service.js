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
var NBFCIntegrationService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NBFCIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nbfc_partner_entity_1 = require("../entities/nbfc-partner.entity");
const financing_request_entity_1 = require("../entities/financing-request.entity");
const financing_transaction_entity_1 = require("../entities/financing-transaction.entity");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const rxjs_1 = require("rxjs");
let NBFCIntegrationService = NBFCIntegrationService_1 = class NBFCIntegrationService {
    constructor(nbfcPartnerRepository, financingRequestRepository, financingTransactionRepository, httpService, configService, eventEmitter) {
        this.nbfcPartnerRepository = nbfcPartnerRepository;
        this.financingRequestRepository = financingRequestRepository;
        this.financingTransactionRepository = financingTransactionRepository;
        this.httpService = httpService;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(NBFCIntegrationService_1.name);
    }
    /**
     * Get all active NBFC partners
     */
    async getAllActivePartners() {
        return this.nbfcPartnerRepository.find({
            where: { status: 'active' },
        });
    }
    /**
     * Get NBFC partner by ID
     */
    async getPartnerById(id) {
        return this.nbfcPartnerRepository.findOne({
            where: { id },
        });
    }
    /**
     * Create or update NBFC partner
     */
    async createOrUpdatePartner(partnerData) {
        if (partnerData.id) {
            await this.nbfcPartnerRepository.update(partnerData.id, partnerData);
            return this.getPartnerById(partnerData.id);
        }
        else {
            const newPartner = this.nbfcPartnerRepository.create(partnerData);
            return this.nbfcPartnerRepository.save(newPartner);
        }
    }
    /**
     * Submit financing request to NBFC partner
     */
    async submitFinancingRequest(financingRequestId, nbfcPartnerId) {
        const financingRequest = await this.financingRequestRepository.findOne({
            where: { id: financingRequestId },
            relations: ['invoice', 'organization'],
        });
        if (!financingRequest) {
            throw new Error('Financing request not found');
        }
        const nbfcPartner = await this.nbfcPartnerRepository.findOne({
            where: { id: nbfcPartnerId },
        });
        if (!nbfcPartner) {
            throw new Error('NBFC partner not found');
        }
        // Update financing request with NBFC partner info
        financingRequest.nbfcPartnerId = nbfcPartner.id;
        financingRequest.nbfcPartnerName = nbfcPartner.name;
        financingRequest.status = financing_request_entity_1.FinancingStatus.PENDING_APPROVAL;
        financingRequest.requestDate = new Date();
        // Handle different integration types
        if (nbfcPartner.integrationType === nbfc_partner_entity_1.NBFCPartnerIntegrationType.API) {
            try {
                const response = await this.submitRequestViaAPI(financingRequest, nbfcPartner);
                // Update with external reference ID if provided
                if (response.referenceId) {
                    financingRequest.nbfcReferenceId = response.referenceId;
                }
                // Update status if provided
                if (response.status) {
                    financingRequest.status = this.mapExternalStatusToInternal(response.status);
                }
                // Store additional metadata
                financingRequest.metadata = {
                    ...financingRequest.metadata,
                    nbfcSubmission: {
                        submittedAt: new Date(),
                        responseData: response,
                    },
                };
            }
            catch (error) {
                this.logger.error(`Failed to submit financing request to NBFC API: ${error.message}`, error.stack);
                // Store error in metadata but keep status as pending
                financingRequest.metadata = {
                    ...financingRequest.metadata,
                    nbfcSubmission: {
                        submittedAt: new Date(),
                        error: {
                            message: error.message,
                            timestamp: new Date(),
                        },
                    },
                };
            }
        }
        else {
            // For manual integration, just update status
            financingRequest.metadata = {
                ...financingRequest.metadata,
                manualProcessing: {
                    queuedAt: new Date(),
                },
            };
        }
        // Save updated financing request
        await this.financingRequestRepository.save(financingRequest);
        // Emit event for financing request submission
        this.eventEmitter.emit('financing.request_submitted', {
            financingRequestId: financingRequest.id,
            nbfcPartnerId: nbfcPartner.id,
            status: financingRequest.status,
        });
        return financingRequest;
    }
    /**
     * Submit financing request via NBFC partner API
     */
    async submitRequestViaAPI(financingRequest, nbfcPartner) {
        if (!nbfcPartner.apiBaseUrl) {
            throw new Error('NBFC partner API URL not configured');
        }
        // Prepare request payload based on financing type
        const payload = this.prepareAPIPayload(financingRequest, nbfcPartner);
        // Make API call to NBFC partner
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${nbfcPartner.apiBaseUrl}/financing-requests`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${nbfcPartner.apiKey}`,
                    'X-API-Key': nbfcPartner.apiSecret,
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`NBFC API call failed: ${error.message}`, error.response?.data || error.stack);
            throw new Error(`NBFC API call failed: ${error.message}`);
        }
    }
    /**
     * Prepare API payload based on financing type
     */
    prepareAPIPayload(financingRequest, nbfcPartner) {
        const basePayload = {
            requestId: financingRequest.id,
            organizationId: financingRequest.organizationId,
            organizationName: financingRequest.organization?.name,
            amount: financingRequest.requestedAmount,
            currency: financingRequest.currencyCode || 'INR',
            tenorDays: financingRequest.tenorDays || nbfcPartner.defaultTenorDays,
            financingType: financingRequest.financingType,
        };
        // Add type-specific fields
        switch (financingRequest.financingType) {
            case financing_request_entity_1.FinancingType.INVOICE_FINANCING:
                return {
                    ...basePayload,
                    invoiceId: financingRequest.invoiceId,
                    invoiceNumber: financingRequest.invoice?.invoiceNumber,
                    invoiceAmount: financingRequest.invoice?.totalAmount,
                    invoiceDate: financingRequest.invoice?.invoiceDate,
                    invoiceDueDate: financingRequest.invoice?.dueDate,
                    customerName: financingRequest.invoice?.customerName,
                    advancePercentage: financingRequest.advancePercentage || nbfcPartner.defaultAdvancePercentage,
                };
            case financing_request_entity_1.FinancingType.SUPPLY_CHAIN_FINANCE:
                return {
                    ...basePayload,
                    buyerId: financingRequest.metadata?.supplyChain?.buyerId,
                    buyerName: financingRequest.metadata?.supplyChain?.buyerName,
                    supplierId: financingRequest.metadata?.supplyChain?.supplierId,
                    supplierName: financingRequest.metadata?.supplyChain?.supplierName,
                    invoiceId: financingRequest.invoiceId,
                    invoiceNumber: financingRequest.invoice?.invoiceNumber,
                    invoiceAmount: financingRequest.invoice?.totalAmount,
                    invoiceDate: financingRequest.invoice?.invoiceDate,
                    invoiceDueDate: financingRequest.invoice?.dueDate,
                };
            case financing_request_entity_1.FinancingType.WORKING_CAPITAL:
                return {
                    ...basePayload,
                    purpose: financingRequest.metadata?.workingCapital?.purpose,
                    duration: financingRequest.metadata?.workingCapital?.duration || financingRequest.tenorDays,
                    businessVintage: financingRequest.metadata?.workingCapital?.businessVintage,
                };
            default:
                return basePayload;
        }
    }
    /**
     * Map external NBFC status to internal status
     */
    mapExternalStatusToInternal(externalStatus) {
        const statusMap = {
            'SUBMITTED': financing_request_entity_1.FinancingStatus.PENDING_APPROVAL,
            'UNDER_REVIEW': financing_request_entity_1.FinancingStatus.PENDING_APPROVAL,
            'APPROVED': financing_request_entity_1.FinancingStatus.APPROVED,
            'REJECTED': financing_request_entity_1.FinancingStatus.REJECTED,
            'DISBURSED': financing_request_entity_1.FinancingStatus.FUNDED,
            'REPAID': financing_request_entity_1.FinancingStatus.REPAID,
            'DEFAULTED': financing_request_entity_1.FinancingStatus.DEFAULTED,
            'CANCELLED': financing_request_entity_1.FinancingStatus.CANCELLED,
        };
        return statusMap[externalStatus.toUpperCase()] || financing_request_entity_1.FinancingStatus.PENDING_APPROVAL;
    }
    /**
     * Update financing request status from NBFC partner
     */
    async updateFinancingRequestStatus(financingRequestId, status, metadata) {
        const financingRequest = await this.financingRequestRepository.findOne({
            where: { id: financingRequestId },
        });
        if (!financingRequest) {
            throw new Error('Financing request not found');
        }
        // Update status and related fields
        financingRequest.status = status;
        switch (status) {
            case financing_request_entity_1.FinancingStatus.APPROVED:
                financingRequest.approvalDate = new Date();
                if (metadata?.approvedAmount) {
                    financingRequest.approvedAmount = metadata.approvedAmount;
                }
                if (metadata?.interestRate) {
                    financingRequest.interestRate = metadata.interestRate;
                }
                if (metadata?.processingFeePercentage) {
                    financingRequest.processingFeePercentage = metadata.processingFeePercentage;
                }
                if (metadata?.processingFeeFixed) {
                    financingRequest.processingFeeFixed = metadata.processingFeeFixed;
                }
                if (metadata?.repaymentDueDate) {
                    financingRequest.repaymentDueDate = new Date(metadata.repaymentDueDate);
                }
                break;
            case financing_request_entity_1.FinancingStatus.REJECTED:
                if (metadata?.rejectionReason) {
                    financingRequest.rejectionReason = metadata.rejectionReason;
                }
                break;
            case financing_request_entity_1.FinancingStatus.FUNDED:
                financingRequest.fundingDate = new Date();
                // Create disbursement transaction
                if (metadata?.disbursementAmount) {
                    await this.createFinancingTransaction(financingRequestId, financing_transaction_entity_1.FinancingTransactionType.DISBURSEMENT, metadata.disbursementAmount, 'Disbursement from NBFC partner', metadata?.externalReferenceId);
                }
                break;
            case financing_request_entity_1.FinancingStatus.REPAID:
                financingRequest.repaymentDate = new Date();
                // Create repayment transaction if provided
                if (metadata?.repaymentAmount) {
                    await this.createFinancingTransaction(financingRequestId, financing_transaction_entity_1.FinancingTransactionType.REPAYMENT, metadata.repaymentAmount, 'Repayment to NBFC partner', metadata?.externalReferenceId);
                }
                break;
        }
        // Update metadata
        if (metadata) {
            financingRequest.metadata = {
                ...financingRequest.metadata,
                statusUpdates: [
                    ...(financingRequest.metadata?.statusUpdates || []),
                    {
                        status,
                        timestamp: new Date(),
                        metadata,
                    },
                ],
            };
        }
        // Save updated financing request
        await this.financingRequestRepository.save(financingRequest);
        // Emit event for status update
        this.eventEmitter.emit('financing.status_updated', {
            financingRequestId: financingRequest.id,
            previousStatus: financingRequest.status,
            newStatus: status,
            metadata,
        });
        return financingRequest;
    }
    /**
     * Create financing transaction
     */
    async createFinancingTransaction(financingRequestId, transactionType, amount, description, externalReferenceId) {
        const financingRequest = await this.financingRequestRepository.findOne({
            where: { id: financingRequestId },
        });
        if (!financingRequest) {
            throw new Error('Financing request not found');
        }
        const transaction = this.financingTransactionRepository.create({
            financingRequestId,
            transactionType,
            amount,
            description,
            externalReferenceId,
            transactionDate: new Date(),
            currencyCode: financingRequest.currencyCode,
        });
        const savedTransaction = await this.financingTransactionRepository.save(transaction);
        // Update financing request amounts
        await this.updateFinancingRequestAmounts(financingRequestId);
        // Emit event for transaction creation
        this.eventEmitter.emit('financing.transaction_created', {
            financingRequestId,
            transactionId: savedTransaction.id,
            transactionType,
            amount,
        });
        return savedTransaction;
    }
    /**
     * Update financing request amounts based on transactions
     */
    async updateFinancingRequestAmounts(financingRequestId) {
        const financingRequest = await this.financingRequestRepository.findOne({
            where: { id: financingRequestId },
        });
        if (!financingRequest) {
            throw new Error('Financing request not found');
        }
        // Get all transactions for this financing request
        const transactions = await this.financingTransactionRepository.find({
            where: { financingRequestId },
        });
        // Calculate totals
        let totalRepaymentAmount = 0;
        let repaidAmount = 0;
        for (const transaction of transactions) {
            if (transaction.transactionType === financing_transaction_entity_1.FinancingTransactionType.DISBURSEMENT) {
                totalRepaymentAmount += transaction.amount;
            }
            else if (transaction.transactionType === financing_transaction_entity_1.FinancingTransactionType.FEE) {
                totalRepaymentAmount += transaction.amount;
            }
            else if (transaction.transactionType === financing_transaction_entity_1.FinancingTransactionType.INTEREST) {
                totalRepaymentAmount += transaction.amount;
            }
            else if (transaction.transactionType === financing_transaction_entity_1.FinancingTransactionType.REPAYMENT) {
                repaidAmount += transaction.amount;
            }
            else if (transaction.transactionType === financing_transaction_entity_1.FinancingTransactionType.REFUND) {
                repaidAmount -= transaction.amount;
            }
        }
        // Add interest if applicable
        if (financingRequest.interestRate && financingRequest.approvedAmount) {
            const interestAmount = (financingRequest.approvedAmount * financingRequest.interestRate / 100) *
                (financingRequest.tenorDays / 365);
            totalRepaymentAmount += interestAmount;
        }
        // Add processing fees if applicable
        if (financingRequest.processingFeePercentage && financingRequest.approvedAmount) {
            const processingFeeAmount = financingRequest.approvedAmount *
                financingRequest.processingFeePercentage / 100;
            totalRepaymentAmount += processingFeeAmount;
        }
        if (financingRequest.processingFeeFixed) {
            totalRepaymentAmount += financingRequest.processingFeeFixed;
        }
        // Update financing request
        financingRequest.totalRepaymentAmount = totalRepaymentAmount;
        financingRequest.repaidAmount = repaidAmount;
        financingRequest.outstandingAmount = totalRepaymentAmount - repaidAmount;
        // Update status if fully repaid
        if (financingRequest.status === financing_request_entity_1.FinancingStatus.FUNDED &&
            financingRequest.outstandingAmount <= 0) {
            financingRequest.status =
                (Content);
            truncated;
            due;
            to;
            size;
            limit.Use;
            line;
            ranges;
            to;
            read in chunks;
        }
    }
};
exports.NBFCIntegrationService = NBFCIntegrationService;
exports.NBFCIntegrationService = NBFCIntegrationService = NBFCIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(nbfc_partner_entity_1.NBFCPartner)),
    __param(1, (0, typeorm_1.InjectRepository)(financing_request_entity_1.FinancingRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(financing_transaction_entity_1.FinancingTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _c : Object])
], NBFCIntegrationService);
//# sourceMappingURL=nbfc-integration.service.js.map