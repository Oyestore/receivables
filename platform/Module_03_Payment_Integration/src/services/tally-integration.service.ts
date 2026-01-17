import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TallyIntegrationService {
    private readonly logger = new Logger(TallyIntegrationService.name);

    async sync() {
        this.logger.log('Syncing with Tally...');
        return { success: true };
    }
}