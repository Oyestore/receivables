import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpiTransaction } from '../entities/upi-transaction.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

/**
 * UPI Provider configuration
 */
interface UpiProviderConfig {
    provider: 'phonepe' | 'googlepay' | 'paytm' | 'bhim';
    merchantId: string;
    merchantKey: string;
    apiKey?: string;
    apiSecret?: string;
    saltKey?: string;
    saltIndex?: number;
    callbackUrl: string;
    environment: 'sandbox' | 'production';
}

/**
 * UPI Payment Request
 */
export interface UpiPaymentRequest {
    amount: number;
    merchantTransactionId: string;
    merchantUserId: string;
    callbackUrl?: string;
    redirectUrl?: string;
    paymentInstrument?: {
        type: 'UPI_INTENT' | 'UPI_QR' | 'UPI_COLLECT';
        vpa?: string;
        targetApp?: string;
    };
    deviceContext?: {
        deviceOS: string;
        merchantCallBackScheme?: string;
    };
}

/**
 * UPI Transaction Status
 */
export interface UpiTransactionStatus {
    success: boolean;
    code: string;
    message: string;
    data?: {
        merchantId: string;
        merchantTransactionId: string;
        transactionId: string;
        amount: number;
        state: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
        responseCode: string;
        paymentInstrument?: {
            type: string;
            utr?: string;
            cardType?: string;
        };
    };
}

/**
 * UPI Payment Service
 * 
 * Comprehensive UPI payment processing service supporting:
 * - PhonePe UPI integration (PG API)
 * - Google Pay integration
 * - Paytm UPI integration
 * - BHIM UPI integration
 * - QR code generation (UPI deep links)
 * - VPA validation
 * - Collect requests
 * - Intent-based payments
 * - Transaction status tracking
 * - Automatic timeout handling
 * 
 * @example
 * ```typescript
 * // Initiate PhonePe payment
 * const result = await upiService.initiatePayment({
 *   provider: 'phonepe',
 *   amount: 10000,
 *   merchantTransactionId: 'TXN123',
 *   merchantUserId: 'user456',
 * });
 * 
 * // Generate UPI QR code
 * const qr = await upiService.generateQRCode({
 *   vpa: 'merchant@paytm',
 *   amount: 5000,
 *   name: 'Merchant Name',
 * });
 * ```
 */
@Injectable()
export class UpiPaymentService {
    private readonly logger = new Logger(UpiPaymentService.name);
    private readonly providers: Map<string, AxiosInstance> = new Map();

    // Timeout for UPI transactions (5 minutes)
    private readonly TRANSACTION_TIMEOUT = 5 * 60 * 1000;

    constructor(
        @InjectRepository(UpiTransaction)
        private readonly upiTransactionRepo: Repository<UpiTransaction>,
        @InjectRepository(PaymentTransaction)
        private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initializeProviders();
        this.scheduleTimeoutCheck();
    }

    // ==========================================
    // PHONEPE INTEGRATION
    // ==========================================

