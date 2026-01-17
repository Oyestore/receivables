import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { ForexRate } from './entities/forex-rate.entity';
import { EscrowTransaction } from './entities/escrow-transaction.entity';
import { ShippingOrder } from './entities/shipping-order.entity';
import { LetterOfCredit } from './entities/letter-of-credit.entity';
import { TradeCompliance } from './entities/trade-compliance.entity';

// Services
import { ForexService } from './services/forex.service';
import { EscrowService } from './services/escrow.service';
import { ShippingService } from './services/shipping.service';
import { TradeFinanceService } from './services/trade-finance.service';
import { ComplianceService } from './services/compliance.service';
import { CrossBorderTradeService } from './services/cross-border-trade.service';

// Controllers
import { ForexController } from './controllers/forex.controller';
import { EscrowController } from './controllers/escrow.controller';
import { ShippingController } from './controllers/shipping.controller';
import { TradeFinanceController } from './controllers/trade-finance.controller';
import { ComplianceController } from './controllers/compliance.controller';

// DTOs
import { CreateEscrowTransactionDto } from './dto/create-escrow-transaction.dto';
import { CreateShippingOrderDto } from './dto/create-shipping-order.dto';
import { CreateLetterOfCreditDto } from './dto/create-letter-of-credit.dto';
import { ForexRateDto } from './dto/forex-rate.dto';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForexRate,
      EscrowTransaction,
      ShippingOrder,
      LetterOfCredit,
      TradeCompliance,
    ]),
    ConfigModule,
  ],
  controllers: [
    ForexController,
    EscrowController,
    ShippingController,
    TradeFinanceController,
    ComplianceController,
  ],
  providers: [
    ForexService,
    EscrowService,
    ShippingService,
    TradeFinanceService,
    ComplianceService,
    CrossBorderTradeService,
  ],
  exports: [
    ForexService,
    EscrowService,
    ShippingService,
    TradeFinanceService,
    ComplianceService,
    CrossBorderTradeService,
  ],
})
export class Module13CrossBorderTradeModule {}
