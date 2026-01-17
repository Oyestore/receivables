import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DynamicTermsManagementService } from './dynamic-terms-management.service';

@Controller('credit-scoring/dynamic-terms')
export class DynamicTermsController {
    constructor(private readonly termsService: DynamicTermsManagementService) { }

    @Get(':organizationId/customer/:customerId')
    async getCustomerTerms(
        @Param('organizationId') organizationId: string,
        @Param('customerId') customerId: string
    ) {
        return await this.termsService.getCustomerTerms(organizationId, customerId);
    }

    @Post(':organizationId/customer/:customerId/override')
    async overrideTerms(
        @Param('organizationId') organizationId: string,
        @Param('customerId') customerId: string,
        @Body() termsOverride: any
    ) {
        return await this.termsService.overrideCustomerTerms(organizationId, customerId, termsOverride);
    }

    @Get(':organizationId/distribution')
    async getDistribution(@Param('organizationId') organizationId: string) {
        return await this.termsService.getTermsDistribution(organizationId);
    }
}
