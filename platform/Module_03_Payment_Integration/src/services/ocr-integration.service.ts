import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios"; // Ensure HttpModule is imported in the module
import { firstValueFrom } from "rxjs";
import FormData from "form-data";
import { Readable } from "stream";

@Injectable()
export class OcrIntegrationService {
  private readonly logger = new Logger(OcrIntegrationService.name);
  private readonly ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:5001/api/v1/ocr/extract-text";

  constructor(private readonly httpService: HttpService) {}

  async extractTextFromImage(file: Express.Multer.File): Promise<string | null> {
    const formData = new FormData();
    const stream = Readable.from(file.buffer);
    formData.append("file", stream, {
        filename: file.originalname,
        contentType: file.mimetype,
    });

    try {
      this.logger.log(`Sending image ${file.originalname} to OCR service at ${this.ocrServiceUrl}`);
      const response = await firstValueFrom(
        this.httpService.post(this.ocrServiceUrl, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000, // 30 seconds timeout
        }),
      );
      this.logger.log(`Received response from OCR service for ${file.originalname}`);
      return response.data.extracted_text;
    } catch (error) {
      this.logger.error(`Error calling OCR service for ${file.originalname}: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`OCR service response error: ${JSON.stringify(error.response.data)}`);
      }
      // Consider more specific error handling based on OCR service responses
      throw new InternalServerErrorException("Failed to extract text using OCR service. " + error.message);
    }
  }
}

