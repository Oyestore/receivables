import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentProcessingService } from './payment-processing.service';

@Injectable()
export class PaymentWebhookService {
    private readonly logger = new Logger(PaymentWebhookService.name);

    constructor(
        private readonly paymentService: PaymentProcessingService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async handleWebhook(provider: string, payload: any, signature: string): Promise<any> {
        this.logger.log(`Received webhook from ${provider}`);

        // 1. Verify Signature (Mock logic)
        if (!this.verifySignature(provider, payload, signature)) {
            throw new BadRequestException('Invalid Webhook Signature');
        }

        // 2. Parse Status
        const eventType = this.extractEventType(provider, payload);
        const transactionId = this.extractTransactionId(provider, payload);

        this.logger.log(`Processing ${eventType} for transaction ${transactionId}`);

        // 3. Update Transaction
        if (eventType === 'PAYMENT_SUCCESS') {
            await this.paymentService.processPaymentSuccess(transactionId, payload);
            this.eventEmitter.emit('payment.received', { transactionId, provider, payload });
        } else if (eventType === 'PAYMENT_FAILED') {
            await this.paymentService.processPaymentFailure(transactionId, payload);
            this.eventEmitter.emit('payment.failed', { transactionId, provider, payload });
        }

        return { received: true };
    }

    private verifySignature(provider: string, payload: any, signature: string): boolean {
        // Real implementation would use crypto.createHmac
        return true;
    }

    private extractEventType(provider: string, payload: any): string {
        // Normalized event extraction
        if (provider === 'razorpay') {
            return payload.event === 'payment.captured' ? 'PAYMENT_SUCCESS' : 'UNKNOWN';
        }
        if (provider === 'stripe') {
            return payload.type === 'payment_intent.succeeded' ? 'PAYMENT_SUCCESS' : 'UNKNOWN';
        }
        return 'UNKNOWN';
    }

    private extractTransactionId(provider: string, payload: any): string {
        if (provider === 'razorpay') return payload.payload.payment.entity.notes.transactionId;
        if (provider === 'stripe') return payload.data.object.metadata.transactionId;
        return null;
    }
}
