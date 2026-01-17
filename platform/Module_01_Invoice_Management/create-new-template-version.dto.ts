import { IsString, IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class CreateNewTemplateVersionDto {
  @IsObject()
  @IsNotEmpty()
  template_definition: Record<string, any>; // GrapesJS JSON data

  @IsOptional()
  @IsString()
  comment?: string;
}

