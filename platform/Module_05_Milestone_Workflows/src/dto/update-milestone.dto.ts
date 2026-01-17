import { IsString, IsOptional, IsEnum, IsNumber, IsDate, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneType, MilestonePriority, MilestoneStatus } from '../entities/milestone.entity';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MilestoneType)
  milestoneType?: MilestoneType;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsEnum(MilestonePriority)
  priority?: MilestonePriority;

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
  progressPercentage?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  verifiedDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  approvedDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualHours?: number;

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
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsString()
  tenantId: string;
}
