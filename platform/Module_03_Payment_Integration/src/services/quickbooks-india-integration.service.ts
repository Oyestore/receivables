import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuickbooksIndiaIntegrationService {
    private readonly logger = new Logger(QuickbooksIndiaIntegrationService.name);

    async sync() {
        this.logger.log('Syncing with QuickBooks India...');
        return { success: true };
    }
}