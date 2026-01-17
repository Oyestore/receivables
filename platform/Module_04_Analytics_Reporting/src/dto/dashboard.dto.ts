import { IsString, IsOptional, IsEnum, IsObject, IsBoolean, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DashboardType } from '../entities/dashboard.entity';

export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DashboardType)
  @IsOptional()
  type?: DashboardType;

  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDashboardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DashboardType)
  @IsOptional()
  type?: DashboardType;

  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class DashboardQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(DashboardType)
  @IsOptional()
  type?: DashboardType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPublic?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];

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
