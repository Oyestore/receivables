import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsObject, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { DecisionType, Priority } from '../entities/credit-decision.entity';

export class GlEntryDto {
  @IsUUID()
  accountId: string;

  @IsEnum(['debit', 'credit'])
  entryType: 'debit' | 'credit';

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  projectCode?: string;
}

export class CreateCreditDecisionDto {
  @IsUUID()
  entityId: string;

  @IsString()
  entityType: string;

  @IsEnum(DecisionType)
  decisionType: DecisionType;

  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsObject()
  context: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateCreditDecisionDto {
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'manual_review', 'escalated', 'expired'])
  status?: string;

  @IsOptional()
  @IsNumber()
  approvedAmount?: number;

  @IsOptional()
  @IsString()
  decisionReason?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
