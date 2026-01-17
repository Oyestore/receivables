import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { TradeFinanceService } from '../services/trade-finance.service';
import { CreateLetterOfCreditDto } from '../dto/create-letter-of-credit.dto';

@Controller('trade-finance')
export class TradeFinanceController {
  constructor(private readonly tradeFinanceService: TradeFinanceService) {}

  @Post('letter-of-credit')
  async createLetterOfCredit(@Body() createRequest: CreateLetterOfCreditDto, @Body('createdBy') createdBy: string) {
    return this.tradeFinanceService.createLetterOfCredit(createRequest, createdBy);
  }

  @Get('letter-of-credit/:id')
  async getLetterOfCredit(@Param('id') id: string) {
    return this.tradeFinanceService.getLetterOfCredit(id);
  }

  @Get('letter-of-credit/number/:lcNumber')
  async getLetterOfCreditByNumber(@Param('lcNumber') lcNumber: string) {
    return this.tradeFinanceService.getLetterOfCreditByNumber(lcNumber);
  }

  @Put('letter-of-credit/:id')
  async updateLetterOfCredit(@Param('id') id: string, @Body() updateRequest: any, @Body('updatedBy') updatedBy: string) {
    return this.tradeFinanceService.updateLetterOfCredit(id, updateRequest, updatedBy);
  }

  @Post('letter-of-credit/:id/request-issuance')
  async requestLCIssuance(@Param('id') id: string, @Body('requestedBy') requestedBy: string) {
    return this.tradeFinanceService.requestLCIssuance(id, requestedBy);
  }

  @Post('letter-of-credit/:id/issue')
  async issueLetterOfCredit(@Param('id') id: string, @Body() body: { issuedBy: string; bankReference?: string }) {
    return this.tradeFinanceService.issueLetterOfCredit(id, body.issuedBy, body.bankReference);
  }

  @Post('letter-of-credit/:id/activate')
  async activateLetterOfCredit(@Param('id') id: string, @Body('activatedBy') activatedBy: string) {
    return this.tradeFinanceService.activateLetterOfCredit(id, activatedBy);
  }

  @Post('letter-of-credit/:id/utilize')
  async utilizeLetterOfCredit(@Param('id') id: string, @Body() body: {
    utilizationAmount: number;
    utilizationDetails: any;
    utilizedBy: string;
  }) {
    return this.tradeFinanceService.utilizeLetterOfCredit(id, body.utilizationAmount, body.utilizationDetails, body.utilizedBy);
  }

  @Post('letter-of-credit/:id/present-documents')
  async presentDocuments(@Param('id') id: string, @Body() presentationRequest: any) {
    return this.tradeFinanceService.presentDocuments(presentationRequest);
  }

  @Post('letter-of-credit/:id/cancel')
  async cancelLetterOfCredit(@Param('id') id: string, @Body() body: { reason: string; cancelledBy: string }) {
    return this.tradeFinanceService.cancelLetterOfCredit(id, body.reason, body.cancelledBy);
  }

  @Post('letter-of-credit/:id/close')
  async closeLetterOfCredit(@Param('id') id: string, @Body() body: { reason: string; closedBy: string }) {
    return this.tradeFinanceService.closeLetterOfCredit(id, body.reason, body.closedBy);
  }

  @Get('letter-of-credit/applicant/:applicantId')
  async getLCsByApplicant(@Param('applicantId') applicantId: string, @Query('status') status?: string) {
    return this.tradeFinanceService.getLCsByApplicant(applicantId, status as any);
  }

  @Get('letter-of-credit/beneficiary/:beneficiaryId')
  async getLCsByBeneficiary(@Param('beneficiaryId') beneficiaryId: string, @Query('status') status?: string) {
    return this.tradeFinanceService.getLCsByBeneficiary(beneficiaryId, status as any);
  }

  @Get('letter-of-credit/bank/:bankId/:bankType')
  async getLCsByBank(@Param('bankId') bankId: string, @Param('bankType') bankType: string, @Query('status') status?: string) {
    return this.tradeFinanceService.getLCsByBank(bankId, bankType as any, status as any);
  }

  @Get('letter-of-credit/expiring')
  async getExpiringLCs(@Query('daysThreshold') daysThreshold?: number) {
    return this.tradeFinanceService.getExpiringLCs(daysThreshold);
  }

  @Get('letter-of-credit/analytics')
  async getLCAnalytics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.tradeFinanceService.getLCAnalytics(startDate, endDate);
  }

  @Get('letter-of-credit/metrics')
  async getLCMetrics() {
    return this.tradeFinanceService.getLCMetrics();
  }
}
