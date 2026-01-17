import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ErpAdapter, GlEntryDto, SyncResult } from './erp/erp-adapter.interface';
import { SapAdapterService } from './erp/sap-adapter.service';
import { TallyAdapterService } from './erp/tally-adapter.service';

@Injectable()
export class ErpIntegrationService {
    private readonly logger = new Logger(ErpIntegrationService.name);

    constructor(
        private readonly sapAdapter: SapAdapterService,
        private readonly tallyAdapter: TallyAdapterService
    ) { }

    private getAdapter(erpType: string): ErpAdapter {
        switch (erpType.toLowerCase()) {
            case 'sap': return this.sapAdapter;
            case 'tally': return this.tallyAdapter;
            default: throw new BadRequestException(`Unsupported ERP Type: ${erpType}`);
        }
    }

    async syncGlEntry(tenantId: string, erpConfig: { type: string }, entry: GlEntryDto): Promise<SyncResult> {
        this.logger.log(`Syncing GL Entry ${entry.id} for Tenant ${tenantId} to ${erpConfig.type}`);
        try {
            const adapter = this.getAdapter(erpConfig.type);
            return await adapter.postGlEntry(entry);
        } catch (error) {
            this.logger.error(`Failed to sync to ERP: ${error.message}`);
            return { success: false, errors: [error.message] };
        }
    }
}
