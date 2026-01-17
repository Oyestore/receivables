import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { BankFeedService } from '../services/bank-feed.service';

@Controller('bank-feed')
export class BankFeedController {
    constructor(private readonly bankFeedService: BankFeedService) { }

    @Post('account/:id/import')
    async importTransactions(@Param('id') id: string, @Body('transactions') transactions: any[]) {
        return this.bankFeedService.importTransactions(id, transactions);
    }

    @Get('account/:id/pending')
    async getPendingTransactions(@Param('id') id: string) {
        return this.bankFeedService.getUnreconciledTransactions(id);
    }
}
