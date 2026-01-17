import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EscalationType, EscalationSeverity, EscalationStatus } from '../entities/milestone-escalation.entity';

export class UpdateEscalationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EscalationType)
  escalationType?: EscalationType;

  @IsOptional()
  @IsEnum(EscalationSeverity)
  severity?: EscalationSeverity;

  @IsOptional()
  @IsEnum(EscalationStatus)
  status?: EscalationStatus;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
