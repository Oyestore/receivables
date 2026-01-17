import { Pool } from 'pg';
import { databaseService } from '../../../common/database/database.service';
import { Logger } from '../../../common/logging/logger';
import { metricsService } from '../../../common/monitoring/metrics.service';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
} from '../../../common/errors/app-error';
import {
  IWorkflow,
  IWorkflowExecution,
  IWorkflowStep,
  IWorkflowTrigger,
  WorkflowStatus,
  TriggerType,
} from '../types/workflow.types';

const logger = new Logger('WorkflowService');

/**
 * Workflow Automation Service
 * Manages custom workflow creation, execution, and monitoring
 */
export class WorkflowService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    tenantId: string,
    workflowData: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_config: any;
      steps: IWorkflowStep[];
    },
    createdBy: string
  ): Promise<IWorkflow> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate workflow steps
      this.validateWorkflowSteps(workflowData.steps);

      // Create workflow
      const workflowQuery = `
        INSERT INTO workflows (
          tenant_id, name, description, trigger_type,
          trigger_config, steps, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING *
      `;

      const result = await client.query(workflowQuery, [
        tenantId,
        workflowData.name,
        workflowData.description,
        workflowData.trigger_type,
        JSON.stringify(workflowData.trigger_config),
        JSON.stringify(workflowData.steps),
        createdBy,
      ]);

      const workflow = result.rows[0];

      // Register trigger
      await this.registerWorkflowTrigger(client, workflow);

      await client.query('COMMIT');

      logger.info('Workflow created', {
        workflowId: workflow.id,
        triggerType: workflow.trigger_type,
        stepCount: workflowData.steps.length,
        tenantId,
      });

      return workflow;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create workflow', { error, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    tenantId: string,
    workflowId: string,
    triggerData: any
  ): Promise<IWorkflowExecution> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get workflow
      const workflowResult = await client.query(
        'SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [workflowId, tenantId]
      );

      if (workflowResult.rows.length === 0) {
        throw new NotFoundError('Workflow not found or inactive');
      }

      const workflow = workflowResult.rows[0];

      // Create execution record
      const executionQuery = `
        INSERT INTO workflow_executions (
          tenant_id, workflow_id, status, trigger_data
        ) VALUES ($1, $2, 'running', $3)
        RETURNING *
      `;

      const executionResult = await client.query(executionQuery, [
        tenantId,
        workflowId,
        JSON.stringify(triggerData),
      ]);

      const execution = executionResult.rows[0];

      // Execute workflow steps
      const steps = JSON.parse(workflow.steps);
      const stepResults = [];

      for (const step of steps) {
        try {
          const stepResult = await this.executeWorkflowStep(
            client,
            tenantId,
            execution.id,
            step,
            triggerData,
            stepResults
          );
          stepResults.push(stepResult);

          // Check if step has conditions that would skip remaining steps
          if (stepResult.skip_remaining) {
            break;
          }
        } catch (error) {
          // Log step failure
          await client.query(
            `INSERT INTO workflow_step_logs (
              execution_id, step_number, step_name, status, error_message
            ) VALUES ($1, $2, $3, 'failed', $4)`,
            [execution.id, step.step_number, step.name, error.message]
          );

          // Mark execution as failed
          await client.query(
            'UPDATE workflow_executions SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['failed', error.message, execution.id]
          );

          throw error;
        }
      }

      // Mark execution as completed
      await client.query(
        `UPDATE workflow_executions 
         SET status = 'completed', output_data = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(stepResults), execution.id]
      );

      await client.query('COMMIT');

      logger.info('Workflow executed successfully', {
        workflowId,
        executionId: execution.id,
        stepCount: stepResults.length,
        tenantId,
      });

      execution.status = 'completed';
      execution.output_data = stepResults;

      return execution;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to execute workflow', { error, workflowId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(tenantId: string, workflowId: string): Promise<IWorkflow> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2',
        [workflowId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Workflow not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get workflow', { error, workflowId, tenantId });
      throw new DatabaseError('Failed to retrieve workflow');
    }
  }

  /**
   * List workflows
   */
  async listWorkflows(
    tenantId: string,
    filters?: { is_active?: boolean; trigger_type?: TriggerType }
  ): Promise<IWorkflow[]> {
    try {
      let query = 'SELECT * FROM workflows WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters?.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(filters.is_active);
        paramIndex++;
      }

      if (filters?.trigger_type) {
        query += ` AND trigger_type = $${paramIndex}`;
        params.push(filters.trigger_type);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to list workflows', { error, tenantId });
      throw new DatabaseError('Failed to list workflows');
    }
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowExecutions(
    tenantId: string,
    workflowId: string,
    limit: number = 50
  ): Promise<IWorkflowExecution[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM workflow_executions 
         WHERE tenant_id = $1 AND workflow_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [tenantId, workflowId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get workflow executions', { error, workflowId, tenantId });
      throw new DatabaseError('Failed to retrieve workflow executions');
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    updates: Partial<IWorkflow>,
    updatedBy: string
  ): Promise<IWorkflow> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate steps if provided
      if (updates.steps) {
        this.validateWorkflowSteps(updates.steps);
      }

      const updateFields = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex}`);
        params.push(updates.name);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(updates.description);
        paramIndex++;
      }

      if (updates.steps) {
        updateFields.push(`steps = $${paramIndex}`);
        params.push(JSON.stringify(updates.steps));
        paramIndex++;
      }

      if (updates.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        params.push(updates.is_active);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(workflowId, tenantId);
      const query = `
        UPDATE workflows 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundError('Workflow not found');
      }

      await client.query('COMMIT');

      logger.info('Workflow updated', { workflowId, tenantId });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update workflow', { error, workflowId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(tenantId: string, workflowId: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'UPDATE workflows SET is_active = false, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2',
        [workflowId, tenantId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Workflow not found');
      }

      logger.info('Workflow deleted', { workflowId, tenantId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to delete workflow', { error, workflowId, tenantId });
      throw new DatabaseError('Failed to delete workflow');
    }
  }

  /**
   * Validate workflow steps
   */
  private validateWorkflowSteps(steps: IWorkflowStep[]): void {
    if (!steps || steps.length === 0) {
      throw new ValidationError('Workflow must have at least one step');
    }

    // Check step numbers are sequential
    const stepNumbers = steps.map(s => s.step_number).sort((a, b) => a - b);
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        throw new ValidationError('Step numbers must be sequential starting from 1');
      }
    }

    // Validate each step
    for (const step of steps) {
      if (!step.name || !step.action_type) {
        throw new ValidationError('Each step must have a name and action_type');
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    client: any,
    tenantId: string,
    executionId: string,
    step: IWorkflowStep,
    triggerData: any,
    previousResults: any[]
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Evaluate conditions if present
      if (step.conditions) {
        const conditionMet = this.evaluateConditions(step.conditions, triggerData, previousResults);
        if (!conditionMet) {
          await client.query(
            `INSERT INTO workflow_step_logs (
              execution_id, step_number, step_name, status, notes
            ) VALUES ($1, $2, $3, 'skipped', 'Condition not met')`,
            [executionId, step.step_number, step.name]
          );

          return { step: step.step_number, status: 'skipped', reason: 'Condition not met' };
        }
      }

      // Execute step action
      const result = await this.executeStepAction(
        client,
        tenantId,
        step,
        triggerData,
        previousResults
      );

      const duration = (Date.now() - startTime) / 1000;

      // Log step execution
      await client.query(
        `INSERT INTO workflow_step_logs (
          execution_id, step_number, step_name, status, output_data, execution_time
        ) VALUES ($1, $2, $3, 'completed', $4, $5)`,
        [executionId, step.step_number, step.name, JSON.stringify(result), duration]
      );

      return { step: step.step_number, status: 'completed', result, duration };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      await client.query(
        `INSERT INTO workflow_step_logs (
          execution_id, step_number, step_name, status, error_message, execution_time
        ) VALUES ($1, $2, $3, 'failed', $4, $5)`,
        [executionId, step.step_number, step.name, error.message, duration]
      );

      throw error;
    }
  }

  /**
   * Execute step action based on action type
   */
  private async executeStepAction(
    client: any,
    tenantId: string,
    step: IWorkflowStep,
    triggerData: any,
    previousResults: any[]
  ): Promise<any> {
    switch (step.action_type) {
      case 'send_email':
        return await this.executeSendEmailAction(step.action_config, triggerData);

      case 'send_notification':
        return await this.executeSendNotificationAction(step.action_config, triggerData);

      case 'update_record':
        return await this.executeUpdateRecordAction(client, tenantId, step.action_config, triggerData);

      case 'create_record':
        return await this.executeCreateRecordAction(client, tenantId, step.action_config, triggerData);

      case 'api_call':
        return await this.executeApiCallAction(step.action_config, triggerData);

      case 'wait':
        return await this.executeWaitAction(step.action_config);

      case 'condition':
        return await this.executeConditionAction(step.action_config, triggerData, previousResults);

      default:
        throw new ValidationError(`Unknown action type: ${step.action_type}`);
    }
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(config: any, data: any): Promise<any> {
    // In production, integrate with notification service
    logger.info('Sending email', { to: config.to, subject: config.subject });
    return { sent: true, to: config.to };
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(config: any, data: any): Promise<any> {
    logger.info('Sending notification', { type: config.type });
    return { sent: true, type: config.type };
  }

  /**
   * Execute update record action
   */
  private async executeUpdateRecordAction(
    client: any,
    tenantId: string,
    config: any,
    data: any
  ): Promise<any> {
    const { table, record_id, updates } = config;
    // In production, validate table and perform update
    logger.info('Updating record', { table, record_id });
    return { updated: true, table, record_id };
  }

  /**
   * Execute create record action
   */
  private async executeCreateRecordAction(
    client: any,
    tenantId: string,
    config: any,
    data: any
  ): Promise<any> {
    const { table, record_data } = config;
    logger.info('Creating record', { table });
    return { created: true, table };
  }

  /**
   * Execute API call action
   */
  private async executeApiCallAction(config: any, data: any): Promise<any> {
    const { url, method, headers, body } = config;
    logger.info('Making API call', { url, method });
    // In production, make actual HTTP request
    return { success: true, url };
  }

  /**
   * Execute wait action
   */
  private async executeWaitAction(config: any): Promise<any> {
    const { duration_seconds } = config;
    await new Promise(resolve => setTimeout(resolve, duration_seconds * 1000));
    return { waited: duration_seconds };
  }

  /**
   * Execute condition action
   */
  private async executeConditionAction(
    config: any,
    data: any,
    previousResults: any[]
  ): Promise<any> {
    const conditionMet = this.evaluateConditions(config, data, previousResults);
    return { condition_met: conditionMet, skip_remaining: !conditionMet && config.skip_on_false };
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(conditions: any, data: any, previousResults: any[]): boolean {
    // Simple condition evaluation
    // In production, implement more sophisticated condition logic
    return true;
  }

  /**
   * Register workflow trigger
   */
  private async registerWorkflowTrigger(client: any, workflow: IWorkflow): Promise<void> {
    // Register trigger based on type
    // In production, set up event listeners or scheduled jobs
    logger.info('Registering workflow trigger', {
      workflowId: workflow.id,
      triggerType: workflow.trigger_type,
    });
  }
}

export const workflowService = new WorkflowService();
