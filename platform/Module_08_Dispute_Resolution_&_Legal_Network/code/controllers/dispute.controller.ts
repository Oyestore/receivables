import { Controller, Post, Get, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisputeManagementService } from '../services/dispute-management.service';
import { DisputeStatus, DisputeType, DisputePriority } from '../entities/dispute-case.entity';

@ApiTags('Dispute Resolution')
@Controller('api/v1/disputes')
@ApiBearerAuth('JWT')
export class DisputeController {
    constructor(private readonly disputeService: DisputeManagementService) { }

    @Post('cases')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new dispute case' })
    async createDispute(@Body() body: {
        tenantId: string;
        invoiceId: string;
        customerId: string;
        customerName: string;
        type: DisputeType;
        disputedAmount: number;
        description: string;
        priority?: DisputePriority;
        createdBy: string;
    }) {
        const disputeCase = await this.disputeService.createDispute(body);

        return {
            success: true,
            data: disputeCase
        };
    }

    @Patch('cases/:id/file')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'File a dispute case' })
    async fileDispute(
        @Param('id') caseId: string,
        @Body() body: { filedBy: string }
    ) {
        const disputeCase = await this.disputeService.fileDispute(caseId, body.filedBy);

        return {
            success: true,
            data: disputeCase,
            message: 'Dispute case filed successfully'
        };
    }

    @Patch('cases/:id/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update dispute status' })
    async updateStatus(
        @Param('id') caseId: string,
        @Body() body: {
            status: DisputeStatus;
            updatedBy: string;
            notes?: string;
        }
    ) {
        const disputeCase = await this.disputeService.updateStatus(
            caseId,
            body.status,
            body.updatedBy,
            body.notes
        );

        return {
            success: true,
            data: disputeCase
        };
    }

    @Post('cases/:id/evidence')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add evidence to dispute case' })
    async addEvidence(
        @Param('id') caseId: string,
        @Body() body: {
            type: 'documents' | 'communications';
            data: any;
            addedBy: string;
        }
    ) {
        const disputeCase = await this.disputeService.addEvidence(
            caseId,
            body.type,
            body.data,
            body.addedBy
        );

        return {
            success: true,
            data: disputeCase,
            message: 'Evidence added successfully'
        };
    }

    @Patch('cases/:id/assign-provider')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Assign legal provider to case' })
    async assignProvider(
        @Param('id') caseId: string,
        @Body() body: {
            providerId: string;
            assignedBy: string;
        }
    ) {
        const disputeCase = await this.disputeService.assignLegalProvider(
            caseId,
            body.providerId,
            body.assignedBy
        );

        return {
            success: true,
            data: disputeCase,
            message: 'Legal provider assigned successfully'
        };
    }

    @Post('cases/:id/resolution')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Record case resolution' })
    async recordResolution(
        @Param('id') caseId: string,
        @Body() body: {
            type: string;
            amount: number;
            terms: string;
            resolvedBy: string;
        }
    ) {
        const { resolvedBy, ...resolution } = body;
        const disputeCase = await this.disputeService.recordResolution(
            caseId,
            resolution,
            resolvedBy
        );

        return {
            success: true,
            data: disputeCase,
            message: 'Resolution recorded successfully'
        };
    }

    @Get('cases/:id')
    @ApiOperation({ summary: 'Get dispute case by ID' })
    async getDispute(@Param('id') caseId: string) {
        const disputeCase = await this.disputeService.getDisputeById(caseId);

        return {
            success: true,
            data: disputeCase
        };
    }

    // Adapters for tests
    async getDisputeById(@Param('id') caseId: string) {
        return this.disputeService.getDisputeById(caseId);
    }

    async assignDispute(@Body() body: { caseId: string; agentId: string; tenantId: string }) {
        return this.disputeService.assignDispute(body.caseId, body.agentId, body.tenantId);
    }

    async getStatistics(@Body() req: any) {
        const tenantId = req?.user?.tenantId || req?.tenantId || '';
        return this.disputeService.getDisputeStats(tenantId);
    }

    @Get('cases')
    @ApiOperation({ summary: 'Get disputes by tenant' })
    async getDisputesByTenant(
        @Query('tenantId') tenantId: string,
        @Query('status') status?: DisputeStatus
    ) {
        const disputes = await this.disputeService.getDisputesByTenant(tenantId, status);

        return {
            success: true,
            data: {
                disputes,
                totalCount: disputes.length
            }
        };
    }

    @Get('invoice/:invoiceId')
    @ApiOperation({ summary: 'Get disputes for an invoice' })
    async getDisputesByInvoice(@Param('invoiceId') invoiceId: string) {
        const disputes = await this.disputeService.getDisputesByInvoice(invoiceId);

        return {
            success: true,
            data: disputes
        };
    }

    @Get('stats/:tenantId')
    @ApiOperation({ summary: 'Get dispute statistics' })
    async getDisputeStats(@Param('tenantId') tenantId: string) {
        const stats = await this.disputeService.getDisputeStats(tenantId);

        return {
            success: true,
            data: stats
        };
    }
}
