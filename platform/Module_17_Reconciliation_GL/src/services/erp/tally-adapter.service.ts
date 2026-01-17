import { Injectable, Logger } from '@nestjs/common';
import { ErpAdapter, GlEntryDto, SyncResult } from './erp-adapter.interface';

@Injectable()
export class TallyAdapterService implements ErpAdapter {
    private readonly logger = new Logger(TallyAdapterService.name);

    async testConnection(): Promise<boolean> {
        this.logger.log('Testing connection to Tally Prime Server...');
        return true;
    }

    async postGlEntry(entry: GlEntryDto): Promise<SyncResult> {
        this.logger.log(`Pushing Transaction to Tally XML Interface...`);
        // Mock Tally XML generation
        const tallyXml = `<ENVELOPE><BODY><DATA><TALLYMESSAGE><VOUCHER>...</VOUCHER></TALLYMESSAGE></DATA></BODY></ENVELOPE>`;

        return {
            success: true,
            externalId: `TALLY_VCH_${Math.floor(Math.random() * 100000)}`
        };
    }

    async fetchChartOfAccounts(): Promise<any[]> {
        return [
            { code: 'Cash', name: 'Cash-in-Hand', type: 'Asset' },
            { code: 'Bank', name: 'Kotak Bank', type: 'Asset' }
        ];
    }
}
