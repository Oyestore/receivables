import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { EscrowService } from '../services/escrow.service';
import { CreateEscrowRequest, FundEscrowRequest, ReleaseEscrowRequest, DisputeEscrowRequest } from '../services/escrow.service';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  async createEscrow(@Body() createRequest: CreateEscrowRequest, @Body('createdBy') createdBy: string) {
    return this.escrowService.createEscrow(createRequest, createdBy);
  }

  @Get(':id')
  async getEscrow(@Param('id') id: string) {
    return this.escrowService.getEscrowById(id);
  }

  @Post(':id/fund')
  async fundEscrow(@Param('id') id: string, @Body() fundRequest: FundEscrowRequest) {
    return this.escrowService.fundEscrow(fundRequest);
  }

  @Post(':id/release')
  async releaseEscrow(@Param('id') id: string, @Body() releaseRequest: ReleaseEscrowRequest) {
    return this.escrowService.releaseEscrow(releaseRequest);
  }

  @Post(':id/dispute')
  async disputeEscrow(@Param('id') id: string, @Body() disputeRequest: DisputeEscrowRequest) {
    return this.escrowService.disputeEscrow(disputeRequest);
  }

  @Post(':id/resolve-dispute')
  async resolveDispute(@Param('id') id: string, @Body() body: {
    resolution: string;
    releaseNotes: string;
  }) {
    return this.escrowService.resolveDispute(id, body.resolution, body.releaseNotes);
  }

  @Post(':id/cancel')
  async cancelEscrow(@Param('id') id: string, @Body() body: { reason: string; cancelledBy: string }) {
    return this.escrowService.cancelEscrow(id, body.reason, body.cancelledBy);
  }

  @Get('buyer/:buyerId')
  async getEscrowsByBuyer(@Param('buyerId') buyerId: string, @Query('status') status?: string) {
    return this.escrowService.getEscrowsByBuyer(buyerId, status as any);
  }

  @Get('seller/:sellerId')
  async getEscrowsBySeller(@Param('sellerId') sellerId: string, @Query('status') status?: string) {
    return this.escrowService.getEscrowsBySeller(sellerId, status as any);
  }

  @Get('analytics')
  async getAnalytics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.escrowService.getEscrowAnalytics(startDate, endDate);
  }

  @Get('metrics')
  async getMetrics() {
    return this.escrowService.getEscrowMetrics();
  }
}
