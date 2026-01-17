import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SMSPaymentService {
    private readonly logger = new Logger(SMSPaymentService.name);

    constructor(private readonly eventEmitter: EventEmitter2) { }

    /**
     * Send a Payment Link via SMS by delegating to Module 02
     */
    async sendPaymentLink(phoneNumber: string, invoiceId: string, amount: number, paymentLink: string): Promise<boolean> {
        if (!this.validatePhoneNumber(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        const message = `Please pay INR ${amount} for Invoice ${invoiceId}. Link: ${paymentLink}`;

        this.logger.log(`Delegating SMS for ${phoneNumber} to Distribution Module`);

        // Emit event for Module 02 (Intelligent Distribution) to pick up
        this.eventEmitter.emit('distribution.command.send_sms', {
            to: phoneNumber,
            body: message,
            metadata: { source: 'Module_03', invoiceId }
        });

        return true;
    }

    private validatePhoneNumber(phone: string): boolean {
        return /^\+?[1-9]\d{1,14}$/.test(phone);
    }
}