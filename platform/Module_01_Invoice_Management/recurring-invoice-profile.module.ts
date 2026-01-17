import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecurringInvoiceProfile } from "./entities/recurring-invoice-profile.entity";
import { RecurringInvoiceProfileService } from "./services/recurring-invoice-profile.service";
import { RecurringInvoiceProfileController } from "./controllers/recurring-invoice-profile.controller";
import { InvoiceModule } from "../invoices/invoice.module"; // Import InvoiceModule to use InvoiceService

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringInvoiceProfile]),
    InvoiceModule, // Make InvoiceService available
  ],
  providers: [RecurringInvoiceProfileService],
  controllers: [RecurringInvoiceProfileController],
  exports: [RecurringInvoiceProfileService] // Export if other modules need to use this service
})
export class RecurringInvoiceProfileModule {}

