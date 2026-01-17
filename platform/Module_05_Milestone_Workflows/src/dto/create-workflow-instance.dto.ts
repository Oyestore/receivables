import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean } from 'class-validator';
import { WorkflowInstancePriority } from '../entities/workflow-instance.entity';

export class CreateWorkflowInstanceDto {
  @IsString()
  name: string;

  @IsString()
  tenantId: string;

  @IsString()
  workflowDefinitionId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsEnum(WorkflowInstancePriority)
  priority?: WorkflowInstancePriority = WorkflowInstancePriority.MEDIUM;

  @IsOptional()
  @IsObject()
  context?: any;

  @IsOptional()
  @IsObject()
  variables?: any;

  @IsOptional()
  @IsArray()
  participants?: string[];

  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsObject()
  customFields?: any;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean = false;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
