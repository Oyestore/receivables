import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { CreditAssessmentStatus } from './credit-assessment-status.enum';

export class UpdateCreditAssessmentDto {
    @IsOptional()
    @IsEnum(CreditAssessmentStatus)
    status?: CreditAssessmentStatus;

    @IsOptional()
    @IsNumber()
    score?: number;

    @IsOptional()
    comments?: string;

    @IsString()
    updatedBy: string;
}