import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    HttpStatus,
    Req,
} from '@nestjs/common';
import { QuickBooksService, QuickBooksTokens } from '../services/quickbooks.service';

/**
 * QuickBooks Integration Controller
 * REST API for accounting sync
 */
@Controller('accounting/quickbooks')
export class QuickBooksController {
    constructor(private readonly quickbooksService: QuickBooksService) { }

    /**
     * Get OAuth2 authorization URL
     * GET /accounting/quickbooks/auth/url
     */
    @Get('auth/url')
    getAuthUrl(@Query('state') state: string) {
        const url = this.quickbooksService.getAuthorizationUrl(state);

        return {
            statusCode: HttpStatus.OK,
            data: { authorizationUrl: url },
        };
    }

    /**
     * OAuth2 callback handler
     * POST /accounting/quickbooks/auth/callback
     */
    @Post('auth/callback')
    async handleCallback(@Body('code') authorizationCode: string) {
        const tokens = await this.quickbooksService.getTokens(authorizationCode);

        return {
            statusCode: HttpStatus.OK,
            message: 'QuickBooks connected successfully',
            data: tokens,
        };
    }

    /**
     * Refresh access token
     * POST /accounting/quickbooks/auth/refresh
     */
    @Post('auth/refresh')
    async refreshToken(@Body('refreshToken') refreshToken: string) {
        const tokens = await this.quickbooksService.refreshAccessToken(refreshToken);

        return {
            statusCode: HttpStatus.OK,
            message: 'Tokens refreshed successfully',
            data: tokens,
        };
    }

    /**
     * Sync invoices from QuickBooks
     * POST /accounting/quickbooks/sync/invoices
     */
    @Post('sync/invoices')
    async syncInvoices(
        @Body('tokens') tokens: QuickBooksTokens,
        @Body('sinceDate') sinceDate?: string,
    ) {
        const result = await this.quickbooksService.syncInvoicesFromQuickBooks(
            tokens,
            sinceDate ? new Date(sinceDate) : undefined,
        );

        return {
            statusCode: HttpStatus.OK,
            message: `Synced ${result.synced} invoices from QuickBooks`,
            data: result,
        };
    }

    /**
     * Push invoice to QuickBooks
     * POST /accounting/quickbooks/push/invoice
     */
    @Post('push/invoice')
    async pushInvoice(
        @Body('tokens') tokens: QuickBooksTokens,
        @Body('invoiceData') invoiceData: any,
    ) {
        const result = await this.quickbooksService.pushInvoiceToQuickBooks(
            tokens,
            invoiceData,
        );

        return {
            statusCode: result.success ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST,
            message: result.success
                ? 'Invoice pushed to QuickBooks successfully'
                : 'Failed to push invoice to QuickBooks',
            data: result,
        };
    }

    /**
     * Push payment to QuickBooks
     * POST /accounting/quickbooks/push/payment
     */
    @Post('push/payment')
    async pushPayment(
        @Body('tokens') tokens: QuickBooksTokens,
        @Body('paymentData') paymentData: any,
    ) {
        const result = await this.quickbooksService.pushPaymentToQuickBooks(
            tokens,
            paymentData,
        );

        return {
            statusCode: result.success ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST,
            message: result.success
                ? 'Payment pushed to QuickBooks successfully'
                : 'Failed to push payment to QuickBooks',
            data: result,
        };
    }

    /**
     * Get customers from QuickBooks
     * POST /accounting/quickbooks/customers
     */
    @Post('customers')
    async getCustomers(@Body('tokens') tokens: QuickBooksTokens) {
        const customers = await this.quickbooksService.getCustomers(tokens);

        return {
            statusCode: HttpStatus.OK,
            data: customers,
            count: customers.length,
        };
    }

    /**
     * Test QuickBooks connection
     * POST /accounting/quickbooks/test
     */
    @Post('test')
    async testConnection(@Body('tokens') tokens: QuickBooksTokens) {
        const connected = await this.quickbooksService.testConnection(tokens);

        return {
            statusCode: HttpStatus.OK,
            data: { connected },
            message: connected
                ? 'QuickBooks connection successful'
                : 'QuickBooks connection failed',
        };
    }
}
