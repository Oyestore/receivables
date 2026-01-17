import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    HttpStatus,
    Req,
    Headers,
} from '@nestjs/common';
import { CapitalFloatService } from '../services/capital-float.service';
import { LendingkartService } from '../services/lendingkart.service';

/**
 * Financing Partners Controller
 * REST API for Capital Float and Lendingkart integrations
 */
@Controller('financing')
export class FinancingController {
    constructor(
        private readonly capitalFloatService: CapitalFloatService,
        private readonly lendingkartService: LendingkartService,
    ) { }

    // ============================================
    // CAPITAL FLOAT ENDPOINTS
    // ============================================

    /**
     * Submit financing application to Capital Float
     * POST /financing/capital-float/apply
     */
    @Post('capital-float/apply')
    async submitCapitalFloatApplication(
        @Body() applicationData: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const application = await this.capitalFloatService.submitApplication(
            tenantId,
            applicationData,
        );

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Application submitted successfully to Capital Float',
            data: application,
        };
    }

    /**
     * Get Capital Float application status
     * GET /financing/capital-float/applications/:id
     */
    @Get('capital-float/applications/:id')
    async getCapitalFloatStatus(@Param('id') applicationId: string) {
        const status = await this.capitalFloatService.getApplicationStatus(applicationId);

        return {
            statusCode: HttpStatus.OK,
            data: status,
        };
    }

    /**
     * Get Capital Float offers
     * POST /financing/capital-float/offers
     */
    @Post('capital-float/offers')
    async getCapitalFloatOffers(@Body() customerProfile: any) {
        const offers = await this.capitalFloatService.getOffers(customerProfile);

        return {
            statusCode: HttpStatus.OK,
            data: offers,
        };
    }

    /**
     * Accept Capital Float offer
     * POST /financing/capital-float/accept
     */
    @Post('capital-float/accept')
    async acceptCapitalFloatOffer(
        @Body('applicationId') applicationId: string,
        @Body('offerId') offerId: string,
    ) {
        const result = await this.capitalFloatService.acceptOffer(applicationId, offerId);

        return {
            statusCode: HttpStatus.OK,
            message: 'Offer accepted successfully',
            data: result,
        };
    }

    /**
     * Capital Float webhook handler
     * POST /financing/capital-float/webhook
     */
    @Post('capital-float/webhook')
    async capitalFloatWebhook(
        @Body() payload: any,
        @Headers('x-cf-signature') signature: string,
    ) {
        const result = await this.capitalFloatService.handleWebhook(payload, signature);

        return {
            statusCode: HttpStatus.OK,
            message: 'Webhook processed successfully',
            data: result,
        };
    }

    /**
     * Calculate financing cost
     * POST /financing/capital-float/calculate-cost
     */
    @Post('capital-float/calculate-cost')
    async calculateCapitalFloatCost(
        @Body('amount') amount: number,
        @Body('interestRate') interestRate: number,
        @Body('tenure') tenure: number,
        @Body('processingFee') processingFee: number,
    ) {
        const cost = this.capitalFloatService.calculateFinancingCost(
            amount,
            interestRate,
            tenure,
            processingFee,
        );

        return {
            statusCode: HttpStatus.OK,
            data: cost,
        };
    }

    // ============================================
    // LENDINGKART ENDPOINTS
    // ============================================

    /**
     * Submit application to Lendingkart
     * POST /financing/lendingkart/apply
     */
    @Post('lendingkart/apply')
    async submitLendingkartApplication(
        @Body() applicationData: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const application = await this.lendingkartService.submitApplication(
            tenantId,
            applicationData,
        );

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Application submitted successfully to Lendingkart',
            data: application,
        };
    }

    /**
     * Get Lendingkart application status
     * GET /financing/lendingkart/applications/:id
     */
    @Get('lendingkart/applications/:id')
    async getLendingkartStatus(@Param('id') applicationId: string) {
        const status = await this.lendingkartService.getApplicationStatus(applicationId);

        return {
            statusCode: HttpStatus.OK,
            data: status,
        };
    }

    /**
     * Get Lendingkart offers
     * POST /financing/lendingkart/offers
     */
    @Post('lendingkart/offers')
    async getLendingkartOffers(@Body() criteria: any) {
        const offers = await this.lendingkartService.getOffers(criteria);

        return {
            statusCode: HttpStatus.OK,
            data: offers,
        };
    }

    /**
     * Calculate EMI
     * POST /financing/lendingkart/calculate-emi
     */
    @Post('lendingkart/calculate-emi')
    async calculateEMI(
        @Body('principal') principal: number,
        @Body('annualRate') annualRate: number,
        @Body('tenureMonths') tenureMonths: number,
    ) {
        const result = this.lendingkartService.calculateEMI(
            principal,
            annualRate,
            tenureMonths,
        );

        return {
            statusCode: HttpStatus.OK,
            data: result,
        };
    }

    /**
     * Lendingkart webhook handler
     * POST /financing/lendingkart/webhook
     */
    @Post('lendingkart/webhook')
    async lendingkartWebhook(
        @Body() payload: any,
        @Headers('x-lk-signature') signature: string,
    ) {
        const result = await this.lendingkartService.handleWebhook(payload, signature);

        return {
            statusCode: HttpStatus.OK,
            message: 'Webhook processed successfully',
            data: result,
        };
    }

    // ============================================
    // COMPARISON ENDPOINTS
    // ============================================

    /**
     * Compare offers from both lenders
     * POST /financing/compare-offers
     */
    @Post('compare-offers')
    async compareOffers(
        @Body('lendingkartOffer') lendingkartOffer: any,
        @Body('capitalFloatOffer') capitalFloatOffer: any,
    ) {
        const comparison = this.lendingkartService.compareOffers(
            lendingkartOffer,
            capitalFloatOffer,
        );

        return {
            statusCode: HttpStatus.OK,
            data: comparison,
        };
    }

    /**
     * Get offers from all lenders
     * POST /financing/get-all-offers
     */
    @Post('get-all-offers')
    async getAllOffers(
        @Body() customerProfile: any,
        @Req() req: any,
    ) {
        const [capitalFloatOffers, lendingkartOffers] = await Promise.all([
            this.capitalFloatService.getOffers(customerProfile).catch(() => []),
            this.lendingkartService.getOffers(customerProfile).catch(() => []),
        ]);

        return {
            statusCode: HttpStatus.OK,
            data: {
                capitalFloat: capitalFloatOffers,
                lendingkart: lendingkartOffers,
                total: capitalFloatOffers.length + lendingkartOffers.length,
            },
        };
    }
}
