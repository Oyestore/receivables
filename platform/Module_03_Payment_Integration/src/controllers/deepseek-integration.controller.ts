import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentPredictionService } from '../services/payment-prediction.service';

@Controller('payment/ai')
export class DeepSeekIntegrationController {
    constructor(private readonly predictionService: PaymentPredictionService) { }

    @Post('predict-success')
    async predictSuccess(@Body() data: any) {
        try {
            const result = await this.predictionService.generatePaymentPrediction(
                data.customerId,
                data.tenantId,
                data.customerProfile,
                data.behaviorAnalysis,
                data.options
            );
            return result;
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}