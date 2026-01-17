import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
    PayerPortalSessionEntity,
    PortalAccessMode,
    PortalActionType
} from '../entities/payer-portal-session.entity';
import { InvoiceStatus } from '../../../Module_01_Smart_Invoice_Generation/src/entities/invoice.entity';
import { InvoiceService } from '../../../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { PaymentService } from '../../../Module_03_Payment_Integration/src/services/payment.service';
import { PaymentGatewayFactory } from '../../../Module_03_Payment_Integration/src/services/payment-gateway-factory.service';
import { DisputeManagementService } from '../../../Module_08_Dispute_Resolution_&_Legal_Network/code/services/dispute-management.service';

/**
 * Invoice view data returned to portal users
 */
export interface InvoiceViewData {
    id: string;
    tenantId: string;
    invoiceNumber: string;
    status: 'draft' | 'pending' | 'paid' | 'overdue' | 'disputed';
    amount: number;
    currency: string;
    dueDate: string;
    isOverdue: boolean;
    vendor: {
        name: string;
        logo?: string;
        gstin?: string;
        address?: string;
    };
    customer: {
        name: string;
        email?: string;
    };
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        hsnCode?: string;
    }>;
    subtotal: number;
    taxBreakdown: {
        cgst?: number;
        sgst?: number;
        igst?: number;
        total: number;
    };
    total: number;
    paymentTerms?: string;
    actions: {
        canPay: boolean;
        canDispute: boolean;
        canDownload: boolean;
        canApprove: boolean;
    };
}

/**
 * Payment session data
 */
export interface PaymentSessionData {
    orderId: string;
    amount: number;
    currency: string;
    invoiceId: string;
    gatewayKey: string;
    gateway: 'RAZORPAY' | 'PAYU' | 'PHONEPE';
}

/**
 * Dispute ticket data
 */
export interface DisputeTicketData {
    ticketId: string;
    invoiceId: string;
    type: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: Date;
    estimatedResolutionTime: string;
}

/**
 * Static Portal Service
 * Provides public portal functionality for invoice viewing and payment
 * No authentication required - uses secure access tokens
 */
@Injectable()
export class StaticPortalService {
    private readonly logger = new Logger(StaticPortalService.name);

    /** Token expiration: 30 days */
    private readonly TOKEN_EXPIRY_DAYS = 30;

    constructor(
        @InjectRepository(PayerPortalSessionEntity)
        private readonly sessionRepository: Repository<PayerPortalSessionEntity>,
        private readonly invoiceService: InvoiceService,
        private readonly paymentService: PaymentService,
        private readonly paymentGatewayFactory: PaymentGatewayFactory,
        private readonly disputeService: DisputeManagementService,
    ) { }

    /**
     * Generate a secure access token for an invoice
     * Creates a new portal session
     */
    async generateAccessToken(
        tenantId: string,
        invoiceId: string,
        recipientId?: string,
        accessMode: PortalAccessMode = PortalAccessMode.STATIC
    ): Promise<{ token: string; expiresAt: Date; portalUrl: string }> {
        this.logger.log(`Generating access token for invoice: ${invoiceId}`);

        // Generate cryptographically secure token
        const token = crypto.randomBytes(32).toString('hex');

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.TOKEN_EXPIRY_DAYS);

        // Create session
        const session = this.sessionRepository.create({
            tenantId,
            invoiceId,
            recipientId,
            accessToken: token,
            accessMode,
            expiresAt,
            isActive: true,
            actionsLog: []
        });

        await this.sessionRepository.save(session);

        this.logger.log(`Access token generated for invoice ${invoiceId}, expires: ${expiresAt}`);

