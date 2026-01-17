import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum EntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum JournalStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export class GlEntryDto {
  @IsUUID()
  accountId: string;

  @IsEnum(EntryType)
  entryType: EntryType;

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

export class CreateJournalEntryDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  entryDate?: Date;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlEntryDto)
  entries: GlEntryDto[];

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateJournalEntryDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(JournalStatus)
  status?: JournalStatus;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
