import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { VerificationService } from '../services/verification.service';

@Controller('marketing/verification')
export class VerificationController {
    constructor(private readonly service: VerificationService) { }

    @Post('invite')
    async invite(@Body() body: { tenantId: string, email: string, name: string }) {
        return this.service.createRequest(body.tenantId, body.email, body.name);
    }

    @Post(':id/submit')
    async submit(@Param('id') id: string, @Body() body: { rating: number, comments: string }) {
        return this.service.submitVerification(id, body.rating, body.comments);
    }
}
