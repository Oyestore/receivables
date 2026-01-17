import { IsString, IsNotEmpty, IsObject, IsOptional, IsEnum } from "class-validator";
import { TemplateStatus } from "../entities/invoice-template-master.entity";

export class UpdateInvoiceTemplateMasterDetailsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}

