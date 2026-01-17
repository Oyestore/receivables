import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { InvoiceAdapter } from './adapters/invoice.adapter';
import { PaymentAdapter } from './adapters/payment.adapter';
import { CreditAdapter } from './adapters/credit.adapter';
import { CommunicationAdapter } from './adapters/communication.adapter';
import { AnalyticsAdapter } from './adapters/analytics.adapter';

@Module({
    imports: [
        HttpModule.register({
            timeout: 10000, // 10 seconds
            maxRedirects: 3,
        }),
        ConfigModule,
    ],
    providers: [
        InvoiceAdapter,
        PaymentAdapter,
        CreditAdapter,
        CommunicationAdapter,
        AnalyticsAdapter,
    ],
    exports: [
        InvoiceAdapter,
        PaymentAdapter,
        CreditAdapter,
        CommunicationAdapter,
        AnalyticsAdapter,
    ],
})
export class IntegrationModule { }