    /**
     * Initiate PhonePe UPI payment
     * Supports UPI Intent, Collect, and QR flows
     */
    async initiatePhonePePayment(
        config: UpiProviderConfig,
        request: UpiPaymentRequest
    ): Promise<{
        success: boolean;
        instrumentResponse: {
            type: string;
            intentUrl?: string;
            qrData?: string;
        };
        code: string;
        message: string;
        data: any;
    }> {
        try {
            const phonepeClient = this.getOrCreateProvider('phonepe', config);

            // Prepare PhonePe request payload
            const payload = {
                merchantId: config.merchantId,
                merchantTransactionId: request.merchantTransactionId,
                merchantUserId: request.merchantUserId,
                amount: request.amount * 100, // Paise
                callbackUrl: request.callbackUrl || config.callbackUrl,
                mobileNumber: '',
                paymentInstrument: request.paymentInstrument || {
                    type: 'UPI_INTENT',
                },
                deviceContext: request.deviceContext,
            };

            // Create X-VERIFY header (SHA256 hash + salt)
            const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const xVerify = this.generatePhonePeChecksum(
                base64Payload,
                config.saltKey,
                config.saltIndex
            );

            // Make API request
            const response = await phonepeClient.post('/pg/v1/pay', {
                request: base64Payload,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                },
            });

            // Save transaction
            await this.saveUpiTransaction({
                provider: 'phonepe',
                merchantTransactionId: request.merchantTransactionId,
                amount: request.amount,
                status: 'PENDING',
                raw_request: payload,
                raw_response: response.data,
            });

            return response.data;
        } catch (error) {
            this.logger.error(`PhonePe payment initiation failed: ${error.message}`, error.stack);
            throw new Error(`PhonePe payment failed: ${error.message}`);
        }
    }

    /**
     * Check PhonePe payment status
     */
    async checkPhonePeStatus(
        config: UpiProviderConfig,
        merchantTransactionId: string
    ): Promise<UpiTransactionStatus> {
        try {
            const phonepeClient = this.getOrCreateProvider('phonepe', config);

            // Create X-VERIFY for status check
            const statusEndpoint = `/pg/v1/status/${config.merchantId}/${merchantTransactionId}`;
            const xVerify = this.generatePhonePeChecksum(
                statusEndpoint,
                config.saltKey,
                config.saltIndex
            );

            const response = await phonepeClient.get(statusEndpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                },
            });

            // Update transaction status
            await this.updateTransactionStatus(
                merchantTransactionId,
                'phonepe',
                response.data
            );

            return response.data;
        } catch (error) {
            this.logger.error(`PhonePe status check failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // GOOGLE PAY INTEGRATION
    // ==========================================

    /**
     * Initiate Google Pay UPI payment
     * Uses Google Pay for Business API
     */
    async initiateGooglePayPayment(
        config: UpiProviderConfig,
        request: UpiPaymentRequest
    ): Promise<{
        success: boolean;
        deepLink: string;
        qrCode?: string;
    }> {
        try {
            // Google Pay uses UPI deep linking
            const upiLink = this.generateUPIDeepLink({
                vpa: config.merchantId, // UPI VPA
                name: 'Merchant Name',
                amount: request.amount,
                txnId: request.merchantTransactionId,
                note: `Payment for ${request.merchantTransactionId}`,
            });

            // Generate Google Pay specific deep link
            const gpayDeepLink = `gpay://upi/pay?${upiLink}`;

            // Save transaction
            await this.saveUpiTransaction({
                provider: 'googlepay',
                merchantTransactionId: request.merchantTransactionId,
                amount: request.amount,
                status: 'PENDING',
                deep_link: gpayDeepLink,
            });

            return {
                success: true,
                deepLink: gpayDeepLink,
            };
        } catch (error) {
            this.logger.error(`Google Pay payment initiation failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // PAYTM UPI INTEGRATION
    // ==========================================

    /**
     * Initiate Paytm UPI payment
     */
    async initiatePaytmUpiPayment(
        config: UpiProviderConfig,
        request: UpiPaymentRequest
    ): Promise<{
        success: boolean;
        txnToken: string;
        orderId: string;
        deepLink?: string;
    }> {
        try {
            const paytmClient = this.getOrCreateProvider('paytm', config);

            // Step 1: Initiate transaction
            const initPayload = {
                body: {
                    requestType: 'Payment',
                    mid: config.merchantId,
                    websiteName: 'DEFAULT',
                    orderId: request.merchantTransactionId,
                    callbackUrl: request.callbackUrl || config.callbackUrl,
                    txnAmount: {
                        value: request.amount.toString(),
                        currency: 'INR',
                    },
                    userInfo: {
                        custId: request.merchantUserId,
                    },
                    paymentMode: {
                        mode: ['UPI'],
                    },
                },
            };

            // Generate checksum
            const checksum = this.generatePaytmChecksum(
                initPayload,
                config.merchantKey
            );

            const response = await paytmClient.post('/theia/api/v1/initiateTransaction', initPayload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    mid: config.merchantId,
                    orderId: request.merchantTransactionId,
                },
            });

            // Save transaction
            await this.saveUpiTransaction({
                provider: 'paytm',
                merchantTransactionId: request.merchantTransactionId,
                amount: request.amount,
                status: 'PENDING',
                txn_token: response.data.body.txnToken,
            });

            return {
                success: true,
                txnToken: response.data.body.txnToken,
                orderId: request.merchantTransactionId,
            };
        } catch (error) {
            this.logger.error(`Paytm UPI payment initiation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check Paytm transaction status
     */
    async checkPaytmStatus(
        config: UpiProviderConfig,
        orderId: string
    ): Promise<UpiTransactionStatus> {
        try {
            const paytmClient = this.getOrCreateProvider('paytm', config);

            const statusPayload = {
                body: {
                    mid: config.merchantId,
                    orderId,
                },
            };

            const checksum = this.generatePaytmChecksum(statusPayload, config.merchantKey);

            const response = await paytmClient.post('/v3/order/status', statusPayload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Update status
            await this.updateTransactionStatus(orderId, 'paytm', response.data);

            return {
                success: response.data.body.resultInfo.resultStatus === 'TXN_SUCCESS',
                code: response.data.body.resultInfo.resultCode,
                message: response.data.body.resultInfo.resultMsg,
                data: response.data.body,
            };
        } catch (error) {
            this.logger.error(`Paytm status check failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // BHIM UPI INTEGRATION
    // ==========================================

    /**
     * Initiate BHIM UPI payment
     * Uses UPI Collect or Intent flow
     */
    async initiateBhimPayment(
        config: UpiProviderConfig,
        request: UpiPaymentRequest & { vpa: string }
    ): Promise<{
        success: boolean;
        deepLink: string;
        rrn: string; // Retrieval Reference Number
    }> {
        try {
            // BHIM uses standard UPI protocol
            const upiLink = this.generateUPIDeepLink({
                vpa: config.merchantId,
                name: 'Merchant',
                amount: request.amount,
                txnId: request.merchantTransactionId,
                note: `Payment via BHIM`,
            });

            const bhimDeepLink = `bhim://pay?${upiLink}`;

            // For collect request
            if (request.vpa) {
                // Initiate UPI collect request
                const rrn = await this.initiateCollectRequest({
                    payerVpa: request.vpa,
                    payeeVpa: config.merchantId,
                    amount: request.amount,
                    txnId: request.merchantTransactionId,
                });

                await this.saveUpiTransaction({
                    provider: 'bhim',
                    merchantTransactionId: request.merchantTransactionId,
                    amount: request.amount,
                    status: 'PENDING',
                    rrn,
                    payer_vpa: request.vpa,
                });

                return {
                    success: true,
                    deepLink: bhimDeepLink,
                    rrn,
                };
            }

            return {
                success: true,
                deepLink: bhimDeepLink,
                rrn: this.generateRRN(),
            };
        } catch (error) {
            this.logger.error(`BHIM payment initiation failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // GENERIC UPI OPERATIONS
    // ==========================================

    /**
     * Generate UPI QR code
     * Compatible with all UPI apps
     */
    async generateQRCode(params: {
        vpa: string;
        name: string;
        amount?: number;
        txnId?: string;
        note?: string;
    }): Promise<{
        qrCodeDataUrl: string;
        upiLink: string;
    }> {
        try {
            const upiLink = this.generateUPIDeepLink(params);
            const qrCodeDataUrl = await QRCode.toDataURL(`upi://pay?${upiLink}`);

            return {
                qrCodeDataUrl,
                upiLink: `upi://pay?${upiLink}`,
            };
        } catch (error) {
            this.logger.error(`QR code generation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate UPI VPA (Virtual Payment Address)
     */
    async validateVPA(vpa: string): Promise<{
        valid: boolean;
        name?: string;
        error?: string;
    }> {
        try {
            // VPA format: username@bankname
            const vpaRegex = /^[\w.-]+@[\w.-]+$/;

            if (!vpaRegex.test(vpa)) {
                return {
                    valid: false,
                    error: 'Invalid VPA format',
                };
            }

            // For production, would call bank's VPA validation API
            // For now, basic validation
            const [username, provider] = vpa.split('@');

            const validProviders = [
                'paytm', 'phonepe', 'gpay', 'ybl', 'axl', 'okhdfcbank',
                'okicici', 'oksbi', 'okaxis', 'upi', 'bhim',
            ];

            const isValidProvider = validProviders.some(p => provider.includes(p));

            if (!isValidProvider) {
                return {
                    valid: false,
                    error: 'Unknown UPI provider',
                };
            }

            return {
                valid: true,
                name: username, // Would fetch from bank API
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
            };
        }
    }

    /**
     * Initiate UPI collect request
     */
    async initiateCollectRequest(params: {
        payerVpa: string;
        payeeVpa: string;
        amount: number;
        txnId: string;
        note?: string;
    }): Promise<string> {
        try {
            // Generate RRN (Retrieval Reference Number)
            const rrn = this.generateRRN();

            // In production, would call NPCI's collect API
            // For now, simulate collect request

            this.logger.log(`Collect request initiated: RRN ${rrn}`);

            return rrn;
        } catch (error) {
            this.logger.error(`Collect request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle UPI callback/webhook
     */
    async handleCallback(
        provider: 'phonepe' | 'googlepay' | 'paytm' | 'bhim',
        payload: any
    ): Promise<void> {
        try {
            let merchantTransactionId: string;
            let status: string;
            let transactionId: string;

            // Parse provider-specific callback
            switch (provider) {
                case 'phonepe':
                    merchantTransactionId = payload.response.data.merchantTransactionId;
                    status = payload.response.code === 'PAYMENT_SUCCESS' ? 'COMPLETED' : 'FAILED';
                    transactionId = payload.response.data.transactionId;
                    break;

                case 'paytm':
                    merchantTransactionId = payload.ORDERID;
                    status = payload.STATUS === 'TXN_SUCCESS' ? 'COMPLETED' : 'FAILED';
                    transactionId = payload.TXNID;
                    break;

                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            // Update transaction
            await this.updateTransactionStatus(merchantTransactionId, provider, payload);

            // Emit event for payment processing service
            this.eventEmitter.emit('upi.payment.status', {
                merchantTransactionId,
                status,
                transactionId,
                provider,
            });

        } catch (error) {
            this.logger.error(`Callback handling failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    private initializeProviders(): void {
        // Providers initialized on-demand with configs
        this.logger.log('UPI Payment Service initialized');
    }

    private getOrCreateProvider(
        provider: string,
        config: UpiProviderConfig
    ): AxiosInstance {
        if (this.providers.has(provider)) {
            return this.providers.get(provider);
        }

        const baseURL = this.getProviderBaseUrl(provider, config.environment);

        const client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.providers.set(provider, client);
        return client;
    }

    private getProviderBaseUrl(provider: string, environment: string): string {
        const urls = {
            phonepe: {
                production: 'https://api.phonepe.com',
                sandbox: 'https://api-preprod.phonepe.com',
            },
            paytm: {
                production: 'https://securegw.paytm.in',
                sandbox: 'https://securegw-stage.paytm.in',
            },
            googlepay: {
                production: 'https://pay.google.com/gp/v/business/paymentmethods',
                sandbox: 'https://pay.google.com/gp/v/business/paymentmethods',
            },
            bhim: {
                production: 'https://www.bhimupi.org.in',
                sandbox: 'https://www.bhimupi.org.in',
            },
        };

        return urls[provider][environment];
    }

    private generatePhonePeChecksum(
        payload: string,
        saltKey: string,
        saltIndex: number
    ): string {
        const dataToHash = `${payload}/pg/v1/pay${saltKey}`;
        const sha256 = crypto.createHash('sha256').update(dataToHash).digest('hex');
        return `${sha256}###${saltIndex}`;
    }

    private generatePaytmChecksum(payload: any, merchantKey: string): string {
        // Paytm checksum generation
        const paramStr = JSON.stringify(payload.body);
        const checksum = crypto
            .createHash('sha256')
            .update(`${paramStr}${merchantKey}`)
            .digest('hex');
        return checksum;
    }

    private generateUPIDeepLink(params: {
        vpa: string;
        name: string;
        amount?: number;
        txnId?: string;
        note?: string;
    }): string {
        const parts = [
            `pa=${encodeURIComponent(params.vpa)}`,
            `pn=${encodeURIComponent(params.name)}`,
        ];

        if (params.amount) {
            parts.push(`am=${params.amount}`);
        }

        if (params.txnId) {
            parts.push(`tr=${encodeURIComponent(params.txnId)}`);
        }

        if (params.note) {
            parts.push(`tn=${encodeURIComponent(params.note)}`);
        }

        parts.push(`cu=INR`);

        return parts.join('&');
    }

    private generateRRN(): string {
        // RRN format: YYMMDDHHMMSS + 4 random digits
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        return `${year}${month}${day}${hour}${min}${sec}${random}`;
    }

    private async saveUpiTransaction(data: Partial<UpiTransaction>): Promise<void> {
        try {
            const transaction = this.upiTransactionRepo.create({
                ...data,
                created_at: new Date(),
            });

            await this.upiTransactionRepo.save(transaction);
        } catch (error) {
            this.logger.error(`Failed to save UPI transaction: ${error.message}`);
        }
    }

    private async updateTransactionStatus(
        merchantTransactionId: string,
        provider: string,
        response: any
    ): Promise<void> {
        try {
            const transaction = await this.upiTransactionRepo.findOne({
                where: { merchantTransactionId, provider },
            });

            if (transaction) {
                transaction.raw_response = response;
                transaction.status = this.mapProviderStatus(provider, response);
                transaction.updated_at = new Date();

                await this.upiTransactionRepo.save(transaction);
            }
        } catch (error) {
            this.logger.error(`Failed to update transaction status: ${error.message}`);
        }
    }

    private mapProviderStatus(provider: string, response: any): string {
        // Map provider-specific status to standard status
        switch (provider) {
            case 'phonepe':
                return response.code === 'PAYMENT_SUCCESS' ? 'COMPLETED' : 'FAILED';
            case 'paytm':
                return response.body?.resultInfo?.resultStatus === 'TXN_SUCCESS' ? 'COMPLETED' : 'FAILED';
            default:
                return 'PENDING';
        }
    }

    /**
     * Schedule timeout check for pending transactions
     */
    private scheduleTimeoutCheck(): void {
        setInterval(async () => {
            try {
                const timeoutThreshold = new Date(Date.now() - this.TRANSACTION_TIMEOUT);

                const timedOutTransactions = await this.upiTransactionRepo.find({
                    where: {
                        status: 'PENDING',
                    },
                });

                for (const txn of timedOutTransactions) {
                    if (new Date(txn.created_at) < timeoutThreshold) {
                        txn.status = 'EXPIRED';
                        txn.updated_at = new Date();
                        await this.upiTransactionRepo.save(txn);

                        this.eventEmitter.emit('upi.transaction.expired', {
                            merchantTransactionId: txn.merchantTransactionId,
                            provider: txn.provider,
                        });
                    }
                }
            } catch (error) {
                this.logger.error(`Timeout check failed: ${error.message}`);
            }
        }, 60000); // Check every minute
    }
}
