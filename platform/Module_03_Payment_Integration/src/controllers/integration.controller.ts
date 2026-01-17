import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { IntegrationService } from '../services/integration.service';

@Controller('payment/integrations')
export class IntegrationController {
    constructor(private readonly integrationService: IntegrationService) { }

    @Get()
    async getIntegrations() {
        return { status: 'active', integrations: [] };
    }

    @Post(':type/sync')
    async syncIntegration(@Param('type') type: string, @Body() data: any) {
        return { success: true, message: `Sync started for ${type}` };
    }
}