import { Controller, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EvidenceValidationService, ValidationResult } from '../services/evidence-validation.service';

@Controller('api/v1/evidence-validation')
@ApiTags('Evidence Validation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceValidationController {
    constructor(
        private readonly validationService: EvidenceValidationService,
    ) { }

    /**
     * Validate evidence using AI
     */
    @Post(':evidenceId/validate')
    @ApiOperation({ summary: 'Validate evidence using AI' })
    @ApiResponse({ status: 200, description: 'Validation complete' })
    @ApiParam({ name: 'evidenceId', description: 'Evidence ID to validate' })
    async validateEvidence(
        @Param('evidenceId') evidenceId: string,
    ): Promise<ValidationResult> {
        return this.validationService.validateEvidence(evidenceId);
    }

    /**
     * Auto-approve evidence (admin only)
     */
    @Post(':validationId/auto-approve')
    @HttpCode(HttpStatus.OK)
    @Roles('admin')
    @ApiOperation({ summary: 'Force auto-approve evidence' })
    @ApiResponse({ status: 200, description: 'Evidence auto-approved' })
    @ApiParam({ name: 'validationId', description: 'Validation ID' })
    async autoApprove(
        @Param('validationId') validationId: string,
    ): Promise<{ message: string }> {
        await this.validationService.autoApproveEvidence(validationId);
        return { message: 'Evidence auto-approved successfully' };
    }

    /**
     * Submit human feedback for learning
     */
    @Post(':validationId/feedback')
    @HttpCode(HttpStatus.OK)
    @Roles('admin', 'manager', 'reviewer')
    @ApiOperation({ summary: 'Submit human feedback on AI validation' })
    @ApiResponse({ status: 200, description: 'Feedback submitted' })
    @ApiParam({ name: 'validationId', description: 'Validation ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                approved: { type: 'boolean' },
                feedback: { type: 'string' },
            },
        },
    })
    async submitFeedback(
        @Param('validationId') validationId: string,
        @Body('approved') approved: boolean,
        @Body('feedback') feedback: string,
        @CurrentUser('id') reviewerId: string,
    ): Promise<{ message: string }> {
        await this.validationService.submitHumanFeedback(
            validationId,
            approved,
            feedback,
            reviewerId,
        );
        return { message: 'Feedback submitted successfully' };
    }
}
