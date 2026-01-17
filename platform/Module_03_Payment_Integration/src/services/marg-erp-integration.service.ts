import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MargErpIntegrationService {
    private readonly logger = new Logger(MargErpIntegrationService.name);

    async sync() {
        this.logger.log('Syncing with Marg ERP...');
        return { success: true };
    }
}