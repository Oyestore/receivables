import { IsString, IsNumber, IsDate, IsEnum, IsOptional, IsArray, IsObject, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum AutomationLevel {
  MANUAL = 'manual',
  ASSISTED = 'assisted',
  SEMI_AUTOMATED = 'semi_automated',
  FULLY_AUTOMATED = 'fully_automated',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateAutomationConfigurationDto {
  @IsString()
  workflowId: string;

  @IsEnum(AutomationLevel)
  automationLevel: AutomationLevel;

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsBoolean()
  humanOversight: boolean;

  @IsString()
  fallbackMechanism: string;

  @IsArray()
  @IsString({ each: true })
  decisionPoints: string[];

  @IsBoolean()
  learningEnabled: boolean;

  @IsBoolean()
  adaptationEnabled: boolean;

  @IsArray()
  @IsObject({ each: true })
  humanInterventionPoints: Array<{
    step: number;
    condition: string;
    requiredAction: string;
    escalationLevel: number;
    timeout: number;
  }>;
}

export class ExecuteWorkflowDto {
  @IsString()
  workflowId: string;

  @IsObject()
  context: {
    workflowData: Record<string, any>;
    userData: Record<string, any>;
    businessData: Record<string, any>;
    historicalData: Record<string, any>;
    marketConditions: Record<string, any>;
  };

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledAt?: Date;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class AdaptWorkflowDto {
  @IsString()
  workflowId: string;

  @IsObject()
  insights: {
    executionId: string;
    patterns: Array<{
      type: string;
      pattern: string;
      frequency: number;
      confidence: number;
      impact: string;
    }>;
    recommendations: Array<{
      category: string;
      recommendation: string;
      expectedBenefit: string;
      implementationComplexity: string;
      priority: string;
    }>;
    performanceImprovements: Array<{
      area: string;
      currentPerformance: number;
      targetPerformance: number;
      improvementStrategy: string;
      estimatedImpact: number;
    }>;
    adaptationSuggestions: Array<{
      component: string;
      adaptation: string;
      confidence: number;
      riskLevel: string;
      rollbackPlan: string;
    }>;
  };

  @IsOptional()
  @IsBoolean()
  forceAdaptation?: boolean;

  @IsOptional()
  @IsString()
  reasonForAdaptation?: string;
}

export class OptimizeParametersDto {
  @IsString()
  tenantId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetWorkflows?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetParameters?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  optimizationIntensity?: number;

  @IsOptional()
  @IsBoolean()
  includeMLModels?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class GetAnalyticsDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly'])
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  components?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];
}

export class CreateDecisionPointDto {
  @IsString()
  id: string;

  @IsEnum(['approval', 'routing', 'escalation', 'notification'])
  type: 'approval' | 'routing' | 'escalation' | 'notification';

  @IsString()
  condition: string;

  @IsBoolean()
  automatedDecision: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsString()
  fallbackAction: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class CreateInterventionPointDto {
  @IsNumber()
  @Min(1)
  step: number;

  @IsString()
  condition: string;

  @IsString()
  requiredAction: string;

  @IsNumber()
  @Min(1)
  escalationLevel: number;

  @IsNumber()
  @Min(0)
  timeout: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class UpdateAutomationConfigurationDto {
  @IsOptional()
  @IsEnum(AutomationLevel)
  automationLevel?: AutomationLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsBoolean()
  humanOversight?: boolean;

  @IsOptional()
  @IsString()
  fallbackMechanism?: string;

  @IsOptional()
  @IsBoolean()
  learningEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  adaptationEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  decisionPoints?: Array<CreateDecisionPointDto>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  humanInterventionPoints?: Array<CreateInterventionPointDto>;
}

export class TestAutomationDto {
  @IsObject()
  testContext: {
    testData: Record<string, any>;
    scenarios: Array<{
      name: string;
      input: Record<string, any>;
      expectedOutput: Record<string, any>;
    }>;
    mockExternalServices?: boolean;
    timeout?: number;
  };

  @IsOptional()
  @IsBoolean()
  generateReport?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testScenarios?: string[];
}

export class GetExecutionHistoryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class GetPerformanceMetricsDto {
  @IsOptional()
  @IsString()
  timeframe?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsBoolean()
  includeComparisons?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean;

  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export class CreateLearningInsightDto {
  @IsString()
  executionId: string;

  @IsEnum(['performance', 'quality', 'efficiency', 'cost', 'user_experience'])
  type: 'performance' | 'quality' | 'efficiency' | 'cost' | 'user_experience';

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  impact: 'low' | 'medium' | 'high' | 'critical';

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsObject()
  data: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class CreateAdaptedComponentDto {
  @IsString()
  componentId: string;

  @IsString()
  componentType: string;

  @IsObject()
  originalConfiguration: Record<string, any>;

  @IsObject()
  adaptedConfiguration: Record<string, any>;

  @IsString()
  adaptationReason: string;

  @IsNumber()
  @Min(0)
  expectedImprovement: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsString()
  rollbackStrategy?: string;
}

export class CreateOptimizationResultDto {
  @IsString()
  tenantId: string;

  @IsArray()
  @IsObject({ each: true })
  optimizations: Array<{
    type: string;
    optimizations: number;
    improvement: number;
  }>;

  @IsNumber()
  totalImprovement: number;

  @IsDate()
  @Type(() => Date)
  nextOptimizationCheck: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateAutomationAnalyticsDto {
  @IsString()
  tenantId: string;

  @IsNumber()
  totalWorkflows: number;

  @IsNumber()
  automatedWorkflows: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  automationRate: number;

  @IsArray()
  @IsObject({ each: true })
  efficiencyGains: Array<{
    process: string;
    timeReduction: number;
    costReduction: number;
    qualityImprovement: number;
    automationLevel: number;
  }>;

  @IsArray()
  @IsObject({ each: true })
  costSavings: Array<{
    category: string;
    monthlySavings: number;
    annualSavings: number;
    savingsSource: string;
    sustainability: number;
  }>;

  @IsArray()
  @IsObject({ each: true })
  errorReduction: Array<{
    errorType: string;
    beforeAutomation: number;
    afterAutomation: number;
    reduction: number;
    preventionMechanism: string;
  }>;

  @IsObject()
  userAdoption: {
    totalUsers: number;
    activeUsers: number;
    adoptionRate: number;
    satisfactionScore: number;
    trainingRequired: number;
  };
}

export class CreateWorkflowExecutionResultDto {
  @IsString()
  executionId: string;

  @IsBoolean()
  success: boolean;

  @IsArray()
  @IsObject({ each: true })
  executionPath: Array<{
    stepId: string;
    stepName: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    automated: boolean;
    result?: any;
  }>;

  @IsArray()
  @IsObject({ each: true })
  decisionsMade: Array<{
    decisionId: string;
    decisionType: string;
    context: Record<string, any>;
    decision: any;
    confidence: number;
    reasoning: string;
    timestamp: Date;
  }>;

  @IsArray()
  @IsObject({ each: true })
  humanInterventions: Array<{
    interventionId: string;
    stepId: string;
    reason: string;
    assignedTo: string;
    status: string;
    timestamp: Date;
    resolution?: string;
  }>;

  @IsObject()
  performanceMetrics: {
    totalDuration: number;
    automatedSteps: number;
    manualSteps: number;
    decisionAccuracy: number;
    efficiency: number;
    costSavings: number;
  };
}
