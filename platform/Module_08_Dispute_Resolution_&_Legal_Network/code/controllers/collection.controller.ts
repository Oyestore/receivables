import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CollectionManagementService } from '../services/collection-management.service';
import { CollectionSequenceService } from '../services/collection-sequence.service';
import { CollectionStatus, CollectionStrategy } from '../entities/collection-case.entity';

@ApiTags('Collections')
@Controller('api/v1/collections')
export class CollectionController {
    constructor(
        private readonly collectionService: CollectionManagementService,
        private readonly sequenceService: CollectionSequenceService,
    ) { }

    /**
     * Create collection case
     */
    @Post('cases')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new collection case' })
    async createCase(
        @Body() body: {
            tenantId: string;
            disputeId?: string;
            customerId: string;
            customerName: string;
            invoiceId: string;
            outstandingAmount: number;
            originalAmount: number;
            strategy: CollectionStrategy;
            createdBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.createCase(body);

        // Start automated sequence
        await this.sequenceService.startSequence(
            collectionCase.id,
            body.tenantId,
            body.strategy === CollectionStrategy.FRIENDLY_REMINDER ? 'friendly' :
                body.strategy === CollectionStrategy.LEGAL_ACTION ? 'legal' : 'formal',
        );

        return {
            success: true,
            data: collectionCase,
        };
    }

    /**
     * Convert dispute to collection case
     */
    @Post('convert-from-dispute')
    @ApiOperation({ summary: 'Convert dispute to collection case' })
    async convertFromDispute(
        @Body() body: {
            disputeId: string;
            tenantId: string;
            createdBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.convertFromDispute(
            body.disputeId,
            body.tenantId,
            body.createdBy,
        );

        return {
            success: true,
            data: collectionCase,
            message: 'Dispute converted to collection case',
        };
    }

    /**
     * Record payment
     */
    @Post('cases/:id/payment')
    @ApiOperation({ summary: 'Record payment for collection case' })
    async recordPayment(
        @Param('id') caseId: string,
        @Body() body: {
            tenantId: string;
            amount: number;
            paymentMethod: string;
            recordedBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.recordPayment(
            caseId,
            body.tenantId,
            body.amount,
            body.paymentMethod,
            body.recordedBy,
        );

        return {
            success: true,
            data: collectionCase,
            message: 'Payment recorded successfully',
        };
    }

    /**
     * Propose settlement
     */
    @Post('cases/:id/settlement')
    @ApiOperation({ summary: 'Propose settlement' })
    async proposeSettlement(
        @Param('id') caseId: string,
        @Body() body: {
            tenantId: string;
            proposedAmount: number;
            terms: string;
            proposedBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.proposeSettlement(
            caseId,
            body.tenantId,
            body.proposedAmount,
            body.terms,
            body.proposedBy,
        );

        return {
            success: true,
            data: collectionCase,
            message: 'Settlement proposed',
        };
    }

    /**
     * Accept settlement
     */
    @Put('cases/:id/settlement/accept')
    @ApiOperation({ summary: 'Accept settlement' })
    async acceptSettlement(
        @Param('id') caseId: string,
        @Body() body: {
            tenantId: string;
            agreedAmount: number;
            acceptedBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.acceptSettlement(
            caseId,
            body.tenantId,
            body.agreedAmount,
            body.acceptedBy,
        );

        return {
            success: true,
            data: collectionCase,
            message: 'Settlement accepted',
        };
    }

    /**
     * Write off case
     */
    @Post('cases/:id/write-off')
    @ApiOperation({ summary: 'Write off collection case as bad debt' })
    async writeOff(
        @Param('id') caseId: string,
        @Body() body: {
            tenantId: string;
            reason: string;
            writtenOffBy: string;
        },
    ) {
        const collectionCase = await this.collectionService.writeOff(
            caseId,
            body.tenantId,
            body.reason,
            body.writtenOffBy,
        );

        return {
            success: true,
            data: collectionCase,
            message: 'Case written off as bad debt',
        };
    }

    /**
     * Get collection case
     */
    @Get('cases/:id')
    @ApiOperation({ summary: 'Get collection case by ID' })
    async getCase(
        @Param('id') caseId: string,
        @Query('tenantId') tenantId: string,
    ) {
        const collectionCase = await this.collectionService.getCaseById(caseId, tenantId);
        const sequence = await this.sequenceService.getSequence(caseId, tenantId);

        return {
            success: true,
            data: {
                case: collectionCase,
                sequence,
            },
        };
    }

    /**
     * Get active cases
     */
    @Get('cases')
    @ApiOperation({ summary: 'Get active collection cases' })
    async getActiveCases(
        @Query('tenantId') tenantId: string,
        @Query('assignedTo') assignedTo?: string,
    ) {
        const cases = await this.collectionService.getActiveCases(tenantId, assignedTo);

        return {
            success: true,
            data: cases,
        };
    }

    /**
     * Get collection statistics
     */
    @Get('stats/:tenantId')
    @ApiOperation({ summary: 'Get collection statistics' })
    async getStatistics(@Param('tenantId') tenantId: string) {
        const stats = await this.collectionService.getStatistics(tenantId);

        return {
            success: true,
            data: stats,
        };
    }

    /**
     * Pause collection sequence
     */
    @Post('sequences/:id/pause')
    @ApiOperation({ summary: 'Pause collection sequence' })
    async pauseSequence(
        @Param('id') sequenceId: string,
        @Query('tenantId') tenantId: string,
    ) {
        const sequence = await this.sequenceService.pauseSequence(sequenceId, tenantId);

        return {
            success: true,
            data: sequence,
            message: 'Sequence paused',
        };
    }

    /**
     * Resume collection sequence
     */
    @Post('sequences/:id/resume')
    @ApiOperation({ summary: 'Resume collection sequence' })
    async resumeSequence(
        @Param('id') sequenceId: string,
        @Query('tenantId') tenantId: string,
    ) {
        const sequence = await this.sequenceService.resumeSequence(sequenceId, tenantId);

        return {
            success: true,
            data: sequence,
            message: 'Sequence resumed',
        };
    }

    /**
     * Cancel collection sequence
     */
    @Post('sequences/:id/cancel')
    @ApiOperation({ summary: 'Cancel collection sequence' })
    async cancelSequence(
        @Param('id') sequenceId: string,
        @Query('tenantId') tenantId: string,
    ) {
        const sequence = await this.sequenceService.cancelSequence(sequenceId, tenantId);

        return {
            success: true,
            data: sequence,
            message: 'Sequence cancelled',
        };
    }
}
