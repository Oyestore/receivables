import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SMSPaymentService } from '../services/sms-payment.service';

@Controller('payments/sms')
export class SMSPaymentController {
    constructor(private readonly smsService: SMSPaymentService) { }

    @Post('send-link')
    async sendPaymentLink(@Body() body: { phone: string; invoiceId: string; amount: number; link: string }) {
        return await this.smsService.sendPaymentLink(body.phone, body.invoiceId, body.amount, body.link);
    }
}