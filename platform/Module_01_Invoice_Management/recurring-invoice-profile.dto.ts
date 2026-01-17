import { IsString, IsUUID, IsOptional, IsDateString, IsEnum, IsObject, ValidateNested, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency, RecurringStatus } from '../entities/recurring-invoice-profile.entity';
import { CreateInvoiceDto } from '../../invoices/dto/invoice.dto'; // For invoice_data structure

export class CreateRecurringInvoiceProfileDto {
  @IsNotEmpty()
  @IsUUID()
  tenant_id: string;

  @IsNotEmpty()
  @IsUUID()
  client_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  profile_name: string;

  @IsOptional()
  @IsUUID()
  source_invoice_id?: string;

  @IsNotEmpty()
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  next_run_date?: string; // Can be calculated or set manually

  @IsOptional()
  @IsEnum(RecurringStatus)
  status?: RecurringStatus = RecurringStatus.ACTIVE;

  @IsOptional()
  @IsObject()
  // Ideally, this should be a validated DTO, but for flexibility, we start with 'any'.
  // For better validation, you could use a specific DTO like a subset of CreateInvoiceDto
  // @ValidateNested()
  // @Type(() => CreateInvoiceDto) // Or a more specific RecurringInvoiceDataDto
  invoice_data?: any; 
}

export class UpdateRecurringInvoiceProfileDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  profile_name?: string;

  @IsOptional()
  @IsUUID()
  source_invoice_id?: string;

  @IsOptional()
  @IsEnum(RecurringFrequency)
  frequency?: RecurringFrequency;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  next_run_date?: string;

  @IsOptional()
  @IsEnum(RecurringStatus)
  status?: RecurringStatus;

  @IsOptional()
  @IsObject()
  // @ValidateNested()
  // @Type(() => CreateInvoiceDto) // Or a more specific RecurringInvoiceDataDto
  invoice_data?: any;
}

