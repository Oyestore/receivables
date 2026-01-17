import { Controller, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscountService } from '../services/discount.service';

@ApiTags('Dynamic Discounting')
@Controller('api/v1/discounts')
@ApiBearerAuth('JWT')
export class DiscountController {
    constructor(private readonly discountService: DiscountService) { }

    @Post('offers')
    @ApiOperation({ summary: 'Create early payment discount offer' })
    async createOffer(
        @Body() body: { invoiceId: string; apr?: number; expiryDays?: number }
    ) {
        return await this.discountService.createOffer(
            body.invoiceId,
            body.apr,
            body.expiryDays
        );
    }

    @Patch('offers/:offerId/accept')
    @ApiOperation({ summary: 'Accept a discount offer' })
    async acceptOffer(@Param('offerId') offerId: string) {
        return await this.discountService.acceptOffer(offerId);
    }

    @Patch('offers/:offerId/reject')
    @ApiOperation({ summary: 'Reject a discount offer' })
    async rejectOffer(@Param('offerId') offerId: string) {
        return await this.discountService.rejectOffer(offerId);
    }
}
