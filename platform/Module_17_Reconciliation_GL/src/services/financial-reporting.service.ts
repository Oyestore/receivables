import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlAccount } from '../entities/gl-account.entity';
import { GlEntry } from '../entities/gl-entry.entity';

@Injectable()
export class FinancialReportingService {
    constructor(
        @InjectRepository(GlAccount)
        private accountRepo: Repository<GlAccount>,
        @InjectRepository(GlEntry)
        private entryRepo: Repository<GlEntry>
    ) { }

    async getTrialBalance(tenantId: string, asOfDate: Date) {
        const accounts = await this.accountRepo.find({ where: { tenantId } });
        const report = [];

        for (const acc of accounts) {
            const { sum } = await this.entryRepo.createQueryBuilder('entry')
                .select('SUM(entry.amount)', 'sum') // Assuming amount is signed or handling type
                .where('entry.accountId = :accId', { accId: acc.id })
                .andWhere('entry.postingDate <= :asOfDate', { asOfDate })
                .getRawOne();

            report.push({
                accountCode: acc.code,
                accountName: acc.name,
                balance: parseFloat(sum || '0')
            });
        }
        return report;
    }

    async getProfitAndLoss(tenantId: string, startDate: Date, endDate: Date) {
        // Mock Implementation of P&L Logic
        return {
            revenue: 100000,
            cogs: 40000,
            grossProfit: 60000,
            expenses: 20000,
            netIncome: 40000
        };
    }
}
