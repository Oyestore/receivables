import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConciergeService } from '../services/concierge.service';
import { PaymentIntegrationService } from '../services/payment-integration.service';
import { DisputeIntegrationService } from '../services/dispute-integration.service';
import { ReferralIntegrationService } from '../services/referral-integration.service';
import { OrchestrationService } from '../services/orchestration.service';
import { NotificationService } from '../services/notification.service';
import { ChatPersona } from '../entities/chat-session.entity';
import { InvoiceService } from '../../../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { InvoiceStatus } from '../../../Module_01_Smart_Invoice_Generation/src/entities/invoice.entity';
import { PaymentService } from '../../../Module_03_Payment_Integration/src/services/payment.service';

@ApiTags('concierge')
@Controller('concierge')
export class ConciergeController {
    constructor(
        private readonly conciergeService: ConciergeService,
        private readonly paymentIntegration: PaymentIntegrationService,
        private readonly disputeIntegration: DisputeIntegrationService,
        private readonly referralIntegration: ReferralIntegrationService,
        private readonly orchestration: OrchestrationService,
        private readonly notification: NotificationService,
        private readonly invoiceService: InvoiceService,
        private readonly paymentService: PaymentService,
    ) { }

    // Generic Session Start (Supports both CFO and Payer via persona)
    @Post('session')
    async startSession(@Body() body: { tenantId: string, persona: string, referenceId?: string }) {
        return this.conciergeService.startSession(body.tenantId, body.persona as ChatPersona, body.referenceId);
    }

    @Get('session/:sessionId')
    async getSession(@Param('sessionId') sessionId: string) {
        return this.conciergeService.getSession(sessionId);
    }

    // Face A: Internal SME (Protected by Auth Guard in real app)
    @Post('start/cfo')
    async startCFO(@Body() body: { tenantId: string }) {
        return this.conciergeService.startSession(body.tenantId, ChatPersona.CFO);
    }

    // Face B: External Payer (Public Access via Magic Link ID)
    @Post('start/payer')
    async startPayer(@Body() body: { tenantId: string; invoiceId: string }) {
        return this.conciergeService.startSession(body.tenantId, ChatPersona.CONCIERGE, body.invoiceId);
    }

    @Post(':sessionId/message')
    async sendMessage(
        @Param('sessionId') sessionId: string,
        @Body() body: { message: string, language?: string }
    ) {
        return this.conciergeService.processMessage(sessionId, body.message, body.language);
    }

    // NEW ENDPOINTS FOR VISUAL UI

    @Get(':sessionId/invoice')
    @ApiOperation({ summary: 'Get invoice details for session' })
    @ApiResponse({ status: 200, description: 'Invoice details returned' })
    async getInvoice(@Param('sessionId') sessionId: string) {
        const session = await this.conciergeService.getSession(sessionId);

        if (!session || !session.externalReferenceId) {
            throw new HttpException('Invalid session or no invoice linked', HttpStatus.NOT_FOUND);
        }

        try {
            // Integrate with actual invoice service
            const invoice = await this.invoiceService.findOne(session.tenantId, session.externalReferenceId);

            // Map to simplified view model if needed, or return invoice directly
            return {
                id: invoice.id,
                number: invoice.invoiceNumber,
                status: invoice.status,
                amount: Number(invoice.grandTotal),
                currency: invoice.currency,
                dueDate: invoice.dueDate,
                vendor: {
                    name: 'Paramount Software Solutions', // Placeholder or fetch tenant profile
                    gstin: '29ABCDE1234F1Z5'
                },
                customer: {
                    name: invoice.customerName,
                    email: invoice.customerEmail
                },
                lineItems: invoice.lineItems,
                subtotal: Number(invoice.subTotal),
                tax: {
                    gst: {
                        amount: Number(invoice.totalTaxAmount)
                    }
                },
                total: Number(invoice.grandTotal),
                paymentTerms: invoice.termsAndConditions
            };
        } catch (error) {
            throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
        }
    }

    @Post(':sessionId/initiate-payment')
    @ApiOperation({ summary: 'Create Razorpay payment order' })
    async initiatePayment(@Param('sessionId') sessionId: string) {
        const session = await this.conciergeService.getSession(sessionId);

        // Fetch invoice directly to avoid mapping overhead of getInvoice endpoint logic
        const invoice = await this.invoiceService.findOne(session.tenantId, session.externalReferenceId);

        // Integrate with Module 03 (Payment)
        const paymentResponse = await this.paymentService.initiatePayment(
            session.tenantId,
            'concierge_user', // Acting user
            {
                invoiceId: invoice.id,
                amount: Number(invoice.grandTotal),
                currency: invoice.currency,
                // preferredGateway: 'RAZORPAY' // Optional
            } as any
        );

        return {
            orderId: paymentResponse.gatewayOrderId,
            amount: Number(paymentResponse.amount) * 100, // Razorpay expects paise
            currency: paymentResponse.currency,
            invoiceId: invoice.id,
            key: process.env.RAZORPAY_KEY_ID // Should come from gateway config in real flow
        };
    }

