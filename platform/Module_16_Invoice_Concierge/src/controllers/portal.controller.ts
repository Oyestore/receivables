import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Req,
    HttpCode,
    HttpStatus,
    Logger,
    Res
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StaticPortalService, InvoiceViewData, PaymentSessionData, DisputeTicketData } from '../services/static-portal.service';
import { PortalAccessMode } from '../entities/payer-portal-session.entity';

/**
 * DTO for generating access token
 */
class GenerateTokenDto {
    tenantId: string;
    invoiceId: string;
    recipientId?: string;
    accessMode?: PortalAccessMode;
}

/**
 * DTO for raising dispute
 */
class RaiseDisputeDto {
    reason: string;
    category?: string;
}

/**
 * DTO for initiating payment
 */
class InitiatePaymentDto {
    paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING';
}

/**
 * Portal Controller
 * Public endpoints for invoice viewing and actions - NO AUTHENTICATION REQUIRED
 * Access is controlled via secure tokens
 */
@ApiTags('portal')
@Controller('portal')
export class PortalController {
    private readonly logger = new Logger(PortalController.name);

    constructor(private readonly staticPortalService: StaticPortalService) { }

    /**
     * Generate access token for invoice (Internal API - requires auth)
     * This endpoint should be protected by guards in production
     */
    @Post('tokens/generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Generate access token for invoice portal' })
    @ApiResponse({ status: 201, description: 'Token generated successfully' })
    @ApiBody({ type: GenerateTokenDto })
    async generateToken(
        @Body() dto: GenerateTokenDto
    ): Promise<{ token: string; expiresAt: Date; portalUrl: string }> {
        this.logger.log(`Generating portal token for invoice: ${dto.invoiceId}`);

        return this.staticPortalService.generateAccessToken(
            dto.tenantId,
            dto.invoiceId,
            dto.recipientId,
            dto.accessMode
        );
    }

    /**
     * Revoke access token (Internal API - requires auth)
     */
    @Post('tokens/:token/revoke')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke portal access token' })
    @ApiParam({ name: 'token', description: 'Access token to revoke' })
    async revokeToken(@Param('token') token: string): Promise<void> {
        this.logger.log(`Revoking portal token`);
        await this.staticPortalService.revokeToken(token);
    }

    // ==================== PUBLIC ENDPOINTS (No Auth) ====================

    /**
     * View invoice details (PUBLIC - No auth required)
     */
    @Get('invoice/:token')
    @ApiOperation({ summary: 'View invoice via portal (public)' })
    @ApiParam({ name: 'token', description: 'Secure access token' })
    @ApiResponse({ status: 200, description: 'Invoice details returned' })
    @ApiResponse({ status: 404, description: 'Invalid or expired token' })
    async viewInvoice(
        @Param('token') token: string,
        @Req() req: Request
    ): Promise<InvoiceViewData> {
        const ipAddress = req.ip || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];

        this.logger.log(`Invoice view via portal, IP: ${ipAddress}`);

        return this.staticPortalService.getInvoiceView(token, ipAddress, userAgent);
    }

    /**
     * Download invoice PDF (PUBLIC)
     */
    @Get('invoice/:token/pdf')
    @ApiOperation({ summary: 'Download invoice PDF (public)' })
    @ApiParam({ name: 'token', description: 'Secure access token' })
    @ApiResponse({ status: 200, description: 'PDF file stream' })
    async downloadPdf(
        @Param('token') token: string,
        @Res() res: Response
    ): Promise<void> {
        this.logger.log(`PDF download requested via portal`);
        const { buffer, filename } = await this.staticPortalService.downloadPDF(token);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }

    /**
     * Initiate payment (PUBLIC)
     */
    @Post('invoice/:token/pay')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Initiate payment for invoice (public)' })
    @ApiParam({ name: 'token', description: 'Secure access token' })
    @ApiBody({ type: InitiatePaymentDto })
    @ApiResponse({ status: 200, description: 'Payment session created' })
    async initiatePayment(
        @Param('token') token: string,
        @Body() dto: InitiatePaymentDto
    ): Promise<PaymentSessionData> {
        this.logger.log(`Payment initiation via portal`);
        return this.staticPortalService.initiatePayment(token, dto.paymentMethod);
    }

    /**
     * Raise dispute (PUBLIC)
     */
    @Post('invoice/:token/dispute')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Raise dispute for invoice (public)' })
    @ApiParam({ name: 'token', description: 'Secure access token' })
    @ApiBody({ type: RaiseDisputeDto })
    @ApiResponse({ status: 201, description: 'Dispute ticket created' })
    async raiseDispute(
        @Param('token') token: string,
        @Body() dto: RaiseDisputeDto
    ): Promise<DisputeTicketData> {
        this.logger.log(`Dispute raised via portal`);
        return this.staticPortalService.raiseDispute(token, dto.reason, dto.category);
    }

    /**
     * Approve draft invoice (PUBLIC)
     */
    @Post('invoice/:token/approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve draft invoice (public)' })
    @ApiParam({ name: 'token', description: 'Secure access token' })
    @ApiResponse({ status: 200, description: 'Draft approved' })
    async approveDraft(
        @Param('token') token: string
    ): Promise<{ success: boolean; message: string }> {
        this.logger.log(`Draft approval via portal`);
        return this.staticPortalService.approveDraft(token);
    }

    /**
     * Get session analytics (Internal API)
     */
    @Get('analytics/:token')
    @ApiOperation({ summary: 'Get portal session analytics' })
    @ApiParam({ name: 'token', description: 'Access token' })
    async getAnalytics(
        @Param('token') token: string
    ): Promise<{
        viewCount: number;
        actions: Array<{ type: string; timestamp: Date }>;
        firstAccess: Date;
        lastAccess: Date;
    }> {
        return this.staticPortalService.getSessionAnalytics(token);
    }

    /**
     * Health check endpoint for portal
     */
    @Get('health')
    @ApiOperation({ summary: 'Portal health check' })
    healthCheck(): { status: string; timestamp: string } {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString()
        };
    }
}