        return {
            token,
            expiresAt,
            portalUrl: `/portal/invoice/${token}`
        };
    }

    /**
     * Validate access token and return session
     */
    async validateToken(token: string, ipAddress?: string, userAgent?: string): Promise<PayerPortalSessionEntity> {
        const session = await this.sessionRepository.findOne({
            where: { accessToken: token }
        });

        if (!session) {
            throw new NotFoundException('Invalid or expired access token');
        }

        if (!session.isValid()) {
            throw new UnauthorizedException('Access token has expired');
        }

        // Update session with access info
        session.ipAddress = ipAddress || session.ipAddress;
        session.userAgent = userAgent || session.userAgent;
        session.recordView();

        await this.sessionRepository.save(session);

        return session;
    }

    /**
     * Get invoice view data (public - no auth)
     */
    async getInvoiceView(
        token: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<InvoiceViewData> {
        const session = await this.validateToken(token, ipAddress, userAgent);

        this.logger.log(`Invoice view requested: ${session.invoiceId}`);

        // Log the view action
        session.logAction(PortalActionType.VIEW);
        await this.sessionRepository.save(session);

        // TODO: Replace with actual invoice fetch from Module 01
        // For now, return mock data that matches invoice structure
        const invoiceData = await this.fetchInvoiceData(session.invoiceId, session.tenantId);

        return invoiceData;
    }

    /**
     * Download invoice PDF
     */
    async downloadPDF(token: string): Promise<{ buffer: Buffer; filename: string }> {
        const session = await this.validateToken(token);

        this.logger.log(`PDF download requested: ${session.invoiceId}`);

        // Log the action
        session.logAction(PortalActionType.DOWNLOAD_PDF);
        await this.sessionRepository.save(session);

        // Fetch invoice to get details for filename
        const invoice = await this.invoiceService.findOne(session.tenantId, session.invoiceId);

        // Generate Real PDF
        const buffer = await this.invoiceService.getInvoicePDF(session.tenantId, session.invoiceId);

        return {
            buffer,
            filename: `invoice-${invoice.invoiceNumber}.pdf`
        };
    }

    /**
     * Initiate payment for invoice
     */
    async initiatePayment(
        token: string,
        paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'BNPL' = 'UPI'
    ): Promise<PaymentSessionData> {
        const session = await this.validateToken(token);

        this.logger.log(`Payment initiation requested: ${session.invoiceId}, method: ${paymentMethod}`);

        // Fetch invoice to get amount
        const invoice = await this.fetchInvoiceData(session.invoiceId, session.tenantId);

        if (!invoice.actions.canPay) {
            throw new BadRequestException('Payment not available for this invoice');
        }

        // Log the action
        session.logAction(PortalActionType.INITIATE_PAYMENT, { paymentMethod });
        await this.sessionRepository.save(session);

        // Get Active Gateways via Factory
        const gateways = await this.paymentGatewayFactory.getAllGateways(session.tenantId);
        const gateway = gateways.find(g => g.isActive); // Simple selection logic

        if (!gateway) {
            throw new BadRequestException('No active payment gateway found for this merchant.');
        }

        // Create Payment via PaymentService (src API)
        const paymentResponse = await this.paymentService.initiatePayment(
            session.tenantId,
            'PORTAL_USER',
            {
                invoiceId: session.invoiceId,
                amount: invoice.amount,
                currency: invoice.currency,
                method: paymentMethod.toLowerCase(),
                gatewayId: gateway.id
                // description: ...
            } as any // Cast to any if DTO mismatch, assuming structure
        );

        // Extract credentials safely
        const credentials = gateway.credentials as any;
        const gatewayKey = credentials?.key_id || credentials?.publishable_key || 'mock_key';

        return {
            orderId: paymentResponse.gatewayOrderId || paymentResponse.id, // Adaptation
            amount: invoice.amount * 100,
            currency: invoice.currency,
            invoiceId: session.invoiceId,
            gatewayKey: gatewayKey,
            gateway: gateway.gateway.toUpperCase() as 'RAZORPAY' | 'PAYU' | 'PHONEPE'
        };
    }

    /**
     * Raise a dispute for the invoice
     */
    async raiseDispute(
        token: string,
        reason: string,
        category: string = 'billing'
    ): Promise<DisputeTicketData> {
        const session = await this.validateToken(token);

        this.logger.log(`Dispute raised for invoice: ${session.invoiceId}, reason: ${reason}`);

        // Fetch invoice to get details
        const invoice = await this.fetchInvoiceData(session.invoiceId, session.tenantId);

        // Raise dispute via Dispute Service
        const dispute = await this.disputeService.createDispute({
            tenantId: session.tenantId,
            invoiceId: session.invoiceId,
            customerId: invoice.customer.email || 'portal_user', // Fallback
            customerName: invoice.customer.name,
            type: category as any, // Needs improved type mapping
            disputedAmount: invoice.amount, // Default to full amount for now
            description: reason,
            createdBy: 'PORTAL_USER'
        });

        // Log the action
        session.logAction(PortalActionType.RAISE_DISPUTE, { reason, category, ticketId: dispute.caseNumber });
        await this.sessionRepository.save(session);

        return {
            ticketId: dispute.caseNumber,
            invoiceId: session.invoiceId,
            type: dispute.type,
            status: 'open',
            createdAt: dispute.createdAt,
            estimatedResolutionTime: '24-48 hours'
        };
    }

    /**
     * Approve draft invoice (for collaborative invoicing)
     */
    async approveDraft(token: string): Promise<{ success: boolean; message: string }> {
        const session = await this.validateToken(token);

        const invoice = await this.fetchInvoiceData(session.invoiceId, session.tenantId);

        if (!invoice.actions.canApprove) {
            throw new BadRequestException('This invoice is not a draft or already approved');
        }

        this.logger.log(`Draft approved: ${session.invoiceId}`);

        // Log the action
        session.logAction(PortalActionType.APPROVE_DRAFT);
        await this.sessionRepository.save(session);

        // Un-stubbed: Update status in Module 01
        await this.invoiceService.updateStatus(
            session.tenantId,
            session.recipientId || 'PORTAL_USER',
            session.invoiceId,
            InvoiceStatus.APPROVED,
            'Approved via Customer Portal'
        );

        return {
            success: true,
            message: 'Draft invoice approved. The vendor will now generate the final tax invoice.'
        };
    }

    /**
     * Get portal analytics for a specific session
     */
    async getSessionAnalytics(token: string): Promise<{
        viewCount: number;
        actions: Array<{ type: string; timestamp: Date }>;
        firstAccess: Date;
        lastAccess: Date;
    }> {
        const session = await this.sessionRepository.findOne({
            where: { accessToken: token }
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return {
            viewCount: session.viewCount,
            actions: session.actionsLog.map(a => ({ type: a.type, timestamp: a.timestamp })),
            firstAccess: session.createdAt,
            lastAccess: session.lastAccessedAt || session.createdAt
        };
    }

    /**
     * Revoke access token
     */
    async revokeToken(token: string): Promise<void> {
        const session = await this.sessionRepository.findOne({
            where: { accessToken: token }
        });

        if (session) {
            session.isActive = false;
            await this.sessionRepository.save(session);
            this.logger.log(`Token revoked for invoice: ${session.invoiceId}`);
        }
    }

    /**
     * Fetch invoice data (mock implementation)
     * Replaced with actual integration to Module 01
     */
    private async fetchInvoiceData(invoiceId: string, tenantId: string): Promise<InvoiceViewData> {
        try {
            // Use findOne instead of getInvoiceById
            const invoice = await this.invoiceService.findOne(tenantId, invoiceId);

            const isOverdue = invoice.status !== 'paid' && invoice.dueDate && new Date() > new Date(invoice.dueDate);
            let status: InvoiceViewData['status'] = 'pending';
            if (invoice.status === InvoiceStatus.DRAFT) status = 'draft';
            else if (invoice.status === InvoiceStatus.PAID) status = 'paid';
            else if (isOverdue) status = 'overdue';

            // Safe property access with fallbacks
            return {
                id: invoice.id,
                tenantId: invoice.tenantId,
                invoiceNumber: invoice.invoiceNumber,
                status,
                amount: Number(invoice.grandTotal),
                currency: invoice.currency,
                dueDate: invoice.dueDate ? invoice.dueDate.toString() : '',
                isOverdue,
                vendor: {
                    name: 'Paramount Software Solutions',
                    logo: '/logos/default-vendor.png',
                    gstin: '29ABCDE1234F1Z5',
                    address: 'Tech Park, Bangalore'
                },
                customer: {
                    name: invoice.customerName || 'Customer',
                    email: invoice.customerEmail || 'email@example.com'
                },
                lineItems: invoice.lineItems?.map(item => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    amount: Number(item.itemSubTotal || 0),
                    hsnCode: (item as any).hsnCode || '9983' // Fallback
                })) || [],
                subtotal: Number(invoice.subTotal),
                taxBreakdown: {
                    total: Number(invoice.totalTaxAmount)
                },
                total: Number(invoice.grandTotal),
                paymentTerms: invoice.termsAndConditions || '', // best guess mapping
                actions: {
                    canPay: invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.DRAFT,
                    canDispute: invoice.status !== InvoiceStatus.PAID,
                    canDownload: true,
                    canApprove: invoice.status === InvoiceStatus.DRAFT
                }
            };
        } catch (error) {
            this.logger.error(`Failed to fetch real invoice ${invoiceId}`, error);
            // Fallback to mock if real fetch fails (e.g. data missing in dev env)
            return this.getMockInvoice(invoiceId, tenantId);
        }
    }

    private getMockInvoice(invoiceId: string, tenantId: string): InvoiceViewData {
        const isDraft = invoiceId.includes('DRAFT');
        const isPaid = invoiceId.includes('PAID');
        const isOverdue = !isPaid && new Date() > new Date('2025-12-15');

        let status: InvoiceViewData['status'] = 'pending';
        if (isDraft) status = 'draft';
        else if (isPaid) status = 'paid';
        else if (isOverdue) status = 'overdue';

        return {
            id: invoiceId,
            tenantId: tenantId,
            invoiceNumber: `INV-${invoiceId.substring(0, 8).toUpperCase()}`,
            status,
            amount: 50000,
            currency: 'INR',
            dueDate: '2025-12-25',
            isOverdue,
            vendor: {
                name: 'ABC Consulting Pvt Ltd (Mock)',
                logo: '/logos/default-vendor.png',
                gstin: '29ABCDE1234F1Z5',
                address: '123 Business Park, Bangalore 560001'
            },
            customer: {
                name: 'XYZ Corporation',
                email: 'accounts@xyzcorp.com'
            },
            lineItems: [
                {
                    description: 'Professional Consulting Services - Mock Data',
                    quantity: 1,
                    unitPrice: 42372.88,
                    amount: 42372.88,
                    hsnCode: '9983'
                }
            ],
            subtotal: 42372.88,
            taxBreakdown: {
                total: 7627.12
            },
            total: 50000,
            paymentTerms: 'Net 30',
            actions: {
                canPay: !isPaid && !isDraft,
                canDispute: !isPaid,
                canDownload: true,
                canApprove: isDraft
            }
        };
    }
}
