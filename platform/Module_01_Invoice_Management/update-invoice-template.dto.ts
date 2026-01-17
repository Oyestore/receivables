import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceTemplateDto } from './create-invoice-template.dto';
import { IsBoolean, IsOptional, IsString, MaxLength, IsObject, IsUUID } from 'class-validator';

export class UpdateInvoiceTemplateDto extends PartialType(CreateInvoiceTemplateDto) {
  // tenant_id and organization_id should generally not be updatable for an existing template
  // template_name might be updatable, or might require a different process (e.g., duplicate and rename)
  // For now, let's assume it can be updated, but this is a design consideration.

  @IsString()
  @IsOptional()
  @MaxLength(255)
  template_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject() // Or IsJSON()
  @IsOptional()
  template_definition?: any;

  @IsBoolean()
  @IsOptional()
  is_default_for_org?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  preview_image_url?: string;

  // Fields like is_system_template should typically not be updatable by users.
}

