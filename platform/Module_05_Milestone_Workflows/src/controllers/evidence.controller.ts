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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { EvidenceService } from '../services/evidence.service';
import { CreateEvidenceDto } from '../dto/create-evidence.dto';
import { UpdateEvidenceDto } from '../dto/update-evidence.dto';
import { MilestoneEvidence } from '../entities/milestone-evidence.entity';
import { EvidenceType, EvidenceStatus } from '../entities/milestone-evidence.entity';

@ApiTags('evidence')
@Controller('api/v1/evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @ApiOperation({ summary: 'Create new evidence' })
  @ApiResponse({ status: 201, description: 'Evidence created successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createEvidence(@Body() createDto: CreateEvidenceDto, @Request() req) {
    return this.evidenceService.createEvidence(createDto, req.user?.id || 'system');
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload evidence file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Body('milestoneId') milestoneId: string,
    @Body('tenantId') tenantId: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string,
    @Request() req,
  ) {
    const createDto = {
      milestoneId,
      tenantId,
      title: title || file.originalname,
      description: description || `Uploaded file: ${file.originalname}`,
      evidenceType: this.getEvidenceTypeFromMimeType(file.mimetype),
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: file.path,
      fileUrl: file.filename,
      fileData: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user?.id || 'system',
    };
    return this.evidenceService.createEvidence(createDto, req.user?.id || 'system');
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload multiple evidence files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('files'))
  async bulkUploadEvidence(
    @UploadedFile() files: Express.Multer.File[],
    @Body('milestoneId') milestoneId: string,
    @Request() req,
  ) {
    return this.evidenceService.bulkUploadEvidence(milestoneId, files, req.user?.id || 'system');
  }

  @Get()
  @ApiOperation({ summary: 'Get all evidence with filtering' })
  @ApiResponse({ status: 200, description: 'Evidence retrieved successfully' })
  @ApiQuery({ name: 'milestoneId', required: false, description: 'Filter by milestone ID' })
  @ApiQuery({ name: 'type', required: false, enum: EvidenceType, description: 'Filter by type' })
  @ApiQuery({ name: 'status', required: false, enum: EvidenceStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'uploadedBy', required: false, description: 'Filter by uploader' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title, description, filename' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAllEvidence(
    @Query('tenantId') tenantId: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('type') type?: EvidenceType,
    @Query('status') status?: EvidenceStatus,
    @Query('uploadedBy') uploadedBy?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.evidenceService.findAllEvidence(tenantId, {
      milestoneId,
      type,
      status,
      uploadedBy,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific evidence' })
  @ApiResponse({ status: 200, description: 'Evidence retrieved successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async findEvidence(@Param('id') id: string) {
    return this.evidenceService.findEvidence(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update evidence' })
  @ApiResponse({ status: 200, description: 'Evidence updated successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async updateEvidence(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvidenceDto,
    @Request() req,
  ) {
    return this.evidenceService.updateEvidence(id, updateDto, req.user?.id || 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete evidence' })
  @ApiResponse({ status: 204, description: 'Evidence deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete verified evidence' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvidence(@Param('id') id: string) {
    await this.evidenceService.deleteEvidence(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify evidence' })
  @ApiResponse({ status: 200, description: 'Evidence verification completed', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Cannot verify evidence' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async verifyEvidence(
    @Param('id') id: string,
    @Body('verificationData') verificationData: any,
    @Request() req,
  ) {
    return this.evidenceService.verifyEvidence(id, verificationData, req.user?.id || 'system');
  }

  @Post(':id/submit-for-verification')
  @ApiOperation({ summary: 'Submit evidence for verification' })
  @ApiResponse({ status: 200, description: 'Evidence submitted for verification', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Cannot submit evidence for verification' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async submitForVerification(@Param('id') id: string, @Request() req) {
    return this.evidenceService.submitForVerification(id, req.user?.id || 'system');
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to evidence' })
  @ApiResponse({ status: 200, description: 'Tags added successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async addEvidenceTags(
    @Param('id') id: string,
    @Body('tags') tags: string[],
    @Request() req,
  ) {
    return this.evidenceService.addEvidenceTag(id, tags, req.user?.id || 'system');
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remove tags from evidence' })
  @ApiResponse({ status: 200, description: 'Tags removed successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async removeEvidenceTags(
    @Param('id') id: string,
    @Body('tags') tags: string[],
    @Request() req,
  ) {
    return this.evidenceService.removeEvidenceTag(id, tags, req.user?.id || 'system');
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download evidence file' })
  @ApiResponse({ status: 200, description: 'File download started' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async downloadEvidence(@Param('id') id: string, @Request() req) {
    return this.evidenceService.downloadEvidence(id, req.user?.id || 'system');
  }

  @Get('milestone/:milestoneId')
  @ApiOperation({ summary: 'Get all evidence for a milestone' })
  @ApiResponse({ status: 200, description: 'Evidence retrieved successfully' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  async getEvidenceByMilestone(@Param('milestoneId') milestoneId: string) {
    return this.evidenceService.getEvidenceByMilestone(milestoneId);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get evidence analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for analytics' })
  async getEvidenceAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.evidenceService.getEvidenceAnalytics(tenantId, timeRange);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone evidence to another milestone' })
  @ApiResponse({ status: 201, description: 'Evidence cloned successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiParam({ name: 'id', description: 'Evidence ID to clone' })
  async cloneEvidence(
    @Param('id') id: string,
    @Body('targetMilestoneId') targetMilestoneId: string,
    @Body('newTitle') newTitle?: string,
    @Request() req,
  ) {
    const originalEvidence = await this.evidenceService.findEvidence(id);
    const clonedDto = {
      milestoneId: targetMilestoneId,
      tenantId: originalEvidence.tenantId,
      title: newTitle || `Cloned from: ${originalEvidence.title}`,
      description: originalEvidence.description,
      evidenceType: originalEvidence.evidenceType,
      fileName: originalEvidence.fileName,
      fileSize: originalEvidence.fileSize,
      mimeType: originalEvidence.mimeType,
      filePath: originalEvidence.filePath,
      fileUrl: originalEvidence.fileUrl,
      fileData: originalEvidence.fileData,
      tags: originalEvidence.tags,
      metadata: originalEvidence.metadata,
      notes: `Cloned from evidence ID: ${id}`,
    };
    return this.evidenceService.createEvidence(clonedDto, req.user?.id || 'system');
  }

  @Post('bulk-verify')
  @ApiOperation({ summary: 'Bulk verify multiple evidence items' })
  @ApiResponse({ status: 200, description: 'Bulk verification completed successfully' })
  async bulkVerify(
    @Body('evidenceIds') evidenceIds: string[],
    @Body('verificationData') verificationData: any,
    @Request() req,
  ) {
    const results = [];
    for (const id of evidenceIds) {
      try {
        const result = await this.evidenceService.verifyEvidence(id, verificationData, req.user?.id || 'system');
        results.push({ id, status: 'verified', success: true, result });
      } catch (error) {
        results.push({ id, status: 'error', success: false, error: error.message });
      }
    }
    return { results, totalProcessed: evidenceIds.length, successCount: results.filter(r => r.success).length };
  }

  @Get('storage/usage')
  @ApiOperation({ summary: 'Get storage usage statistics' })
  @ApiResponse({ status: 200, description: 'Storage usage retrieved successfully' })
  async getStorageUsage(@Query('tenantId') tenantId: string) {
    const analytics = await this.evidenceService.getEvidenceAnalytics(tenantId);
    return {
      totalFiles: analytics.totalEvidence,
      totalSize: analytics.averageFileSize * analytics.totalEvidence,
      averageFileSize: analytics.averageFileSize,
      filesByType: analytics.evidenceByType,
      uploadTrends: analytics.uploadTrends,
    };
  }

  @Post(':id/replace-file')
  @ApiOperation({ summary: 'Replace evidence file' })
  @ApiResponse({ status: 200, description: 'File replaced successfully', type: MilestoneEvidence })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async replaceEvidenceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const updateDto = {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: file.path,
      fileUrl: file.filename,
      fileData: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      evidenceType: this.getEvidenceTypeFromMimeType(file.mimetype),
    };
    return this.evidenceService.updateEvidence(id, updateDto, req.user?.id || 'system');
  }

  // Private helper method
  private getEvidenceTypeFromMimeType(mimeType: string): EvidenceType {
    if (mimeType.startsWith('image/')) return EvidenceType.IMAGE;
    if (mimeType.startsWith('video/')) return EvidenceType.VIDEO;
    if (mimeType.startsWith('audio/')) return EvidenceType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return EvidenceType.DOCUMENT;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return EvidenceType.SPREADSHEET;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return EvidenceType.PRESENTATION;
    return EvidenceType.OTHER;
  }
}
