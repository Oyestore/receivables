import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { GlobalizationService } from '../services/globalization.service';
import {
    CreateExchangeRateDto,
    CurrencyConversionDto,
    UpdateLocalizationDto,
    CreateTranslationDto,
} from '../dto/globalization.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../Module_12_Administration/src/guards/tenant.guard';

@Controller('api/v1/globalization')
@UseGuards(JwtAuthGuard, TenantGuard)
export class GlobalizationController {
    constructor(private readonly globalizationService: GlobalizationService) { }

    // Currency Exchange Rates
    @Post('exchange-rates')
    async createExchangeRate(@Request() req, @Body() dto: CreateExchangeRateDto) {
        return await this.globalizationService.createExchangeRate(req.user.tenantId, dto);
    }

    @Get('exchange-rates')
    async getAllExchangeRates(@Request() req) {
        return await this.globalizationService.getAllExchangeRates(req.user.tenantId);
    }

    @Get('exchange-rates/convert')
    async convertCurrency(@Request() req, @Query() dto: CurrencyConversionDto) {
        return await this.globalizationService.convertCurrency(req.user.tenantId, {
            ...dto,
            amount: Number(dto.amount),
        });
    }

    // Localization Settings
    @Get('settings')
    async getLocalizationSettings(@Request() req) {
        return await this.globalizationService.getLocalizationSettings(req.user.tenantId);
    }

    @Put('settings')
    async updateLocalizationSettings(@Request() req, @Body() dto: UpdateLocalizationDto) {
        return await this.globalizationService.updateLocalizationSettings(
            req.user.tenantId,
            dto,
        );
    }

    // Translations
    @Post('translations')
    async createTranslation(@Body() dto: CreateTranslationDto) {
        return await this.globalizationService.createTranslation(dto);
    }

    @Get('translations')
    async getTranslations(@Query('languageCode') languageCode: string) {
        return await this.globalizationService.getTranslations(languageCode);
    }

    // Supported Options
    @Get('currencies')
    async getSupportedCurrencies() {
        return await this.globalizationService.getSupportedCurrencies();
    }

    @Get('languages')
    async getSupportedLanguages() {
        return await this.globalizationService.getSupportedLanguages();
    }

    // Intelligence Features
    @Post('payment-optimization')
    async optimizePayment(@Request() req, @Body() body: any) {
        return await this.globalizationService.optimizePaymentRoute(req.user.tenantId, body);
    }

    @Get('cultural-insights')
    async getCulturalInsights(@Query('country') country: string) {
        return await this.globalizationService.getCulturalInsights(country);
    }

    @Post('adapt-message')
    async adaptMessage(@Body() body: any) {
        return await this.globalizationService.adaptCommunication(body);
    }

    @Post('compliance-check')
    async checkCompliance(@Body() body: { countryCode: string, invoice: any }) {
        return await this.globalizationService.validateInvoiceCompliance(body.countryCode, body.invoice);
    }
}
