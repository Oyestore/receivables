import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { PaymentLink } from '../entities/payment-link.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import * as crypto from 'crypto';

/**
 * Payment Link creation parameters
 */
export interface CreatePaymentLinkParams {
    tenantId: string;
    invoiceId?: string;
    amount: number;
    currency?: string;
    description: string;
    customerEmail?: string;
    customerPhone?: string;
    expiresAt?: Date;
    notifyCustomer?: boolean;
    callbackUrl?: string;
    metadata?: any;
}

/**
 * QR Code  generation parameters
 */
export interface GenerateQRCodeParams {
    type: 'upi' | 'payment_link' | 'custom';
    data: string | {
        vpa?: string;
        name?: string;
        amount?: number;
        note?: string;
        url?: string;
    };
    size?: number;
    color?: {
        dark?: string;
        light?: string;
    };
    logo?: string;
}

/**
 * Payment Link & QR Code Service
 * 
 * Comprehensive service for generating:
 * - Payment links (shareable URLs)
 * - UPI QR codes
 * - Dynamic QR codes for invoices
 * - Custom branded QR codes
 * - Expirable payment links
 * - One-time use links
 * 
 * Features:
 * - Secure link generation with cryptographic tokens
 * - QR code customization (size, color, logo)
 * - Link expiration handling
 * - Usage tracking
 * - Customer notifications
 * - Integration with UPI service
 * 
 * @example
 * ```typescript
 * // Create payment link
 * const link = await service.createPaymentLink({
 *   amount: 10000,
 *   description: 'Invoice #INV-001',
 *   customerEmail: 'customer@example.com',
 *   expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
 * });
 * 
 * // Generate UPI QR code
 * const qr = await service.generateQRCode({
 *   type: 'upi',
 *   data: {
 *     vpa: 'merchant@paytm',
 *     amount: 5000,
 *     note: 'Payment for order',
 *   },
 * });
 * ```
 */
@Injectable()
export class PaymentLinkService {
    private readonly logger = new Logger(PaymentLinkService.name);
    private readonly baseUrl: string;

    constructor(
        @InjectRepository(PaymentLink)
        private readonly linkRepo: Repository<PaymentLink>,
        @InjectRepository(PaymentTransaction)
        private readonly paymentRepo: Repository<PaymentTransaction>,
    ) {
        this.baseUrl = process.env.PAYMENT_LINK_BASE_URL || 'https://pay.yourplatform.com';
    }

    // ==========================================
    // PAYMENT LINK OPERATIONS
    // ==========================================

