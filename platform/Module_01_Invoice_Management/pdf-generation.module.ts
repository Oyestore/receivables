import { Module } from "@nestjs/common";
import { PdfGenerationService } from "./services/pdf-generation.service";
import { ConditionalLogicModule } from "../conditional-logic/conditional-logic.module";
import { UserDataSourceModule } from "../user-data-sources/user-data-source.module"; // Import UserDataSourceModule

@Module({
  imports: [
    ConditionalLogicModule, 
    UserDataSourceModule // Add UserDataSourceModule to imports
  ],
  providers: [PdfGenerationService],
  exports: [PdfGenerationService],
})
export class PdfGenerationModule {}

