import { Controller, Post, Body, Param, Headers, HttpCode } from '@nestjs/common';
import { PaymentWebhookService } from '../services/payment-webhook.service';

@Controller('payments/webhooks')
export class PaymentWebhookController {
    constructor(private readonly webhookService: PaymentWebhookService) { }

    @Post(':provider')
    @HttpCode(200)
    async handleWebhook(
        @Param('provider') provider: string,
        @Body() payload: any,
        @Headers('x-webhook-signature') signature: string
    ) {
        return await this.webhookService.handleWebhook(provider, payload, signature);
    }
}
