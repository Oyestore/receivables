import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invoice } from "./entities/invoice.entity";
import { InvoiceLineItem } from "./entities/invoice-line-item.entity";
import { InvoiceService } from "./services/invoice.service";
import { InvoiceController } from "./controllers/invoice.controller";
import { OcrIntegrationModule } from "../ocr-integration/ocr-integration.module"; // Import OcrIntegrationModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLineItem]),
    OcrIntegrationModule, // Add OcrIntegrationModule to imports
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService]
})
export class InvoiceModule {}

