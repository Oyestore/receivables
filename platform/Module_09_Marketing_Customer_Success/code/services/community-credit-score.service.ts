import { Injectable } from '@nestjs/common';

@Injectable()
export class CommunityCreditScoreService {

    async calculateADP(entityId: string): Promise<number> {
        // Mock ADP (Average Days to Pay) calculation
        // In real implementation, this would query the Payment History table
        return 14.5; // Pays in 14.5 days on average
    }

    async getBadge(entityId: string): Promise<string | null> {
        const adp = await this.calculateADP(entityId);

        if (adp < 5) return 'INSTANT_PAYER';
        if (adp < 15) return 'FAST_PAYER';
        if (adp < 30) return 'RELIABLE';

        return null;
    }
}
