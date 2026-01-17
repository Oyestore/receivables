import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean } from 'class-validator';
import { ReportFormat } from '../entities/report-template.entity';

export class CreateReportTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  templateConfig: Record<string, any>;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateReportTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  templateConfig?: Record<string, any>;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ExecuteReportDto {
  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  name: string;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class ReportQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
