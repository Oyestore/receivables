import { Injectable, Logger } from '@nestjs/common';

export interface PhysicalMailOptions {
    recipientName: string;
    addressLine1: string;
    city: string;
    zipCode: string;
    pdfUrl: string;
}

@Injectable()
export class PhysicalMailService {
    private readonly logger = new Logger(PhysicalMailService.name);

    /**
     * Send a physical invoice via PostGrid/Lob (Mock)
     */
    async sendPhysicalInvoice(options: PhysicalMailOptions): Promise<{ id: string, status: string }> {
        this.logger.log(`Sending Physical Mail to ${options.recipientName} at ${options.city}`);

        // Mock API Call to Mailing Provider
        // const response = await axios.post('https://api.lob.com/v1/letters', ...);

        return {
            id: 'mail_' + Math.random().toString(36).substr(2, 9),
            status: 'IN_TRANSIT'
        };
    }

    /**
     * Check delivery status
     */
    async checkDeliveryStatus(mailId: string): Promise<string> {
        return 'DELIVERED'; // Mock response
    }
}