    @Post(':sessionId/verify-payment')
    @ApiOperation({ summary: 'Verify Razorpay payment signature' })
    async verifyPayment(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            razorpay_order_id: string,
            razorpay_payment_id: string,
            razorpay_signature: string
        }
    ) {
        const session = await this.conciergeService.getSession(sessionId);

        // Mock verification for now
        return {
            success: true,
            paymentId: body.razorpay_payment_id,
            orderId: body.razorpay_order_id,
            invoiceId: session.externalReferenceId,
            timestamp: new Date().toISOString()
        };
    }

    @Post(':sessionId/approve-draft')
    @ApiOperation({ summary: 'Approve draft invoice' })
    async approveDraft(@Param('sessionId') sessionId: string) {
        const session = await this.conciergeService.getSession(sessionId);

        // Integrate with invoice service to mark draft as approved (SENT status)
        await this.invoiceService.updateStatus(
            session.tenantId,
            'concierge_user',
            session.externalReferenceId,
            InvoiceStatus.SENT, // Equivalent to Approved/Finalized
            'Approved via Concierge'
        );

        return {
            success: true,
            message: 'Draft invoice approved. Final invoice will be generated.',
            invoiceId: session.externalReferenceId
        };
    }

    @Post(':sessionId/raise-dispute')
    @ApiOperation({ summary: 'Create dispute for invoice' })
    async raiseDispute(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            type: string,
            description: string,
            evidence?: string[]
        }
    ) {
        // Integrate with Module 08 (Dispute Resolution)
        const ticket = await this.disputeIntegration.createDisputeTicket(
            sessionId,
            {
                type: body.type,
                description: body.description,
                evidence: body.evidence
            }
        );

        return {
            success: true,
            ticketId: ticket.id,
            invoiceId: ticket.invoiceId,
            type: body.type,
            status: ticket.status,
            message: `Dispute ticket ${ticket.id} created. Vendor will respond within 24 hours.`
        };
    }

    @Get(':sessionId/download-pdf')
    @ApiOperation({ summary: 'Download invoice PDF' })
    async downloadPDF(@Param('sessionId') sessionId: string, @Res() res: Response) {
        const session = await this.conciergeService.getSession(sessionId);

        try {
            const pdfBuffer = await this.invoiceService.getInvoicePDF(session.tenantId, session.externalReferenceId);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${session.externalReferenceId}.pdf"`,
                'Content-Length': pdfBuffer.length,
            });

            res.send(pdfBuffer);
        } catch (error) {
            throw new HttpException('Failed to generate PDF', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':sessionId/payment-history')
    @ApiOperation({ summary: 'Get customer payment history with this tenant' })
    async getPaymentHistory(@Param('sessionId') sessionId: string) {
        const session = await this.conciergeService.getSession(sessionId);

        // Context: We need to know WHO the customer is.
        const invoice = await this.invoiceService.findOne(session.tenantId, session.externalReferenceId);

        if (!invoice || !invoice.customerEmail) {
            throw new HttpException('Customer context not found', HttpStatus.NOT_FOUND);
        }

        const { transactions, total } = await this.paymentService.findAll(session.tenantId, {
            page: 1,
            limit: 20,
            payerEmail: invoice.customerEmail
        });

        return {
            payments: transactions.map(t => ({
                id: t.id,
                invoiceNumber: t.invoice?.invoiceNumber || 'N/A',
                amount: Number(t.amount),
                date: t.completedAt || t.createdAt,
                method: t.gatewayType,
                status: t.status
            })),
            totalPaid: transactions
                .filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + Number(t.amount), 0),
            paymentCount: total,
            avgPaymentTime: '2.3 days' // Placeholder for complex metric
        };
    }

    @Post(':sessionId/share-referral')
    @ApiOperation({ summary: 'Track referral share' })
    async shareReferral(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            channel: 'whatsapp' | 'email' | 'linkedin',
            recipientType: 'supplier' | 'peer'
        }
    ) {
        const session = await this.conciergeService.getSession(sessionId);

        const referralCode = session.tenantId + '_' + Math.random().toString(36).substr(2, 6);

        return {
            success: true,
            referralCode,
            shareUrl: `https://platform.com/signup?ref=${referralCode}`,
            incentive: '₹500 credit when they sign up',
            channel: body.channel
        };
    }
}


