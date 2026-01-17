import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ComplianceMonitoringService } from './compliance-monitoring.service';
import { ComplianceMonitoringDto } from './compliance-monitoring.dto';

@Controller('compliance-monitoring')
export class ComplianceMonitoringController {
    constructor(private readonly service: ComplianceMonitoringService) { }

    @Post()
    async monitor(@Body() dto: ComplianceMonitoringDto) {
        return this.service.monitor(dto.entityId);
    }

    @Get(':id')
    async getResults(@Param('id') id: string) {
        return this.service.getResults(id);
    }
}
