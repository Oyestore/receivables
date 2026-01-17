import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ZohoBooksIntegrationService {
    private readonly logger = new Logger(ZohoBooksIntegrationService.name);

    async syncInvoices() {
        this.logger.log('Syncing invoices with Zoho Books...');
        return { success: true, message: 'Sync not implemented yet' };
    }
}