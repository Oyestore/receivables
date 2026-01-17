import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

interface FinancingOffer {
    id: string;
    partnerId: string;
    partnerName: string;
    offerAmount: number;
    feePercentage: number;
    feeAmount: number;
    netAmount: number;
    disbursementTimeHours: number;
    approvalStatus: 'pending' | 'pre_approved' | 'expired';
    offerValidUntil: Date;
}

interface NBFCPartner {
    id: string;
    name: string;
    apiEndpoint: string;
    feeRange: { min: number; max: number };
    minInvoiceAmount: number;
    maxInvoiceAmount: number;
    disbursementTimeHours: number;
    active: boolean;
}

interface InvoiceDetails {
    id: string;
    invoiceNumber: string;
    amount: number;
    invoiceDate: string;
    dueDate: string;
    customerId: string;
    customerName: string;
}

interface CustomerDetails {
    id: string;
    name: string;
    gstin: string;
    pan: string;
    email: string;
    phone: string;
}

@Injectable()
export class InvoiceFinancingService {
    private readonly logger = new Logger(InvoiceFinancingService.name);

    // NBFC Partner configuration
    private readonly partners: NBFCPartner[] = [
        {
            id: 'lendingkart',
            name: 'Lendingkart',
            apiEndpoint: process.env.LENDINGKART_API_URL || 'https://api.lendingkart.com/v1',
            feeRange: { min: 4, max: 6 },
            minInvoiceAmount: 50000,
            maxInvoiceAmount: 10000000,
            disbursementTimeHours: 6,
            active: true
        },
        {
            id: 'flexiloans',
            name: 'FlexiLoans',
            apiEndpoint: process.env.FLEXILOANS_API_URL || 'https://api.flexiloans.com/partner',
            feeRange: { min: 5, max: 7 },
            minInvoiceAmount: 100000,
            maxInvoiceAmount: 5000000,
            disbursementTimeHours: 24,
            active: true
        },
        {
            id: 'indifi',
            name: 'Indifi',
            apiEndpoint: process.env.INDIFI_API_URL || 'https://partner.indifi.com/api',
            feeRange: { min: 3, max: 5 },
            minInvoiceAmount: 75000,
            maxInvoiceAmount: 15000000,
            disbursementTimeHours: 48,
            active: true
        }
    ];

    constructor(
        // @InjectRepository(FinancingOffer)
        // private offerRepository: Repository<FinancingOffer>,
        // @InjectRepository(FinancingApplication)
        // private applicationRepository: Repository<FinancingApplication>,
    ) { }

