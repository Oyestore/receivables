import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InvoiceTemplate } from "./entities/invoice-template.entity";
import { TemplateService } from "./services/template.service";
import { TemplateController } from "./controllers/template.controller";
import { PdfGenerationModule } from "../pdf-generation/pdf-generation.module"; // Import PdfGenerationModule

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceTemplate]),
    PdfGenerationModule, // Add PdfGenerationModule to imports
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService], // Export if other modules need to use TemplateService
})
export class TemplateModule {}

