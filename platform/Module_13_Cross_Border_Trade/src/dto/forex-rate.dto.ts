import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrencyPair } from '../entities/forex-rate.entity';

export class CreateForexRateDto {
  @IsEnum(CurrencyPair)
  currencyPair: CurrencyPair;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsNumber()
  lockedRate?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lockedUntil?: Date;

  @IsOptional()
  @IsNumber()
  spread?: number;

  @IsOptional()
  @IsNumber()
  commission?: number;
}

export class UpdateForexRateDto {
  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsNumber()
  lockedRate?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lockedUntil?: Date;

  @IsOptional()
  @IsNumber()
  spread?: number;

  @IsOptional()
  @IsNumber()
  commission?: number;
}

export class CurrencyConversionDto {
  @IsString()
  fromCurrency: string;

  @IsString()
  toCurrency: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsBoolean()
  lockRate?: boolean;

  @IsOptional()
  @IsNumber()
  lockDurationMinutes?: number;
}

export class LockRateDto {
  @IsString()
  fromCurrency: string;

  @IsString()
  toCurrency: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}

export class HedgeCalculationDto {
  @IsNumber()
  amount: number;

  @IsString()
  fromCurrency: string;

  @IsString()
  toCurrency: string;

  @IsOptional()
  @IsNumber()
  hedgePercentage?: number;
}
