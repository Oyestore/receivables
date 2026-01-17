import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OcrIntegrationService } from "./services/ocr-integration.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // Default timeout for HTTP requests
      maxRedirects: 5, // Default max redirects
    }),
  ],
  providers: [OcrIntegrationService],
  exports: [OcrIntegrationService], // Export if other modules need to use this service
})
export class OcrIntegrationModule {}

