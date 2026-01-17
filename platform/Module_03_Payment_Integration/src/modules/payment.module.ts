import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { PaymentGateway } from '../entities/payment-gateway.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentReconciliation } from '../entities/payment-reconciliation.entity';
import { VirtualAccount } from '../entities/virtual-account.entity';

// Services
import { PaymentGatewayFactory } from '../services/payment-gateway-factory.service';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { InvoicePaymentIntegrationService } from '../services/invoice-payment-integration.service';
import { DistributionPaymentIntegrationService } from '../services/distribution-payment-integration.service';
import { UPIIntegrationService } from '../services/upi-integration.service';
import { RuralPaymentService } from '../services/rural-payment.service';
import { VirtualAccountService } from '../services/virtual-account.service';
import { FinancingProviderIntegrationService } from '../services/financing-provider-integration.service';
import { SMSPaymentService } from '../services/sms-payment.service';
import { PaymentWebhookService } from '../services/payment-webhook.service';

// Controllers
import { PaymentGatewayController } from '../controllers/payment-gateway.controller';
import { PaymentMethodController } from '../controllers/payment-method.controller';
import { PaymentTransactionController } from '../controllers/payment-transaction.controller';
import { PaymentWebhookController } from '../controllers/payment-webhook.controller';
import { SMSPaymentController } from '../controllers/sms-payment.controller';

import { AdvancedPaymentModule } from './advanced-payment-phase3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentGateway,
      PaymentMethod,
      PaymentTransaction,
      PaymentReconciliation,
      VirtualAccount,
    ]),
    ConfigModule,
    EventEmitterModule.forRoot(),
    AdvancedPaymentModule,
  ],
  controllers: [
    PaymentGatewayController,
    PaymentMethodController,
    PaymentTransactionController,
    PaymentWebhookController,
    SMSPaymentController,
  ],
  providers: [
    PaymentGatewayFactory,
    PaymentProcessingService,
    InvoicePaymentIntegrationService,
    DistributionPaymentIntegrationService,
    UPIIntegrationService,
    RuralPaymentService,
    VirtualAccountService,
    FinancingProviderIntegrationService,
    SMSPaymentService,
    PaymentWebhookService,
  ],
  exports: [
    PaymentProcessingService,
    InvoicePaymentIntegrationService,
    DistributionPaymentIntegrationService,
    UPIIntegrationService,
    RuralPaymentService,
    VirtualAccountService,
    FinancingProviderIntegrationService,
    SMSPaymentService,
  ],
})
export class PaymentModule { }
