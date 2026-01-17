import { IsString, IsOptional, IsEnum, IsNumber, IsDate, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneType, MilestonePriority } from '../entities/milestone.entity';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  tenantId: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsEnum(MilestoneType)
  milestoneType?: MilestoneType = MilestoneType.DELIVERABLE;

  @IsOptional()
  @IsEnum(MilestonePriority)
  priority?: MilestonePriority = MilestonePriority.MEDIUM;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number = 0;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  dependencies?: string[];

  @IsOptional()
  completionCriteria?: any;

  @IsOptional()
  verificationRequirements?: any;

  @IsOptional()
  paymentTerms?: any;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  customFields?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean = false;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
