import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationType, VerificationStatus } from '../entities/milestone-verification.entity';

export class UpdateVerificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(VerificationType)
  verificationType?: VerificationType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
