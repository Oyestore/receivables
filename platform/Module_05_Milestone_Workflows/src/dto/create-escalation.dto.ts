import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { EscalationType, EscalationSeverity } from '../entities/milestone-escalation.entity';

export class CreateEscalationDto {
  @IsString()
  milestoneId: string;

  @IsString()
  tenantId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EscalationType)
  escalationType: EscalationType;

  @IsEnum(EscalationSeverity)
  severity: EscalationSeverity;

  @IsOptional()
  @IsString()
  escalatedTo?: string;

  @IsOptional()
  @IsString()
  escalatedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  context?: string[];

  @IsOptional()
  @IsArray()
  impact?: string[];

  @IsOptional()
  @IsArray()
  stakeholders?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  requiredActions?: string[];

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
