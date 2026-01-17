import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoiceService, PaginatedResult } from '../services/invoice.service';
import { WorkflowApprovalService } from '../services/workflow-approval.service';
import { AuditTrailService } from '../services/audit-trail.service';
import { MetricsService } from '../services/metrics.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
import { Invoice } from '../entities/invoice.entity';

@ApiTags('Invoices')
@Controller('api/v1/invoices')
@ApiBearerAuth()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly approvalService: WorkflowApprovalService,
    private readonly auditService: AuditTrailService,
    private readonly metricsService: MetricsService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: Invoice,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Req() req: any,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const userId = req.user?.id || 'system';
    return this.invoiceService.create(createInvoiceDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all invoices with pagination' })
  @ApiQuery({ name: 'tenant_id', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
  })
  async findAll(
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedResult<Invoice>> {
    return this.invoiceService.findAll(
      tenant_id,
      page || 1,
      limit || 50,
      sortBy || 'created_at',
      sortOrder || 'DESC',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'tenant_id', required: true })
  @ApiResponse({ status: 200, description: 'Invoice found', type: Invoice })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
  ): Promise<Invoice> {
    return this.invoiceService.findOne(id, tenant_id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({ status: 200, description: 'Invoice updated', type: Invoice })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
  ): Promise<Invoice> {
    const userId = req.user?.id || 'system';
    return this.invoiceService.update(id, updateInvoiceDto, tenant_id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
  ): Promise<void> {
    return this.invoiceService.remove(id, tenant_id);
  }

  // Approval endpoints
  @Post(':id/submit-approval')
  @ApiOperation({ summary: 'Submit invoice for approval' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Submitted for approval' })
  async submitForApproval(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
  ) {
    const userId = req.user?.id || 'system';
    return this.approvalService.submitForApproval(id, userId, tenant_id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an invoice' })
  @ApiBody({ schema: { properties: { comments: { type: 'string' } } } })
  async approveInvoice(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('comments') comments?: string,
  ) {
    const approverId = req.user?.id || 'system';
    return this.approvalService.approve(id, approverId, comments);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an invoice' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', required: true } } } })
  async rejectInvoice(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    const approverId = req.user?.id || 'system';
    return this.approvalService.reject(id, approverId, reason);
  }

  // Audit endpoints
  @Get(':id/version-history')
  @ApiOperation({ summary: 'Get version history for an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async getVersionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
  ) {
    return this.auditService.getVersionHistory(id, tenant_id);
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Rollback invoice to a specific version' })
  @ApiBody({ schema: { properties: { version_id: { type: 'string', required: true } } } })
  async rollback(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
    @Body('version_id') versionId: string,
  ) {
    const userId = req.user?.id || 'system';
    return this.auditService.rollbackToVersion(id, versionId, userId, tenant_id);
  }

  // Metrics endpoint
  @Get('metrics')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
