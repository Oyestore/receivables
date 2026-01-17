import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class CreateExchangeRateDto {
    @IsString()
    fromCurrency: string;

    @IsString()
    toCurrency: string;

    @IsNumber()
    rate: number;

    @IsDateString()
    rateDate: string;

    @IsOptional()
    @IsEnum(['manual', 'api', 'bank'])
    source?: 'manual' | 'api' | 'bank';
}

export class CurrencyConversionDto {
    @IsNumber()
    amount: number;

    @IsString()
    fromCurrency: string;

    @IsString()
    toCurrency: string;
}

export class UpdateLocalizationDto {
    @IsOptional()
    @IsString()
    languageCode?: string;

    @IsOptional()
    @IsString()
    countryCode?: string;

    @IsOptional()
    @IsString()
    currencyCode?: string;

    @IsOptional()
    @IsString()
    timezone?: string;

    @IsOptional()
    @IsString()
    dateFormat?: string;

    @IsOptional()
    @IsString()
    timeFormat?: string;
}

export class CreateTranslationDto {
    @IsString()
    languageCode: string;

    @IsString()
    translationKey: string;

    @IsString()
    translatedText: string;

    @IsOptional()
    @IsString()
    context?: string;
}
