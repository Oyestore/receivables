import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { DistributionService, DistributionAnalytics } from '../services/distribution.service';
import { CreateDistributionRuleDto, UpdateDistributionRuleDto, CreateDistributionAssignmentDto, UpdateAssignmentStatusDto, DistributionQueryDto } from '../dto/distribution.dto';
import { DistributionRule, DistributionAssignment } from '../entities/distribution-entities';

@Controller('distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  // ========== DISTRIBUTION RULES ==========

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createDistributionRule(@Body(ValidationPipe) createRuleDto: CreateDistributionRuleDto): Promise<DistributionRule> {
    return await this.distributionService.createDistributionRule(createRuleDto);
  }

  @Get('rules')
  async getDistributionRules(
    @Query('tenantId') tenantId: string,
    @Query() query: DistributionQueryDto,
  ) {
    return await this.distributionService.getDistributionRules(tenantId, query);
  }

  @Get('rules/:id')
  async getDistributionRule(@Param('id') id: string, @Query('tenantId') tenantId: string): Promise<DistributionRule> {
    return await this.distributionService.getDistributionRuleById(id, tenantId);
  }

  @Patch('rules/:id')
  async updateDistributionRule(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body(ValidationPipe) updateRuleDto: UpdateDistributionRuleDto,
  ): Promise<DistributionRule> {
    return await this.distributionService.updateDistributionRule(id, tenantId, updateRuleDto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDistributionRule(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ): Promise<void> {
    await this.distributionService.deleteDistributionRule(id, tenantId);
  }

  // ========== DISTRIBUTION ASSIGNMENTS ==========

  @Post('assignments')
  @HttpCode(HttpStatus.CREATED)
  async createDistributionAssignment(@Body(ValidationPipe) createAssignmentDto: CreateDistributionAssignmentDto): Promise<DistributionAssignment> {
    return await this.distributionService.createDistributionAssignment(createAssignmentDto);
  }

  @Post('assignments/intelligent')
  @HttpCode(HttpStatus.CREATED)
  async evaluateAndCreateAssignments(
    @Body() invoiceData: {
      tenantId: string;
      invoiceId: string;
      customerId: string;
      amount: number;
      dueDate: string;
      customerData: Record<string, any>;
    },
  ): Promise<DistributionAssignment[]> {
    return await this.distributionService.evaluateAndCreateAssignments(
      invoiceData.tenantId,
      {
        ...invoiceData,
        dueDate: new Date(invoiceData.dueDate),
      },
    );
  }

  @Get('assignments')
  async getDistributionAssignments(
    @Query('tenantId') tenantId: string,
    @Query() query: DistributionQueryDto,
  ) {
    return await this.distributionService.getDistributionAssignments(tenantId, query);
  }

  @Get('assignments/:id')
  async getAssignmentById(@Param('id') id: string, @Query('tenantId') tenantId: string): Promise<DistributionAssignment> {
    return await this.distributionService.getAssignmentById(id, tenantId);
  }

  @Get('assignments/invoice/:invoiceId')
  async getAssignmentsByInvoice(
    @Param('invoiceId') invoiceId: string,
    @Query('tenantId') tenantId: string,
  ): Promise<DistributionAssignment[]> {
    return await this.distributionService.getAssignmentsByInvoice(tenantId, invoiceId);
  }

  @Patch('assignments/:id/status')
  async updateAssignmentStatus(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body(ValidationPipe) updateStatusDto: UpdateAssignmentStatusDto,
  ): Promise<DistributionAssignment> {
    return await this.distributionService.updateAssignmentStatus(id, tenantId, updateStatusDto);
  }

  // ========== ANALYTICS ==========

  @Get('analytics')
  async getDistributionAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DistributionAnalytics> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.distributionService.getDistributionAnalytics(tenantId, start, end);
  }

  // ========== BATCH OPERATIONS ==========

  @Post('assignments/batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatchAssignments(
    @Body() batchData: {
      tenantId: string;
      assignments: CreateDistributionAssignmentDto[];
    },
  ): Promise<DistributionAssignment[]> {
    const results: DistributionAssignment[] = [];
    
    for (const assignmentDto of batchData.assignments) {
      const assignment = await this.distributionService.createDistributionAssignment({
        ...assignmentDto,
        tenantId: batchData.tenantId,
      });
      results.push(assignment);
    }
    
    return results;
  }

  @Patch('assignments/batch/status')
  async updateBatchAssignmentStatus(
    @Body() batchData: {
      tenantId: string;
      updates: Array<{
        id: string;
        status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
        error?: string;
      }>;
    },
  ): Promise<DistributionAssignment[]> {
    const results: DistributionAssignment[] = [];
    
    for (const update of batchData.updates) {
      const assignment = await this.distributionService.updateAssignmentStatus(
        update.id,
        batchData.tenantId,
        {
          status: update.status,
          error: update.error,
        },
      );
      results.push(assignment);
    }
    
    return results;
  }
}
