import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationType } from '../entities/milestone-verification.entity';

export class CreateVerificationDto {
  @IsString()
  milestoneId: string;

  @IsString()
  tenantId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(VerificationType)
  verificationType: VerificationType;

  @IsOptional()
  @IsString()
  verifiedBy?: string;

  @IsOptional()
  @IsArray()
  verifiers?: string[];

  @IsOptional()
  @IsArray()
  evidence?: any[];

  @IsOptional()
  @IsObject()
  verificationCriteria?: any;

  @IsOptional()
  @IsObject()
  approvalRequirements?: any;

  @IsOptional()
  @IsArray()
  requiredDocuments?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsObject()
  customFields?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
