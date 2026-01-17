import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { LeadService } from '../services/lead.service';
import { Lead, LeadStatus } from '../entities/lead.entity';

@Controller('leads')
export class LeadController {
    constructor(private readonly leadService: LeadService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createLeadDto: Partial<Lead>) {
        return this.leadService.create(createLeadDto);
    }

    @Get()
    findAll() {
        return this.leadService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeadDto: Partial<Lead>) {
        return this.leadService.update(id, updateLeadDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.leadService.remove(id);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: LeadStatus) {
        return this.leadService.updateStatus(id, status);
    }

    @Post(':id/score')
    calculateScore(@Param('id') id: string) {
        return this.leadService.calculateScore(id);
    }
}