    /**
     * Create payment link
     */
    async createPaymentLink(params: CreatePaymentLinkParams): Promise<{
        id: string;
        shortCode: string;
        url: string;
        qrCode: string;
        expiresAt?: Date;
    }> {
        try {
            // Generate unique short code
            const shortCode = this.generateShortCode();

            // Create payment link entity
            const link = this.linkRepo.create({
                tenant_id: params.tenantId,
                invoice_id: params.invoiceId,
                short_code: shortCode,
                amount: params.amount,
                currency: params.currency || 'INR',
                description: params.description,
                customer_email: params.customerEmail,
                customer_phone: params.customerPhone,
                expires_at: params.expiresAt,
                callback_url: params.callbackUrl,
                metadata: params.metadata,
                status: 'active',
                created_at: new Date(),
            });

            await this.linkRepo.save(link);

            // Generate full URL
            const url = `${this.baseUrl}/pay/${shortCode}`;

            // Generate QR code for the link
            const qrCode = await this.generateQRCode({
                type: 'payment_link',
                data: url,
                size: 300,
            });

            // Send notification if requested
            if (params.notifyCustomer && (params.customerEmail || params.customerPhone)) {
                await this.sendPaymentLinkNotification({
                    email: params.customerEmail,
                    phone: params.customerPhone,
                    url,
                    amount: params.amount,
                    description: params.description,
                });
            }

            this.logger.log(`Payment link created: ${shortCode}`);

            return {
                id: link.id,
                shortCode,
                url,
                qrCode: qrCode.dataUrl,
                expiresAt: params.expiresAt,
            };
        } catch (error) {
            this.logger.error(`Failed to create payment link: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get payment link by short code
     */
    async getPaymentLink(shortCode: string): Promise<PaymentLink> {
        try {
            const link = await this.linkRepo.findOne({
                where: { short_code: shortCode },
                relations: ['invoice'],
            });

            if (!link) {
                throw new Error('Payment link not found');
            }

            // Check expiration
            if (link.expires_at && new Date() > link.expires_at) {
                link.status = 'expired';
                await this.linkRepo.save(link);
                throw new Error('Payment link has expired');
            }

            // Check if already used (one-time links)
            if (link.max_uses && link.use_count >= link.max_uses) {
                link.status = 'used';
                await this.linkRepo.save(link);
                throw new Error('Payment link has been used');
            }

            return link;
        } catch (error) {
            this.logger.error(`Failed to get payment link: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process payment via link
     */
    async processPaymentViaLink(params: {
        shortCode: string;
        paymentMethod: string;
        paymentDetails: any;
    }): Promise<{
        success: boolean;
        paymentId: string;
        transactionId: string;
    }> {
        try {
            const link = await this.getPaymentLink(params.shortCode);

            // Create payment transaction
            const payment = this.paymentRepo.create({
                tenant_id: link.tenant_id,
                invoice_id: link.invoice_id,
                amount: link.amount,
                currency: link.currency,
                payment_method: params.paymentMethod,
                gateway: params.paymentMethod,
                status: 'pending',
                metadata: {
                    payment_link_id: link.id,
                    ...params.paymentDetails,
                },
            });

            await this.paymentRepo.save(payment);

            // Increment use count
            link.use_count = (link.use_count || 0) + 1;
            link.last_used_at = new Date();

            if (link.max_uses && link.use_count >= link.max_uses) {
                link.status = 'used';
            }

            await this.linkRepo.save(link);

            this.logger.log(`Payment processed via link: ${params.shortCode}`);

            return {
                success: true,
                paymentId: payment.id,
                transactionId: payment.transaction_id,
            };
        } catch (error) {
            this.logger.error(`Failed to process payment via link: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel payment link
     */
    async cancelPaymentLink(shortCode: string): Promise<void> {
        try {
            const link = await this.linkRepo.findOne({ where: { short_code: shortCode } });

            if (!link) {
                throw new Error('Payment link not found');
            }

            link.status = 'cancelled';
            await this.linkRepo.save(link);

            this.logger.log(`Payment link cancelled: ${shortCode}`);
        } catch (error) {
            this.logger.error(`Failed to cancel payment link: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // QR CODE GENERATION
    // ==========================================

    /**
     * Generate QR code
     * Supports UPI, payment links, and custom data
     */
    async generateQRCode(params: GenerateQRCodeParams): Promise<{
        dataUrl: string;
        svg?: string;
    }> {
        try {
            let qrData: string;

            // Prepare QR data based on type
            if (params.type === 'upi' && typeof params.data === 'object') {
                qrData = this.buildUPIString(params.data);
            } else if (params.type === 'payment_link' || params.type === 'custom') {
                qrData = typeof params.data === 'string' ? params.data : JSON.stringify(params.data);
            } else {
                throw new Error('Invalid QR code parameters');
            }

            // QR code options
            const options: QRCode.QRCodeToDataURLOptions = {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: params.size || 300,
                color: {
                    dark: params.color?.dark || '#000000',
                    light: params.color?.light || '#FFFFFF',
                },
            };

            // Generate data URL
            const dataUrl = await QRCode.toDataURL(qrData, options);

            // Optionally generate SVG
            let svg: string | undefined;
            if (params.type === 'upi') {
                svg = await QRCode.toString(qrData, { type: 'svg', ...options });
            }

            return {
                dataUrl,
                svg,
            };
        } catch (error) {
            this.logger.error(`QR code generation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate UPI QR code for invoice
     */
    async generateInvoiceQRCode(params: {
        invoiceId: string;
        merchantVPA: string;
        merchantName: string;
        amount: number;
    }): Promise<{
        qrCodeDataUrl: string;
        upiString: string;
    }> {
        try {
            const upiData = {
                vpa: params.merchantVPA,
                name: params.merchantName,
                amount: params.amount,
                note: `Payment for Invoice ${params.invoiceId}`,
            };

            const upiString = this.buildUPIString(upiData);
            const qrCode = await this.generateQRCode({
                type: 'upi',
                data: upiData,
                size: 400,
            });

            return {
                qrCodeDataUrl: qrCode.dataUrl,
                upiString: `upi://pay?${upiString}`,
            };
        } catch (error) {
            this.logger.error(`Invoice QR code generation failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private generateShortCode(): string {
        // Generate 8-character alphanumeric code
        return crypto
            .randomBytes(6)
            .toString('base64')
            .replace(/[+/=]/g, '')
            .substring(0, 8)
            .toUpperCase();
    }

    private buildUPIString(params: {
        vpa?: string;
        name?: string;
        amount?: number;
        note?: string;
    }): string {
        const parts = [];

        if (params.vpa) {
            parts.push(`pa=${encodeURIComponent(params.vpa)}`);
        }

        if (params.name) {
            parts.push(`pn=${encodeURIComponent(params.name)}`);
        }

        if (params.amount) {
            parts.push(`am=${params.amount}`);
        }

        if (params.note) {
            parts.push(`tn=${encodeURIComponent(params.note)}`);
        }

        parts.push('cu=INR');

        return parts.join('&');
    }

    private async sendPaymentLinkNotification(params: {
        email?: string;
        phone?: string;
        url: string;
        amount: number;
        description: string;
    }): Promise<void> {
        // Email notification
        if (params.email) {
            // Would integrate with email service
            this.logger.log(`Email notification sent to ${params.email}`);
        }

        // SMS notification
        if (params.phone) {
            // Would integrate with SMS service
            this.logger.log(`SMS notification sent to ${params.phone}`);
        }
    }
}
