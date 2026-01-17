"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcrIntegrationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios"); // Ensure HttpModule is imported in the module
const rxjs_1 = require("rxjs");
const form_data_1 = __importDefault(require("form-data"));
const stream_1 = require("stream");
let OcrIntegrationService = OcrIntegrationService_1 = class OcrIntegrationService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(OcrIntegrationService_1.name);
        this.ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:5001/api/v1/ocr/extract-text";
    }
    async extractTextFromImage(file) {
        const formData = new form_data_1.default();
        const stream = stream_1.Readable.from(file.buffer);
        formData.append("file", stream, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        try {
            this.logger.log(`Sending image ${file.originalname} to OCR service at ${this.ocrServiceUrl}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(this.ocrServiceUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000, // 30 seconds timeout
            }));
            this.logger.log(`Received response from OCR service for ${file.originalname}`);
            return response.data.extracted_text;
        }
        catch (error) {
            this.logger.error(`Error calling OCR service for ${file.originalname}: ${error.message}`, error.stack);
            if (error.response) {
                this.logger.error(`OCR service response error: ${JSON.stringify(error.response.data)}`);
            }
            // Consider more specific error handling based on OCR service responses
            throw new common_1.InternalServerErrorException("Failed to extract text using OCR service. " + error.message);
        }
    }
};
exports.OcrIntegrationService = OcrIntegrationService;
exports.OcrIntegrationService = OcrIntegrationService = OcrIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object])
], OcrIntegrationService);
//# sourceMappingURL=ocr-integration.service.js.map