import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { CampaignService } from '../services/campaign.service';
import { Campaign } from '../entities/campaign.entity';
import { JwtAuthGuard } from '../../../Module_12_Administration/src/guards/jwt-auth.guard';
import { RolesGuard } from '../../../Module_12_Administration/src/guards/roles.guard';
import { Roles } from '../../../Module_12_Administration/src/decorators/roles.decorator';

/**
 * Campaign Controller
 * Manages marketing campaigns for customer engagement
 */
@ApiTags('Campaigns')
@Controller('api/tenant/:tenantId/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignController {
    constructor(private readonly campaignService: CampaignService) { }

    @Post()
    @Roles('ADMIN', 'TENANT_ADMIN')
    @ApiOperation({ summary: 'Create a new campaign' })
    @ApiResponse({ status: 201, description: 'Campaign created successfully' })
    create(
        @Param('tenantId') tenantId: string,
        @Req() req: any,
        @Body() createCampaignDto: Partial<Campaign>,
    ) {
        return this.campaignService.createCampaign(tenantId, req.user.id, createCampaignDto);
    }

    @Get()
    @Roles('ADMIN', 'TENANT_ADMIN', 'USER')
    @ApiOperation({ summary: 'Get all campaigns for tenant' })
    @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
    findAll(@Param('tenantId') tenantId: string) {
        return this.campaignService.findAll(tenantId);
    }

    @Get(':id')
    @Roles('ADMIN', 'TENANT_ADMIN', 'USER')
    @ApiOperation({ summary: 'Get campaign by ID' })
    @ApiParam({ name: 'id', description: 'Campaign ID' })
    @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Campaign not found' })
    findOne(
        @Param('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        return this.campaignService.findOne(tenantId, id);
    }

    @Put(':id')
    @Roles('ADMIN', 'TENANT_ADMIN')
    @ApiOperation({ summary: 'Update campaign' })
    @ApiParam({ name: 'id', description: 'Campaign ID' })
    @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
    update(
        @Param('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() updateCampaignDto: Partial<Campaign>,
    ) {
        return this.campaignService.update(tenantId, id, updateCampaignDto);
    }

    @Post(':id/launch')
    @Roles('ADMIN', 'TENANT_ADMIN')
    @ApiOperation({ summary: 'Launch campaign immediately' })
    @ApiParam({ name: 'id', description: 'Campaign ID' })
    @ApiResponse({ status: 200, description: 'Campaign launched successfully' })
    @ApiResponse({ status: 400, description: 'Campaign not in launchable state' })
    launch(
        @Param('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        return this.campaignService.launchCampaign(tenantId, id);
    }

    @Get(':id/analytics')
    @Roles('ADMIN', 'TENANT_ADMIN', 'USER')
    @ApiOperation({ summary: 'Get campaign analytics' })
    @ApiParam({ name: 'id', description: 'Campaign ID' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    getAnalytics(@Param('tenantId') tenantId: string, @Param('id') id: string) {
        return this.campaignService.getCampaignAnalytics(tenantId, id);
    }
}
