import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountOffer } from './entities/discount-offer.entity';
import { DiscountService } from './services/discount.service';
import { DiscountController } from './controllers/discount.controller';
import { InvoiceModule } from '../../Module_01_Invoice_Management/src/invoice.module';
import { PaymentModule } from '../../Module_03_Payment_Integration/src/modules/payment.module';
import { BuyerCreditScoringModule } from '../../Module_06_Credit_Scoring/buyer-credit-scoring.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DiscountOffer]),
        InvoiceModule,
        PaymentModule,
        BuyerCreditScoringModule,
    ],
    controllers: [DiscountController],
    providers: [DiscountService],
    exports: [DiscountService],
})
export class DynamicDiscountingModule { }
