import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateClientPreferenceDto {
  @IsNotEmpty()
  @IsUUID()
  tenant_id: string;

  @IsNotEmpty()
  @IsUUID()
  client_id: string;

  @IsOptional()
  @IsString()
  default_payment_terms?: string;

  @IsOptional()
  @IsString()
  default_notes?: string;

  @IsOptional()
  @IsUUID()
  default_invoice_template_id?: string;
}

export class UpdateClientPreferenceDto {
  @IsOptional()
  @IsString()
  default_payment_terms?: string;

  @IsOptional()
  @IsString()
  default_notes?: string;

  @IsOptional()
  @IsUUID()
  default_invoice_template_id?: string;
}

