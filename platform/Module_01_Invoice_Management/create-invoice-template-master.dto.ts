import { IsString, IsNotEmpty, IsObject, IsOptional } from "class-validator";
import { TemplateStatus } from "../entities/invoice-template-master.entity"; // Adjust path as needed

export class CreateInvoiceTemplateMasterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  // This will be the GrapesJS JSON data for the first version
  template_definition: Record<string, any>; 

  @IsOptional()
  @IsString()
  version_comment?: string; // Comment for the first version

  // organization_id will be taken from the authenticated user's context
  // created_by_user_id will be taken from the authenticated user's context
}

