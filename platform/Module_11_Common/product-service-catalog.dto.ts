import { IsString, IsUUID, IsOptional, IsNumber, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateProductServiceCatalogDto {
  @IsNotEmpty()
  @IsUUID()
  tenant_id: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  item_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  default_unit_price?: number;

  @IsOptional()
  @IsUUID()
  default_tax_id?: string;
}

export class UpdateProductServiceCatalogDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  item_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  default_unit_price?: number;

  @IsOptional()
  @IsUUID()
  default_tax_id?: string;
}

