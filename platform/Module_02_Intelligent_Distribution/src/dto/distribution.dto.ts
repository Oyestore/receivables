import { IsString, IsEnum, IsOptional, IsNumber, IsObject, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistributionRuleType, DistributionChannel } from '../entities/distribution-entities';

export class CreateDistributionRuleDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Rule name' })
  @IsString()
  ruleName: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DistributionRuleType, description: 'Type of distribution rule' })
  @IsEnum(DistributionRuleType)
  ruleType: DistributionRuleType;

  @ApiProperty({ description: 'Rule conditions as JSON object' })
  @IsObject()
  conditions: Record<string, any>;

  @ApiProperty({ enum: DistributionChannel, description: 'Target distribution channel' })
  @IsEnum(DistributionChannel)
  targetChannel: DistributionChannel;

  @ApiPropertyOptional({ description: 'Rule priority (higher = more priority)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiProperty({ description: 'User ID who created the rule' })
  @IsUUID()
  createdBy: string;
}

export class UpdateDistributionRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  ruleName?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DistributionRuleType, description: 'Type of distribution rule' })
  @IsOptional()
  @IsEnum(DistributionRuleType)
  ruleType?: DistributionRuleType;

  @ApiPropertyOptional({ description: 'Rule conditions as JSON object' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ enum: DistributionChannel, description: 'Target distribution channel' })
  @IsOptional()
  @IsEnum(DistributionChannel)
  targetChannel?: DistributionChannel;

  @ApiPropertyOptional({ description: 'Rule priority (higher = more priority)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  isActive?: boolean;
}

export class CreateDistributionAssignmentDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Invoice ID' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: DistributionChannel, description: 'Distribution channel' })
  @IsEnum(DistributionChannel)
  assignedChannel: DistributionChannel;

  @ApiPropertyOptional({ description: 'Rule ID that triggered this assignment' })
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @ApiProperty({ description: 'Reason for assignment' })
  @IsString()
  assignmentReason: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'], description: 'New status' })
  @IsEnum(['pending', 'sent', 'delivered', 'failed', 'bounced'])
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

  @ApiPropertyOptional({ description: 'Error message if status is failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class DistributionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ enum: DistributionChannel, description: 'Filter by channel' })
  @IsOptional()
  @IsEnum(DistributionChannel)
  channel?: DistributionChannel;

  @ApiPropertyOptional({ enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'], description: 'Filter by status' })
  @IsOptional()
  @IsEnum(['pending', 'sent', 'delivered', 'failed', 'bounced'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by rule ID' })
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
