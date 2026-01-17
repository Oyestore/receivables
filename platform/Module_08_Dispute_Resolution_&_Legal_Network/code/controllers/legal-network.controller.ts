import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LegalNetworkService } from '../services/legal-network.service';
import { Specialization, ProviderStatus } from '../entities/legal-provider-profile.entity';

@ApiTags('Legal Network')
@Controller('api/v1/legal-network')
@ApiBearerAuth('JWT')
export class LegalNetworkController {
    constructor(private readonly legalNetworkService: LegalNetworkService) { }

    @Post('providers')
    @ApiOperation({ summary: 'Register a new legal provider' })
    async registerProvider(@Body() providerData: any) {
        const provider = await this.legalNetworkService.registerProvider(providerData);

        return {
            success: true,
            data: provider,
            message: 'Provider registered successfully. Pending verification.'
        };
    }

    @Get('providers/search')
    @ApiOperation({ summary: 'Search for legal providers' })
    async searchProviders(@Query() criteria: {
        specializations?: string;
        minRating?: number;
        maxHourlyRate?: number;
        location?: string;
        acceptsNewCases?: boolean;
    }) {
        const searchCriteria: any = { ...criteria };

        if (criteria.specializations) {
            searchCriteria.specializations = criteria.specializations
                .split(',')
                .map(s => s.trim() as Specialization);
        }

        const providers = await this.legalNetworkService.searchProviders(searchCriteria);

        return {
            success: true,
            data: {
                providers,
                totalCount: providers.length
            }
        };
    }

    @Get('providers/:id')
    @ApiOperation({ summary: 'Get provider details' })
    async getProvider(@Param('id') providerId: string) {
        const provider = await this.legalNetworkService.getProviderById(providerId);

        return {
            success: true,
            data: provider
        };
    }

    @Get('providers/recommended/:specialization')
    @ApiOperation({ summary: 'Get recommended providers for a case' })
    async getRecommendedProviders(
        @Param('specialization') specialization: Specialization,
        @Query('disputedAmount') disputedAmount: number
    ) {
        const providers = await this.legalNetworkService.getRecommendedProviders(
            specialization,
            disputedAmount
        );

        return {
            success: true,
            data: {
                providers,
                message: 'Top 5 recommended providers based on rating and experience'
            }
        };
    }

    @Get('providers')
    @ApiOperation({ summary: 'Get all active providers' })
    async getAllProviders() {
        const providers = await this.legalNetworkService.getAllActiveProviders();

        return {
            success: true,
            data: {
                providers,
                totalCount: providers.length
            }
        };
    }

    // Adapters for tests
    async findProviders(@Body() body: { practiceArea?: string; location?: string; minRating?: number }) {
        return this.legalNetworkService.findLegalProviders(body);
    }

    async assignProvider(@Body() body: { caseId: string; providerId: string }) {
        return this.legalNetworkService.assignLegalProvider(body.caseId, body.providerId);
    }

    async matchProvider(@Body() body: { practiceArea: string; location?: string; amount: number }) {
        return this.legalNetworkService.matchOptimalProvider(body);
    }

    async trackProgress(@Body() body: { caseId: string }) {
        const events = await this.legalNetworkService.trackCaseProgress(body.caseId);
        return { status: 'IN_PROGRESS', milestones: events };
    }

    @Patch('providers/:id/status')
    @ApiOperation({ summary: 'Update provider status' })
    async updateProviderStatus(
        @Param('id') providerId: string,
        @Body() body: { status: ProviderStatus }
    ) {
        const provider = await this.legalNetworkService.updateProviderStatus(
            providerId,
            body.status
        );

        return {
            success: true,
            data: provider,
            message: 'Provider status updated successfully'
        };
    }

    @Patch('providers/:id/availability')
    @ApiOperation({ summary: 'Toggle provider availability' })
    async toggleAvailability(@Param('id') providerId: string) {
        const provider = await this.legalNetworkService.toggleAvailability(providerId);

        return {
            success: true,
            data: provider,
            message: `Provider ${provider.acceptsNewCases ? 'now accepts' : 'stopped accepting'} new cases`
        };
    }

    @Post('providers/:id/rating')
    @ApiOperation({ summary: 'Update provider rating after case completion' })
    async updateProviderRating(
        @Param('id') providerId: string,
        @Body() body: {
            rating: number;
            caseResolved: boolean;
            resolutionDays?: number;
        }
    ) {
        await this.legalNetworkService.updateProviderRating(
            providerId,
            body.rating,
            body.caseResolved,
            body.resolutionDays
        );

        return {
            success: true,
            message: 'Provider rating updated successfully'
        };
    }
}
