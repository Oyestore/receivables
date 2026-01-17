import { IsString, IsUUID, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested, IsEnum, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

export class CreateInvoiceLineItemDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsNumber()
  tax_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  discount_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  order_index?: number = 0;
}

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsUUID()
  tenant_id: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  invoice_number: string;

  @IsNotEmpty()
  @IsDateString()
  issue_date: string; // Use string for DTO, will be converted to Date in service

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus = InvoiceStatus.DRAFT;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string = 'INR';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms_and_conditions?: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsOptional()
  @IsString()
  ai_extraction_source?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items: CreateInvoiceLineItemDto[];
}

export class UpdateInvoiceLineItemDto extends CreateInvoiceLineItemDto {
  @IsOptional()
  @IsUUID()
  id?: string; // For identifying existing line items during update
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  invoice_number?: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms_and_conditions?: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceLineItemDto)
  line_items?: UpdateInvoiceLineItemDto[];
}

