import {
    Controller,
    Post,
    Get,
    Put,
    Param,
    Body,
    Query,
    HttpStatus,
    UseGuards,
    HttpCode,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApplicationOrchestratorService } from '../services/application-orchestrator.service';
import {
    CreateApplicationDto,
    SubmitApplicationDto,
    ApplicationQueryDto,
    CompareOffersDto,
} from '../dto/application.dto';
import { User } from '../../../auth/decorators/user.decorator';

/**
 * Application Controller
 * 
 * Unified REST API for financing applications
 * Replaces fragmented partner-specific endpoints
 * 
 * Endpoints match frontend expectations:
 * - POST /api/v1/financing/applications
 * - POST /api/v1/financing/applications/:id/submit
 * - GET /api/v1/financing/applications/:id
 * - GET /api/v1/financing/applications
 */
@ApiTags('Financing Applications')
@Controller('api/v1/financing/applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationController {
    constructor(
        private readonly orchestrator: ApplicationOrchestratorService,
    ) { }

    /**
     * Create new financing application
     * POST /api/v1/financing/applications
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create financing application',
        description: 'Creates a new financing application in DRAFT status. Application is enriched with platform data before saving.',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Application created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: { type: 'string', example: 'Application created successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'uuid' },
                        applicationNumber: { type: 'string', example: 'FIN17370123454567' },
                        status: { type: 'string', example: 'draft' },
                        requestedAmount: { type: 'number', example: 500000 },
                        financingType: { type: 'string', example: 'invoice_discounting' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
    async createApplication(
        @Body() dto: CreateApplicationDto,
        @User() user: any,
    ) {
        const tenantId = user.tenantId;
        const userId = user.userId;

        const application = await this.orchestrator.createApplication(
            tenantId,
            userId,
            dto,
        );

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Application created successfully',
            data: {
                id: application.id,
                applicationNumber: application.applicationNumber,
                status: application.status,
                requestedAmount: application.requestedAmount,
                financingType: application.financingType,
                priority: application.priority,
                createdAt: application.createdAt,
            },
        };
    }

    /**
     * Submit application to partner(s)
     * POST /api/v1/financing/applications/:id/submit
     */
    @Post(':id/submit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Submit application to financing partner(s)',
        description: 'Submits application to one or more partners. Supports both single-partner and multi-partner auction modes.',
    })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Application submitted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Application submitted successfully' },
                data: {
                    type: 'object',
                    properties: {
                        applicationId: { type: 'string' },
                        partnerIds: { type: 'array', items: { type: 'string' } },
                        mode: { type: 'string', enum: ['single', 'auction'] },
                        status: { type: 'string' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Application not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Application already submitted or invalid state' })
    async submitApplication(
        @Param('id') id: string,
        @Body() dto: SubmitApplicationDto,
        @User() user: any,
    ) {
        const userId = user.userId;

        const result = await this.orchestrator.submitToPartners(id, userId, dto);

        return {
            statusCode: HttpStatus.OK,
            message: 'Application submitted successfully',
            data: result,
        };
    }

    /**
     * Get application by ID
     * GET /api/v1/financing/applications/:id
     */
    @Get(':id')
    @ApiOperation({
        summary: 'Get application details',
        description: 'Retrieves complete application details including status, offers, and partner responses.',
    })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Application retrieved successfully',
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Application not found' })
    async getApplication(
        @Param('id') id: string,
        @User() user: any,
    ) {
        const application = await this.orchestrator.getApplicationById(id);

        // Verify ownership
        if (application.userId !== user.userId) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Not authorized to view this application',
            };
        }

        return {
            statusCode: HttpStatus.OK,
            data: application,
        };
    }

    /**
     * List user's applications
     * GET /api/v1/financing/applications
     */
    @Get()
    @ApiOperation({
        summary: 'List financing applications',
        description: 'Lists all applications for the authenticated user with optional filters.',
    })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
    @ApiQuery({ name: 'financingType', required: false, description: 'Filter by financing type' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Applications retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        applications: { type: 'array' },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                    },
                },
            },
        },
    })
    async listApplications(
        @Query() query: ApplicationQueryDto,
        @User() user: any,
    ) {
        const tenantId = user.tenantId;
        const userId = user.userId;

        const result = await this.orchestrator.listApplications(
            tenantId,
            userId,
            query,
        );

        return {
            statusCode: HttpStatus.OK,
            data: {
                applications: result.applications,
                total: result.total,
                page: query.page || 1,
                limit: query.limit || 20,
            },
        };
    }

    /**
     * Compare offers from multiple partners
     * POST /api/v1/financing/applications/:id/compare-offers
     * 
     * Triggers multi-partner auction (Phase 4 feature)
     */
    @Post(':id/compare-offers')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Compare offers from multiple partners',
        description: 'Runs a multi-partner auction to get best offers. Returns ranked offers based on preferences. (Phase 4 feature)',
    })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Auction completed, offers ranked',
    })
    async compareOffers(
        @Param('id') id: string,
        @Body() dto: CompareOffersDto,
        @User() user: any,
    ) {
        const result = await this.orchestrator.runAuction(id, dto.preferences);

        return {
            statusCode: HttpStatus.OK,
            message: 'Offers compared successfully',
            data: result,
        };
    }

    /**
     * Get application statistics
     * GET /api/v1/financing/applications/stats
     */
    @Get('stats/summary')
    @ApiOperation({
        summary: 'Get application statistics',
        description: 'Returns summary statistics for user\'s applications',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Statistics retrieved successfully',
    })
    async getStatistics(@User() user: any) {
        // TODO: Implement statistics calculation
        // For now, return placeholder
        return {
            statusCode: HttpStatus.OK,
            data: {
                totalApplications: 0,
                pendingApplications: 0,
                approvedApplications: 0,
                totalAmount: 0,
                message: 'Statistics will be implemented in later phase',
            },
        };
    }
}
