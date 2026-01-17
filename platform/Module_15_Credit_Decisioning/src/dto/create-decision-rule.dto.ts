import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsObject, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleType, RuleStatus, Operator, ActionType } from '../entities/decision-rule.entity';

export class CreateDecisionRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RuleType)
  ruleType: RuleType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  entityTypes: string[];

  @IsArray()
  decisionTypes: string[];

  @IsArray()
  conditions: Array<{
    @IsString()
    field: string;
    
    @IsEnum(Operator)
    operator: Operator;
    
    value: any;
    
    @IsOptional()
    @IsNumber()
    weight?: number;
    
    @IsOptional()
    @IsString()
    description?: string;
  }>;

  @IsArray()
  actions: Array<{
    @IsEnum(ActionType)
    type: ActionType;
    
    @IsObject()
    parameters: Record<string, any>;
    
    @IsOptional()
    @IsObject()
    conditions?: Record<string, any>;
  }>;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  canBeOverridden?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveTo?: Date;
}

export class UpdateDecisionRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RuleStatus)
  status?: RuleStatus;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsArray()
  conditions?: Array<{
    @IsString()
    field: string;
    
    @IsEnum(Operator)
    operator: Operator;
    
    value: any;
    
    @IsOptional()
    @IsNumber()
    weight?: number;
    
    @IsOptional()
    @IsString()
    description?: string;
  }>;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    @IsEnum(ActionType)
    type: ActionType;
    
    @IsObject()
    parameters: Record<string, any>;
    
    @IsOptional()
    @IsObject()
    conditions?: Record<string, any>;
  }>;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveTo?: Date;
}
