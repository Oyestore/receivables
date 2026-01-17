import { IsString, IsOptional, IsObject, IsArray, IsBoolean, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AnomalySeverity } from '../entities/anomaly-detection.entity';
import { InsightType } from '../entities/ai-insight.entity';

export class DateRangeDto {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;
}

export class AnalyticsQueryDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsObject()
  @IsOptional()
  dateRange?: DateRangeDto;

  @IsArray()
  @IsOptional()
  metrics?: string[];

  @IsArray()
  @IsOptional()
  dimensions?: string[];

  @IsArray()
  @IsOptional()
  filters?: Record<string, any>[];

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
  @Max(1000)
  limit?: number;
}

export class RevenueMetricsDto extends AnalyticsQueryDto {
  @IsString()
  tenantId: string;

  @IsObject()
  dateRange: DateRangeDto;

  @IsArray()
  @IsOptional()
  groupBy?: string[];
}

export class AgingReportDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  asOfDate?: string;
}

export class CashFlowProjectionDto {
  @IsString()
  tenantId: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(365)
  days?: number;

  @IsBoolean()
  @IsOptional()
  includeConfidence?: boolean;
}

export class AnomalyDetectionDto {
  @IsString()
  tenantId: string;

  @IsEnum(AnomalySeverity)
  @IsOptional()
  minSeverity?: AnomalySeverity;

  @IsString()
  @IsOptional()
  metricName?: string;

  @IsObject()
  @IsOptional()
  dateRange?: DateRangeDto;

  @IsBoolean()
  @IsOptional()
  includeResolved?: boolean;
}

export class AIInsightsDto {
  @IsString()
  tenantId: string;

  @IsEnum(InsightType)
  @IsOptional()
  type?: InsightType;

  @IsBoolean()
  @IsOptional()
  isActionable?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0.5)
  @Max(1.0)
  minConfidence?: number;
}

export class PerformanceMetricsDto {
  @IsString()
  tenantId: string;

  @IsArray()
  @IsOptional()
  metricNames?: string[];

  @IsObject()
  @IsOptional()
  dateRange?: DateRangeDto;

  @IsArray()
  @IsOptional()
  dimensions?: string[];
}
