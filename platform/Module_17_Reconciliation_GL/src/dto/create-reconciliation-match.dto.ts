import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum MatchType {
  EXACT = 'exact',
  FUZZY = 'fuzzy',
  MANUAL = 'manual',
  PREDICTIVE = 'predictive',
}

export enum MatchStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  OVERRIDDEN = 'overridden',
}

export class CreateReconciliationMatchDto {
  @IsUUID()
  bankTransactionId: string;

  @IsUUID()
  glEntryId: string;

  @IsEnum(MatchType)
  matchType: MatchType;

  @IsNumber()
  confidenceScore: number;

  @IsOptional()
  @IsString()
  matchingCriteria?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isAutoMatched?: boolean;

  @IsOptional()
  @IsString()
  matchedBy?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  matchDate?: Date;
}

export class UpdateReconciliationMatchDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class CreateSuspenseAccountDto {
  @IsString()
  accountName: string;

  @IsString()
  accountCode: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class MoveToSuspenseDto {
  @IsUUID()
  transactionId: string;

  @IsUUID()
  suspenseAccountId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  userId: string;
}
