import { IsString, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskLevel } from './risk-level.enum';

export class RiskIndicatorDto {
    @IsString()
    type: string;

    @IsString()
    description: string;

    @IsEnum(RiskLevel)
    riskLevel: RiskLevel;

    @IsNumber()
    confidence: number;
}

export class RiskAssessmentDto {
    @IsString()
    buyerId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RiskIndicatorDto)
    indicators: RiskIndicatorDto[];

    @IsEnum(RiskLevel)
    overallRisk: RiskLevel;
}