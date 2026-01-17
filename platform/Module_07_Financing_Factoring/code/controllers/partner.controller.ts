import { Controller, Get, Post, Put, Param, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PartnerIntegrationService } from '../services/partner-integration.service';

@Controller('api/v1/financing/partners')
export class PartnerController {
    constructor(private readonly partnerService: PartnerIntegrationService) { }

    /**
     * Get all active financing partners
     */
    @Get()
    async getPartners() {
        return this.partnerService.getActivePartners();
    }

    /**
     * Get partner by ID
     */
    @Get(':partnerId')
    async getPartner(@Param('partnerId') partnerId: string) {
        return this.partnerService.getPartnerById(partnerId);
    }

    /**
     * Compare partners for requested amount
     */
    @Get('compare/:amount')
    async comparePartners(@Param('amount') amount: string) {
        return this.partnerService.comparePartners(parseFloat(amount));
    }

    /**
     * Get partner analytics
     */
    @Get(':partnerId/analytics')
    async getAnalytics(@Param('partnerId') partnerId: string) {
        return this.partnerService.getPartnerAnalytics(partnerId);
    }

    /**
     * Create new financing application
     */
    @Post('applications')
    @HttpCode(HttpStatus.CREATED)
    async createApplication(@Body() body: any) {
        return this.partnerService.createApplication(body);
    }

    /**
     * Submit application to partner
     */
    @Post('applications/:applicationId/submit')
    @HttpCode(HttpStatus.OK)
    async submitApplication(@Param('applicationId') applicationId: string) {
        return this.partnerService.submitApplication(applicationId);
    }

    /**
     * Get application by ID
     */
    @Get('applications/:applicationId')
    async getApplication(@Param('applicationId') applicationId: string) {
        return this.partnerService.getApplicationById(applicationId);
    }

    /**
     * Get user's applications
     */
    @Get('applications/user/:userId')
    async getUserApplications(@Param('userId') userId: string) {
        return this.partnerService.getUserApplications(userId);
    }

    /**
     * Check application status
     */
    @Get('applications/:applicationId/status')
    async checkStatus(@Param('applicationId') applicationId: string) {
        return this.partnerService.checkApplicationStatus(applicationId);
    }

    /**
     * Handle partner webhook
     */
    @Post('webhook/:partnerId')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Param('partnerId') partnerId: string,
        @Body() payload: any,
        @Headers('x-webhook-signature') signature: string,
    ) {
        await this.partnerService.handleWebhook(partnerId, payload, signature);
        return { message: 'Webhook processed successfully' };
    }
}
