import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { ReconciliationService } from '../services/reconciliation.service';
import { SuspenseService } from '../services/suspense.service';
import { AiFuzzyMatchingService } from '../services/ai-fuzzy-matching.service';
import { TransactionParserService } from '../services/transaction-parser.service';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly suspenseService: SuspenseService,
    private readonly aiFuzzyMatchingService: AiFuzzyMatchingService,
    private readonly transactionParserService: TransactionParserService
  ) { }

  @Post('run/:tenantId')
  async runAutoReconciliation(@Param('tenantId') tenantId: string) {
    return this.reconciliationService.runAutoReconciliation(tenantId);
  }

  @Post('ai-enhanced/:tenantId')
  async runAiReconciliation(
    @Param('tenantId') tenantId: string,
    @Body() config?: any
  ) {
    return this.reconciliationService.runAiReconciliation(tenantId, config);
  }

  @Post('suspense/:txnId')
  async moveToSuspense(
    @Param('txnId') txnId: string,
    @Body() body: { accountId: string, userId: string }
  ) {
    return this.suspenseService.moveToSuspense(txnId, body.accountId, body.userId);
  }

  @Post('parse-statement/:bankAccountId')
  async parseStatement(
    @Param('bankAccountId') bankAccountId: string,
    @Body() body: { content: string, format: string }
  ) {
    return this.transactionParserService.parseStatement(
      body.content,
      body.format,
      bankAccountId
    );
  }

  @Post('parse-csv/:bankAccountId')
  async parseCsvStatement(
    @Param('bankAccountId') bankAccountId: string,
    @Body() body: { csvContent: string }
  ) {
    return this.transactionParserService.parseCsvStatement(
      body.csvContent,
      bankAccountId
    );
  }

  @Get('analytics/:tenantId')
  async getAnalytics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reconciliationService.getReconciliationAnalytics(tenantId, start, end);
  }

  @Post('fuzzy-match/:transactionId')
  async findFuzzyMatches(
    @Param('transactionId') transactionId: string,
    @Body() config?: any
  ) {
    return this.aiFuzzyMatchingService.findFuzzyMatches(transactionId, config);
  }

  @Post('predictive-match/:transactionId')
  async findPredictiveMatches(@Param('transactionId') transactionId: string) {
    return this.aiFuzzyMatchingService.findPredictiveMatches(transactionId);
  }
}
