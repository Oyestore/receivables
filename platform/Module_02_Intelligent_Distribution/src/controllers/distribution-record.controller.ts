import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DistributionRecordService } from '../services/distribution-record.service';
import { CreateDistributionRecordDto, UpdateDistributionRecordDto } from '../dto/distribution-record.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DistributionRecord, DistributionStatus } from '../entities/distribution-record.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('distribution-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('distribution-records')
export class DistributionRecordController {
  constructor(private readonly distributionRecordService: DistributionRecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new distribution record' })
  @ApiResponse({ status: 201, description: 'The distribution record has been successfully created.', type: DistributionRecord })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createDistributionRecordDto: CreateDistributionRecordDto, @Request() req): Promise<DistributionRecord> {
    // Ensure the organization ID matches the user's organization
    if (req.user.organizationId !== createDistributionRecordDto.organizationId) {
      throw new ForbiddenException('You can only create distribution records for your own organization');
    }
    
    return this.distributionRecordService.create(createDistributionRecordDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all distribution records for the organization' })
  @ApiResponse({ status: 200, description: 'List of distribution records.', type: [DistributionRecord] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Request() req): Promise<DistributionRecord[]> {
    return this.distributionRecordService.findAll(req.user.organizationId);
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Get all distribution records for a specific invoice' })
  @ApiResponse({ status: 200, description: 'List of distribution records for the invoice.', type: [DistributionRecord] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findByInvoice(@Param('invoiceId') invoiceId: string, @Request() req): Promise<DistributionRecord[]> {
    return this.distributionRecordService.findByInvoice(invoiceId, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a distribution record by ID' })
  @ApiResponse({ status: 200, description: 'The distribution record.', type: DistributionRecord })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Distribution record not found.' })
  async findOne(@Param('id') id: string, @Request() req): Promise<DistributionRecord> {
    return this.distributionRecordService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a distribution record' })
  @ApiResponse({ status: 200, description: 'The distribution record has been successfully updated.', type: DistributionRecord })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Distribution record not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateDistributionRecordDto: UpdateDistributionRecordDto,
    @Request() req,
  ): Promise<DistributionRecord> {
    return this.distributionRecordService.update(id, updateDistributionRecordDto, req.user.organizationId);
  }

  @Patch(':id/status/:status')
  @ApiOperation({ summary: 'Update the status of a distribution record' })
  @ApiResponse({ status: 200, description: 'The distribution record status has been successfully updated.', type: DistributionRecord })
  @ApiResponse({ status: 400, description: 'Invalid status.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Distribution record not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Param('status') status: DistributionStatus,
    @Request() req,
  ): Promise<DistributionRecord> {
    return this.distributionRecordService.updateStatus(id, status, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a distribution record' })
  @ApiResponse({ status: 200, description: 'The distribution record has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Distribution record not found.' })
  async remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.distributionRecordService.remove(id, req.user.organizationId);
    return { message: 'Distribution record successfully deleted' };
  }
}
