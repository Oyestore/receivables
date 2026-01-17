import { IsString, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class RejectVerificationDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsArray()
  requiredChanges?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  resubmissionDeadline?: Date;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsArray()
  additionalEvidence?: string[];

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsOptional()
  @IsBoolean()
  createEscalation?: boolean = false;
}
