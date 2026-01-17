import { IsString, IsOptional, IsEnum, IsObject, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WidgetType } from '../entities/dashboard-widget.entity';

export class CreateWidgetDto {
  @IsString()
  name: string;

  @IsEnum(WidgetType)
  type: WidgetType;

  @IsObject()
  position: Record<string, any>;

  @IsObject()
  config: Record<string, any>;

  @IsObject()
  dataSource: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(10)
  @Max(3600)
  refreshInterval?: number;
}

export class UpdateWidgetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(WidgetType)
  @IsOptional()
  type?: WidgetType;

  @IsObject()
  @IsOptional()
  position?: Record<string, any>;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  dataSource?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(10)
  @Max(3600)
  refreshInterval?: number;
}

export class WidgetQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(WidgetType)
  @IsOptional()
  type?: WidgetType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isVisible?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
