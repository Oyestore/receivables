import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RuralPaymentService {
    private readonly logger = new Logger(RuralPaymentService.name);

    /**
     * Generate an SMS Payment Link (Offline/Low-Bandwidth friendly)
     */
    generateSMSPaymentLink(invoiceId: string, amount: number): string {
        // Logic to generate a short link
        const baseUrl = process.env.PAYMENT_LINK_BASE_URL || 'https://pay.sme.io';
        return `${baseUrl}/i/${invoiceId}?amt=${amount}`;
    }

    /**
     * Mock processing of a USSD payment request
     * In reality, this would integrate with a telecom provider's USSD gateway
     */
    async processUSSDRequest(
        phoneNumber: string,
        shortCode: string,
        input: string
    ): Promise<string> {
        this.logger.log(`Processing USSD request from ${phoneNumber}: ${input}`);

        // Simple menu logic for demonstration
        if (input === '*123#') {
            return 'Welcome to SME Pay\n1. Pay Invoice\n2. Check Balance';
        } else if (input === '1') {
            return 'Enter Invoice ID:';
        } else {
            return 'Invalid option';
        }
    }

    /**
     * Send Payment Reminder via SMS (Integration stub)
     */
    async sendOfflineReminder(phoneNumber: string, message: string): Promise<boolean> {
        this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);
        // Integration with SMS Provider would go here
        return true;
    }
}
