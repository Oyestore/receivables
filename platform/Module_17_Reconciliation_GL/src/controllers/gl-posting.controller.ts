import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { GlPostingService } from '../services/gl-posting.service';
import { JournalEntry } from '../entities/journal-entry.entity';
import { GlEntry } from '../entities/gl-entry.entity';

@Controller('gl')
export class GlPostingController {
    constructor(private readonly glPostingService: GlPostingService) { }

    @Post('entry')
    async createJournalEntry(@Body() body: { header: Partial<JournalEntry>, lines: Partial<GlEntry>[] }) {
        return this.glPostingService.createEntry(body.header, body.lines);
    }

    @Post('entry/:id/post')
    async postJournalEntry(@Param('id') id: string, @Body('userId') userId: string) {
        return this.glPostingService.postEntry(id, userId);
    }

    @Get('trial-balance/:tenantId')
    async getTrialBalance(@Param('tenantId') tenantId: string) {
        return this.glPostingService.getTrialBalance(tenantId);
    }
}
