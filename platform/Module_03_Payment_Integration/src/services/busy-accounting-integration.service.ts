import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BusyAccountingIntegrationService {
    private readonly logger = new Logger(BusyAccountingIntegrationService.name);

    async sync() {
        this.logger.log('Syncing with Busy Accounting...');
        return { success: true };
    }
}