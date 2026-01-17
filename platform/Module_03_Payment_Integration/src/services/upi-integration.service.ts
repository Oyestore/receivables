import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayFactory } from './payment-gateway-factory.service';

@Injectable()
export class UPIIntegrationService {
    private readonly logger = new Logger(UPIIntegrationService.name);

    constructor(
        private readonly gatewayFactory: PaymentGatewayFactory,
    ) { }

    /**
     * Validate a VPA (Virtual Payment Address)
     */
    validateVPA(vpa: string): boolean {
        const vpaRegex = /^[\w\.\-]+@[\w\.\-]+$/; // Basic VPA regex
        return vpaRegex.test(vpa);
    }

    /**
     * Initiate a UPI Collect Request
     */
    async initiateCollectRequest(
        payerVpa: string,
        amount: number,
        transactionId: string,
        description: string,
        gatewayId: string
    ): Promise<any> {
        if (!this.validateVPA(payerVpa)) {
            throw new Error('Invalid VPA format');
        }

        const gateway = await this.gatewayFactory.getGatewayService(gatewayId);
        if (!gateway) {
            throw new Error('Payment Gateway not found');
        }

        this.logger.log(`Initiating UPI Collect for ${payerVpa} via ${gatewayId}`);

        // In a real scenario, we would call gateway.initiateUPI(params)
        // Assuming generic initiatePayment handles type checking or we extend interface
        return {
            success: true,
            message: 'UPI Collect request initiated',
            transactionId,
            status: 'PENDING_PAYER_APPROVAL'
        };
    }

    /**
     * Generate a Dynamic UPI QR Code string
     */
    generateDynamicQR(
        payeeVpa: string,
        payeeName: string,
        amount: number,
        transactionRef: string,
        description: string
    ): string {
        // UPI URL format: upi://pay?pa=...&pn=...&am=...&tr=...&tn=...
        const params = new URLSearchParams({
            pa: payeeVpa,
            pn: payeeName,
            am: amount.toFixed(2),
            tr: transactionRef,
            tn: description,
            cu: 'INR' // Assuming INR for UPI
        });

        return `upi://pay?${params.toString()}`;
    }
}