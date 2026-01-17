import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { GlAccount } from './entities/gl-account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { GlEntry } from './entities/gl-entry.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BankTransaction } from './entities/bank-transaction.entity';
import { ReconciliationMatch } from './entities/reconciliation-match.entity';

// Services
import { GlPostingService } from './services/gl-posting.service';
import { BankFeedService } from './services/bank-feed.service';
import { ReconciliationService } from './services/reconciliation.service';
import { SuspenseService } from './services/suspense.service';
import { AiFuzzyMatchingService } from './services/ai-fuzzy-matching.service';
import { TransactionParserService } from './services/transaction-parser.service';

// Controllers
import { GlPostingController } from './controllers/gl-posting.controller';
import { BankFeedController } from './controllers/bank-feed.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { FinancialReportingController } from './controllers/financial-reporting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GlAccount,
      JournalEntry,
      GlEntry,
      BankAccount,
      BankTransaction,
      ReconciliationMatch
    ])
  ],
  controllers: [
    GlPostingController,
    BankFeedController,
    ReconciliationController,
    FinancialReportingController
  ],
  providers: [
    GlPostingService,
    BankFeedService,
    ReconciliationService,
    SuspenseService,
    AiFuzzyMatchingService,
    TransactionParserService
  ],
  exports: [
    GlPostingService,
    BankFeedService,
    ReconciliationService,
    SuspenseService,
    AiFuzzyMatchingService,
    TransactionParserService
  ]
})
export class Module17ReconciliationGlModule { }
