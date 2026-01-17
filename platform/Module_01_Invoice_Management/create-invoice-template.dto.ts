import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsJSON, IsUUID, MaxLength, IsObject } from 'class-validator';

export class CreateInvoiceTemplateDto {
  @IsUUID()
  @IsNotEmpty()
  tenant_id: string;

  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  template_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject() // Or IsJSON() if you prefer to validate as a JSON string initially
  @IsNotEmpty()
  template_definition: any; // Consider creating a more specific DTO for this if structure is well-defined

  @IsBoolean()
  @IsOptional()
  is_system_template?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default_for_org?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  preview_image_url?: string;
}

