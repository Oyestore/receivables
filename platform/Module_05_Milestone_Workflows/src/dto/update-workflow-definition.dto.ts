import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsBoolean } from 'class-validator';
import { WorkflowDefinitionType, WorkflowDefinitionStatus } from '../entities/workflow-definition.entity';

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowDefinitionType)
  workflowType?: WorkflowDefinitionType;

  @IsOptional()
  @IsEnum(WorkflowDefinitionStatus)
  status?: WorkflowDefinitionStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  workflowStructure?: {
    nodes: Array<{
      id: string;
      type: string;
      name?: string;
      data?: any;
      inputParameters?: any;
      outputParameters?: any;
      conditions?: any;
      transitions?: any;
      metadata?: any;
    }>;
    edges: Array<{
      from: string;
      to: string;
      condition?: string;
      label?: string;
    }>;
  };

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsArray()
  actions?: any[];

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsObject()
  customFields?: any;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateDescription?: string;

  @IsOptional()
  @IsArray()
  templateTags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
