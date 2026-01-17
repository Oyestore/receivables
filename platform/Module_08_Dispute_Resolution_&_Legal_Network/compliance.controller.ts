import { Controller, Post, Body, Get, Param } from '@nestjs/common';

@Controller('compliance')
export class ComplianceController {
    constructor() { }

    @Post('check')
    async checkCompliance(@Body() data: any) {
        return { status: 'compliant' };
    }

    @Get(':id')
    async getStatus(@Param('id') id: string) {
        return { id, status: 'compliant' };
    }
}
