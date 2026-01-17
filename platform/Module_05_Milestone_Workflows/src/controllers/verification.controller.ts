import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VerificationService } from '../services/verification.service';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { UpdateVerificationDto } from '../dto/update-verification.dto';
import { ApproveVerificationDto } from '../dto/approve-verification.dto';
import { RejectVerificationDto } from '../dto/reject-verification.dto';
import { MilestoneVerification } from '../entities/milestone-verification.entity';
import { VerificationStatus, VerificationType } from '../entities/milestone-verification.entity';

@ApiTags('verifications')
@Controller('api/v1/verifications')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new verification' })
  @ApiResponse({ status: 201, description: 'Verification created successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createVerification(@Body() createDto: CreateVerificationDto, @Request() req) {
    return this.verificationService.createVerification(createDto, req.user?.id || 'system');
  }

  @Get()
  @ApiOperation({ summary: 'Get all verifications with filtering' })
  @ApiResponse({ status: 200, description: 'Verifications retrieved successfully' })
  @ApiQuery({ name: 'milestoneId', required: false, description: 'Filter by milestone ID' })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: VerificationType, description: 'Filter by type' })
  @ApiQuery({ name: 'verifierId', required: false, description: 'Filter by verifier' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAllVerifications(
    @Query('tenantId') tenantId: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('status') status?: VerificationStatus,
    @Query('type') type?: VerificationType,
    @Query('verifierId') verifierId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.verificationService.findAllVerifications(tenantId, {
      milestoneId,
      status,
      type,
      verifierId,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific verification' })
  @ApiResponse({ status: 200, description: 'Verification retrieved successfully', type: MilestoneVerification })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async findVerification(@Param('id') id: string) {
    return this.verificationService.findVerification(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a verification' })
  @ApiResponse({ status: 200, description: 'Verification updated successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async updateVerification(
    @Param('id') id: string,
    @Body() updateDto: UpdateVerificationDto,
    @Request() req,
  ) {
    return this.verificationService.updateVerification(id, updateDto, req.user?.id || 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a verification' })
  @ApiResponse({ status: 204, description: 'Verification deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete verification' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVerification(@Param('id') id: string) {
    // Note: This would need to be implemented in the service
    throw new Error('Delete verification not implemented yet');
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a verification' })
  @ApiResponse({ status: 200, description: 'Verification approved successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Cannot approve verification' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async approveVerification(
    @Param('id') id: string,
    @Body() approveDto: ApproveVerificationDto,
    @Request() req,
  ) {
    return this.verificationService.approveVerification(id, approveDto, req.user?.id || 'system');
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a verification' })
  @ApiResponse({ status: 200, description: 'Verification rejected successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Cannot reject verification' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async rejectVerification(
    @Param('id') id: string,
    @Body() rejectDto: RejectVerificationDto,
    @Request() req,
  ) {
    return this.verificationService.rejectVerification(id, rejectDto, req.user?.id || 'system');
  }

  @Post(':id/submit-for-review')
  @ApiOperation({ summary: 'Submit verification for review' })
  @ApiResponse({ status: 200, description: 'Verification submitted for review', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Cannot submit verification for review' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async submitForReview(@Param('id') id: string, @Request() req) {
    return this.verificationService.submitForReview(id, req.user?.id || 'system');
  }

  @Post(':id/request-resubmission')
  @ApiOperation({ summary: 'Request verification resubmission' })
  @ApiResponse({ status: 200, description: 'Resubmission requested successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Cannot request resubmission' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async requestResubmission(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @Request() req,
  ) {
    return this.verificationService.requestResubmission(id, comments, req.user?.id || 'system');
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence to verification' })
  @ApiResponse({ status: 200, description: 'Evidence added successfully', type: MilestoneVerification })
  @ApiResponse({ status: 400, description: 'Cannot add evidence' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async addEvidence(
    @Param('id') id: string,
    @Body('evidence') evidence: any[],
    @Request() req,
  ) {
    return this.verificationService.addEvidence(id, evidence, req.user?.id || 'system');
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get verification history' })
  @ApiResponse({ status: 200, description: 'Verification history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async getVerificationHistory(@Param('id') id: string) {
    return this.verificationService.getVerificationHistory(id);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get verification analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for analytics' })
  async getVerificationAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.verificationService.getVerificationAnalytics(tenantId, timeRange);
  }

  @Get('analytics/workload/:verifierId')
  @ApiOperation({ summary: 'Get verifier workload analytics' })
  @ApiResponse({ status: 200, description: 'Workload analytics retrieved successfully' })
  @ApiParam({ name: 'verifierId', description: 'Verifier ID' })
  async getVerifierWorkload(@Param('verifierId') verifierId: string) {
    return this.verificationService.getVerifierWorkload(verifierId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a verification template' })
  @ApiResponse({ status: 201, description: 'Verification cloned successfully', type: MilestoneVerification })
  @ApiResponse({ status: 404, description: 'Verification not found' })
  @ApiParam({ name: 'id', description: 'Verification ID to clone' })
  async cloneVerification(
    @Param('id') id: string,
    @Body('newMilestoneId') newMilestoneId: string,
    @Request() req,
  ) {
    const originalVerification = await this.verificationService.findVerification(id);
    const clonedDto = {
      milestoneId: newMilestoneId,
      tenantId: originalVerification.tenantId,
      title: `Cloned from: ${originalVerification.title}`,
      description: `Cloned verification from: ${originalVerification.title}`,
      verificationType: originalVerification.verificationType,
      verifiedBy: originalVerification.verifiedBy,
      verifiers: originalVerification.verifiers,
      verificationCriteria: originalVerification.verificationCriteria,
      approvalRequirements: originalVerification.approvalRequirements,
      requiredDocuments: originalVerification.requiredDocuments,
      priority: originalVerification.priority,
      metadata: originalVerification.metadata,
      notes: `Cloned from verification ID: ${id}`,
    };
    return this.verificationService.createVerification(clonedDto, req.user?.id || 'system');
  }

  @Post('bulk-verify')
  @ApiOperation({ summary: 'Bulk approve multiple verifications' })
  @ApiResponse({ status: 200, description: 'Bulk verification completed successfully' })
  async bulkVerify(
    @Body('verificationIds') verificationIds: string[],
    @Body('action') action: 'approve' | 'reject',
    @Body('comments') comments?: string,
    @Request() req,
  ) {
    const results = [];
    for (const id of verificationIds) {
      try {
        if (action === 'approve') {
          const result = await this.verificationService.approveVerification(
            id,
            { comments, nextAction: 'COMPLETE_MILESTONE' },
            req.user?.id || 'system',
          );
          results.push({ id, status: 'approved', success: true, result });
        } else {
          const result = await this.verificationService.rejectVerification(
            id,
            { reason: 'Bulk rejection', comments },
            req.user?.id || 'system',
          );
          results.push({ id, status: 'rejected', success: true, result });
        }
      } catch (error) {
        results.push({ id, status: 'error', success: false, error: error.message });
      }
    }
    return { results, totalProcessed: verificationIds.length, successCount: results.filter(r => r.success).length };
  }

  @Get('dashboard/:userId')
  @ApiOperation({ summary: 'Get user verification dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserDashboard(@Param('userId') userId: string) {
    const workload = await this.verificationService.getVerifierWorkload(userId);
    
    // Get recent verifications for this user
    const recentVerifications = await this.verificationService.findAllVerifications(
      'default-tenant', // This would come from user context
      { verifierId: userId, page: 1, limit: 10 }
    );

    return {
      workload,
      recentVerifications: recentVerifications.verifications,
      pendingActions: workload.pendingVerifications,
      overdueItems: workload.overdueVerifications,
    };
  }
}
