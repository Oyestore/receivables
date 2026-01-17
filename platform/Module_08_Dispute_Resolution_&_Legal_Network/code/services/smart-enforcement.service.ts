import { Injectable, Logger } from '@nestjs/common';

export interface SmartClause {
    id: string;
    triggerCondition: string;
    penaltyPercent: number;
}

export interface EnforcementRecord {
    id: string;
    status: 'PROVISIONAL_24H' | 'CONTESTED' | 'EXECUTED' | 'WAIVED';
    penaltyAmount: number;
    evidenceHash: string;
    unlockTime: Date;
}

@Injectable()
export class SmartEnforcementService {
    private readonly logger = new Logger(SmartEnforcementService.name);

    /**
     * Triggers a Smart Clause enforcement.
     * STRICT INTEGRITY: Enters 24h Provisional State. Never executes instantly.
     */
    async triggerEnforcement(invoiceId: string, clause: SmartClause, evidenceData: string): Promise<EnforcementRecord> {
        this.logger.log(`Triggering Smart Clause for Invoice ${invoiceId}`);

        // 1. Calculate Penalty
        const penaltyAmount = 1000 * (clause.penaltyPercent / 100); // Mock calculation

        // 2. Hash Evidence (Immutable Audit Trail)
        const evidenceHash = Buffer.from(evidenceData).toString('base64'); // Simple mock hash

        // 3. Create Provisional Record (The "Safety Brake")
        const enforcement: EnforcementRecord = {
            id: `enf_${Date.now()}`,
            status: 'PROVISIONAL_24H',
            penaltyAmount,
            evidenceHash,
            unlockTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // +24 Hours
        };

        // 4. Notify Humans (HITL)
        this.notifyParties(invoiceId, enforcement);

        return enforcement;
    }

    private notifyParties(invoiceId: string, record: EnforcementRecord) {
        this.logger.log(`ALERT: 24h Appeal Window open for Invoice ${invoiceId}. Penalty: ${record.penaltyAmount}`);
    }

    /**
     * Seller contests the penalty during the Appeal Window.
     */
    async contestEnforcement(enforcementId: string, reason: string) {
        this.logger.log(`Enforcement ${enforcementId} CONTESTED: ${reason}`);
        // Logic to pause timer and summon M08 Mediator
        return { status: 'CONTESTED', nextStep: 'AI_ARBITRATION' };
    }
}
