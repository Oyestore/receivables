import { IsString, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';
import { CreditBureau } from './credit-bureau.enum';

export class CreateCreditAssessmentDto {
    @IsString()
    buyerId: string;

    @IsString()
    tenantId: string;

    @IsOptional()
    @IsEnum(CreditBureau)
    preferredBureau?: CreditBureau;

    @IsOptional()
    @IsObject()
    financialData?: any;

    @IsOptional()
    metadata?: Record<string, any>;
}