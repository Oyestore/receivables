import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { CreditLimitService } from './credit-limit.service';

@Controller('credit-limits')
export class CreditLimitController {
    constructor(private readonly limitService: CreditLimitService) { }

    @Post()
    async createLimit(@Body() dto: any) {
        return await this.limitService.create(dto);
    }

    @Get()
    async getLimits(@Query('tenantId') tenantId: string, @Query('buyerId') buyerId?: string) {
        return await this.limitService.findAll(tenantId, { buyerId });
    }

    @Get(':id')
    async getLimit(@Param('id') id: string, @Query('tenantId') tenantId: string) {
        return await this.limitService.findOne(id, tenantId);
    }

    @Put(':id')
    async updateLimit(@Param('id') id: string, @Body() dto: any, @Query('tenantId') tenantId: string) {
        return await this.limitService.update(id, dto, tenantId);
    }
}
