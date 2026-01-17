export type WorkflowStatus = 'active' | 'inactive' | 'archived';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook';
export type ActionType = 'send_email' | 'send_notification' | 'update_record' | 'create_record' | 'api_call' | 'wait' | 'condition';

export interface IWorkflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: any;
  steps: IWorkflowStep[];
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IWorkflowStep {
  step_number: number;
  name: string;
  description?: string;
  action_type: ActionType;
  action_config: any;
  conditions?: any;
  retry_config?: {
    max_retries: number;
    retry_delay_seconds: number;
  };
}

export interface IWorkflowExecution {
  id: string;
  tenant_id: string;
  workflow_id: string;
  status: ExecutionStatus;
  trigger_data?: any;
  output_data?: any;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface IWorkflowStepLog {
  id: string;
  execution_id: string;
  step_number: number;
  step_name: string;
  status: ExecutionStatus;
  output_data?: any;
  error_message?: string;
  execution_time?: number;
  notes?: string;
  created_at: Date;
}

export interface IWorkflowTrigger {
  id: string;
  workflow_id: string;
  trigger_type: TriggerType;
  trigger_config: any;
  is_active: boolean;
  last_triggered_at?: Date;
  created_at: Date;
}

export interface IWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_data: IWorkflow;
  is_public: boolean;
  created_at: Date;
}