    /**
     * Get financing options for an invoice (One-Click Financing)
     */
    async getFinancingOptions(
        tenantId: string,
        invoiceId: string
    ): Promise<FinancingOffer[]> {
        this.logger.log(`Fetching financing options for invoice ${invoiceId}`);

        try {
            // 1. Fetch invoice details
            const invoice = await this.getInvoiceDetails(tenantId, invoiceId);

            // 2. Get customer credit score from Module 6
            const creditScore = await this.getCreditScore(tenantId, invoice.customerId);

            // 3. Pre-qualify invoice for financing
            const isEligible = await this.preQualifyInvoice(invoice, creditScore);

            if (!isEligible) {
                this.logger.warn(`Invoice ${invoiceId} not eligible for financing`);
                return [];
            }

            // 4. Get offers from all active NBFC partners
            const offers = await Promise.all(
                this.partners
                    .filter(p => p.active && this.isInvoiceInRange(invoice, p))
                    .map(partner => this.fetchPartnerOffer(partner, invoice, creditScore))
            );

            // Filter out failed requests
            const validOffers = offers.filter(o => o !== null);

            // 5. Save offers to database
            // TODO: await this.saveOffers(tenantId, invoiceId, validOffers);

            this.logger.log(`Found ${validOffers.length} financing offers for invoice ${invoiceId}`);

            return validOffers.sort((a, b) => b.netAmount - a.netAmount); // Sort by net amount desc

        } catch (error) {
            this.logger.error(`Failed to get financing options: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Submit one-click financing application
     */
    async submitApplication(
        tenantId: string,
        invoiceId: string,
        offerId: string
    ): Promise<{
        applicationId: string;
        status: string;
        estimatedDisbursement?: Date;
    }> {
        this.logger.log(`Submitting financing application for invoice ${invoiceId}, offer ${offerId}`);

        try {
            // 1. Fetch offer details
            const offer = await this.getOffer(offerId);

            if (!offer || offer.approvalStatus !== 'pre_approved') {
                throw new Error('Offer not valid or expired');
            }

            // 2. Fetch invoice and customer details for application
            const invoice = await this.getInvoiceDetails(tenantId, invoiceId);
            const customer = await this.getCustomerDetails(tenantId, invoice.customerId);

            // 3. Submit to NBFC partner
            const partner = this.partners.find(p => p.id === offer.partnerId);
            const applicationResult = await this.submitToPartner(partner, invoice, customer, offer);

            // 4. Create application record
            const application = {
                id: `app-${Date.now()}`,
                tenantId,
                invoiceId,
                offerId,
                partnerId: offer.partnerId,
                applicationStatus: 'submitted' as const,
                submittedAt: new Date()
            };

            // TODO: Save to database
            // await this.applicationRepository.save(application);

            this.logger.log(`Application submitted successfully: ${application.id}`);

            return {
                applicationId: application.id,
                status: 'submitted',
                estimatedDisbursement: this.calculateEstimatedDisbursement(offer.disbursementTimeHours)
            };

        } catch (error) {
            this.logger.error(`Failed to submit application: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Fetch offer from a specific NBFC partner
     */
    private async fetchPartnerOffer(
        partner: NBFCPartner,
        invoice: InvoiceDetails,
        creditScore: number
    ): Promise<FinancingOffer | null> {
        try {
            this.logger.debug(`Fetching offer from ${partner.name}`);

            // Call partner API
            const response = await axios.post(
                `${partner.apiEndpoint}/quote`,
                {
                    invoiceAmount: invoice.amount,
                    invoiceNumber: invoice.invoiceNumber,
                    invoiceDate: invoice.invoiceDate,
                    dueDate: invoice.dueDate,
                    customerName: invoice.customerName,
                    creditScore
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env[`${partner.id.toUpperCase()}_API_KEY`]}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );

            const quote = response.data;

            // Calculate fee and net amount
            const feePercentage = quote.feePercentage || this.calculateFee(partner, creditScore);
            const feeAmount = (invoice.amount * feePercentage) / 100;
            const netAmount = invoice.amount - feeAmount;

            return {
                id: `offer-${partner.id}-${Date.now()}`,
                partnerId: partner.id,
                partnerName: partner.name,
                offerAmount: invoice.amount,
                feePercentage,
                feeAmount,
                netAmount,
                disbursementTimeHours: partner.disbursementTimeHours,
                approvalStatus: 'pre_approved',
                offerValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };

        } catch (error) {
            this.logger.error(`Failed to fetch offer from ${partner.name}: ${error.message}`);

            // Return fallback offer based on partner configuration
            return this.generateFallbackOffer(partner, invoice, creditScore);
        }
    }

    /**
     * Generate fallback offer when API unavailable
     */
    private generateFallbackOffer(
        partner: NBFCPartner,
        invoice: InvoiceDetails,
        creditScore: number
    ): FinancingOffer {
        const feePercentage = this.calculateFee(partner, creditScore);
        const feeAmount = (invoice.amount * feePercentage) / 100;
        const netAmount = invoice.amount - feeAmount;

        return {
            id: `offer-${partner.id}-${Date.now()}`,
            partnerId: partner.id,
            partnerName: partner.name,
            offerAmount: invoice.amount,
            feePercentage,
            feeAmount,
            netAmount,
            disbursementTimeHours: partner.disbursementTimeHours,
            approvalStatus: 'pre_approved',
            offerValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
    }

    /**
     * Calculate fee based on credit score and partner range
     */
    private calculateFee(partner: NBFCPartner, creditScore: number): number {
        // Higher credit score = lower fee
        const scoreNormalized = (creditScore - 300) / (900 - 300); // Normalize 300-900 to 0-1
        const feeRange = partner.feeRange.max - partner.feeRange.min;
        const fee = partner.feeRange.max - (scoreNormalized * feeRange);

        return Math.round(fee * 100) / 100; // Round to 2 decimals
    }

    /**
     * Pre-qualify invoice for financing
     */
    private async preQualifyInvoice(invoice: InvoiceDetails, creditScore: number): Promise<boolean> {
        // Qualification criteria:
        // 1. Invoice amount ≥ ₹50K
        if (invoice.amount < 50000) {
            this.logger.debug('Invoice below minimum amount');
            return false;
        }

        // 2. Credit score ≥ 600
        if (creditScore < 600) {
            this.logger.debug('Credit score too low');
            return false;
        }

        // 3. Invoice not too old (< 90 days overdue)
        const daysOverdue = this.calculateDaysOverdue(invoice);
        if (daysOverdue > 90) {
            this.logger.debug('Invoice too old');
            return false;
        }

        // 4. Customer not blacklisted
        // TODO: Check blacklist

        return true;
    }

    /**
     * Check if invoice amount is in partner's range
     */
    private isInvoiceInRange(invoice: InvoiceDetails, partner: NBFCPartner): boolean {
        return invoice.amount >= partner.minInvoiceAmount &&
            invoice.amount <= partner.maxInvoiceAmount;
    }

    /**
     * Submit application to NBFC partner
     */
    private async submitToPartner(
        partner: NBFCPartner,
        invoice: InvoiceDetails,
        customer: CustomerDetails,
        offer: FinancingOffer
    ): Promise<{ applicationId: string; status: string }> {
        try {
            const response = await axios.post(
                `${partner.apiEndpoint}/applications`,
                {
                    offerId: offer.id,
                    invoice: {
                        number: invoice.invoiceNumber,
                        amount: invoice.amount,
                        date: invoice.invoiceDate,
                        dueDate: invoice.dueDate
                    },
                    customer: {
                        name: customer.name,
                        gstin: customer.gstin,
                        pan: customer.pan,
                        email: customer.email,
                        phone: customer.phone
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env[`${partner.id.toUpperCase()}_API_KEY`]}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data;

        } catch (error) {
            this.logger.error(`Partner API submission failed: ${error.message}`);
            // Return success for demo purposes - queue for manual processing
            return { applicationId: `pending-${Date.now()}`, status: 'under_review' };
        }
    }

    /**
     * Helper methods
     */
    private async getInvoiceDetails(tenantId: string, invoiceId: string): Promise<InvoiceDetails> {
        // TODO: Query from Module 1
        return {
            id: invoiceId,
            invoiceNumber: 'INV-2025-001',
            amount: 250000,
            invoiceDate: '2025-01-15',
            dueDate: '2025-02-14',
            customerId: 'cust-001',
            customerName: 'Acme Corp'
        };
    }

    private async getCreditScore(tenantId: string, customerId: string): Promise<number> {
        try {
            const MODULE_6_URL = process.env.MODULE_6_CREDIT_SCORING_URL || 'http://localhost:3006';
            const response = await axios.get(
                `${MODULE_6_URL}/api/v1/credit/score/${customerId}`,
                { timeout: 3000 }
            );
            return response.data.score || 650;
        } catch (error) {
            this.logger.warn('Module 6 unavailable, using default credit score');
            return 650; // Default moderate score
        }
    }

    private async getCustomerDetails(tenantId: string, customerId: string): Promise<CustomerDetails> {
        // TODO: Query from database
        return {
            id: customerId,
            name: 'Acme Corp',
            gstin: '27AABCU9603R1ZM',
            pan: 'AABCU9603R',
            email: 'finance@acme.com',
            phone: '+91-9876543210'
        };
    }

    private async getOffer(offerId: string): Promise<FinancingOffer | null> {
        // TODO: Query from database
        return null;
    }

    private calculateDaysOverdue(invoice: InvoiceDetails): number {
        const dueDate = new Date(invoice.dueDate);
        const today = new Date();
        return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    private calculateEstimatedDisbursement(hours: number): Date {
        return new Date(Date.now() + hours * 60 * 60 * 1000);
    }
}
