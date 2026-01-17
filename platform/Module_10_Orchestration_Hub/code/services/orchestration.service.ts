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
  IAgent,
  IAgentTask,
  IConstraint,
  IStrategicRecommendation,
  AgentStatus,
  TaskStatus,
  ConstraintType,
} from '../types/orchestration.types';

const logger = new Logger('OrchestrationService');

/**
 * Orchestration Service
 * Manages AI agents, tasks, constraints, and strategic recommendations
 * Implements Theory of Constraints principles for business optimization
 */
export class OrchestrationService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Register a new AI agent
   */
  async registerAgent(
    tenantId: string,
    agentData: {
      name: string;
      type: string;
      description: string;
      capabilities: string[];
      configuration?: any;
    }
  ): Promise<IAgent> {
    try {
      const query = `
        INSERT INTO agents (
          tenant_id, name, agent_type, description,
          capabilities, configuration, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        tenantId,
        agentData.name,
        agentData.type,
        agentData.description,
        JSON.stringify(agentData.capabilities),
        JSON.stringify(agentData.configuration || {}),
      ]);

      const agent = result.rows[0];

      logger.info('Agent registered', {
        agentId: agent.id,
        agentType: agent.agent_type,
        tenantId,
      });

      return agent;
    } catch (error) {
      logger.error('Failed to register agent', { error, tenantId });
      throw new DatabaseError('Failed to register agent');
    }
  }

  /**
   * Create agent task
   */
  async createAgentTask(
    tenantId: string,
    taskData: {
      agent_id: string;
      task_type: string;
      priority: number;
      input_data: any;
      dependencies?: string[];
    },
    createdBy: string
  ): Promise<IAgentTask> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify agent exists and is active
      const agentResult = await client.query(
        'SELECT * FROM agents WHERE id = $1 AND tenant_id = $2 AND status = $3',
        [taskData.agent_id, tenantId, 'active']
      );

      if (agentResult.rows.length === 0) {
        throw new NotFoundError('Agent not found or inactive');
      }

      const agent = agentResult.rows[0];

      // Create task
      const taskQuery = `
        INSERT INTO agent_tasks (
          tenant_id, agent_id, task_type, priority,
          status, input_data, dependencies, created_by
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
        RETURNING *
      `;

      const taskResult = await client.query(taskQuery, [
        tenantId,
        taskData.agent_id,
        taskData.task_type,
        taskData.priority || 5,
        JSON.stringify(taskData.input_data),
        JSON.stringify(taskData.dependencies || []),
        createdBy,
      ]);

      const task = taskResult.rows[0];

      // If no dependencies, mark as ready for execution
      if (!taskData.dependencies || taskData.dependencies.length === 0) {
        await this.executeAgentTask(client, task, agent);
      }

      await client.query('COMMIT');

      logger.info('Agent task created', {
        taskId: task.id,
        agentId: agent.id,
        taskType: task.task_type,
        tenantId,
      });

      return task;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create agent task', { error, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Identify business constraints using Theory of Constraints
   */
  async identifyConstraints(tenantId: string): Promise<IConstraint[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const constraints: IConstraint[] = [];

      // Analyze cash flow constraints
      const cashFlowConstraint = await this.analyzeCashFlowConstraint(client, tenantId);
      if (cashFlowConstraint) constraints.push(cashFlowConstraint);

      // Analyze collection efficiency constraints
      const collectionConstraint = await this.analyzeCollectionConstraint(client, tenantId);
      if (collectionConstraint) constraints.push(collectionConstraint);

      // Analyze credit risk constraints
      const creditConstraint = await this.analyzeCreditRiskConstraint(client, tenantId);
      if (creditConstraint) constraints.push(creditConstraint);

      // Analyze operational constraints
      const operationalConstraint = await this.analyzeOperationalConstraint(client, tenantId);
      if (operationalConstraint) constraints.push(operationalConstraint);

      // Save constraints to database
      for (const constraint of constraints) {
        await client.query(
          `INSERT INTO constraints (
            tenant_id, constraint_type, severity, description,
            impact_score, identified_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
          ON CONFLICT (tenant_id, constraint_type) 
          DO UPDATE SET 
            severity = EXCLUDED.severity,
            description = EXCLUDED.description,
            impact_score = EXCLUDED.impact_score,
            identified_data = EXCLUDED.identified_data,
            updated_at = CURRENT_TIMESTAMP`,
          [
            tenantId,
            constraint.constraint_type,
            constraint.severity,
            constraint.description,
            constraint.impact_score,
            JSON.stringify(constraint.identified_data),
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Constraints identified', {
        count: constraints.length,
        tenantId,
      });

      return constraints;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to identify constraints', { error, tenantId });
      throw new DatabaseError('Failed to identify constraints');
    } finally {
      client.release();
    }
  }

  /**
   * Generate strategic recommendations based on constraints
   */
  async generateStrategicRecommendations(tenantId: string): Promise<IStrategicRecommendation[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get active constraints ordered by impact
      const constraintsResult = await client.query(
        `SELECT * FROM constraints 
         WHERE tenant_id = $1 AND status = 'active'
         ORDER BY impact_score DESC, severity DESC`,
        [tenantId]
      );

      const constraints = constraintsResult.rows;

      if (constraints.length === 0) {
        return [];
      }

      // Focus on the primary constraint (Theory of Constraints: "One Thing to Focus On")
      const primaryConstraint = constraints[0];

      const recommendations: IStrategicRecommendation[] = [];

      // Generate recommendations based on constraint type
      const recommendation = await this.generateRecommendationForConstraint(
        client,
        tenantId,
        primaryConstraint
      );

      if (recommendation) {
        recommendations.push(recommendation);
      }

      // Save recommendations
      for (const rec of recommendations) {
        await client.query(
          `INSERT INTO strategic_recommendations (
            tenant_id, constraint_id, recommendation_type,
            title, description, expected_impact, priority,
            action_items, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
          [
            tenantId,
            rec.constraint_id,
            rec.recommendation_type,
            rec.title,
            rec.description,
            rec.expected_impact,
            rec.priority,
            JSON.stringify(rec.action_items),
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Strategic recommendations generated', {
        count: recommendations.length,
        tenantId,
      });

      return recommendations;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate recommendations', { error, tenantId });
      throw new DatabaseError('Failed to generate recommendations');
    } finally {
      client.release();
    }
  }

  /**
   * Execute agent task
   */
  private async executeAgentTask(client: any, task: IAgentTask, agent: IAgent): Promise<void> {
    const startTime = Date.now();

    try {
      // Update task status to running
      await client.query('UPDATE agent_tasks SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2', [
        'running',
        task.id,
      ]);

      // Execute task based on agent type and task type
      const result = await this.runAgentLogic(agent, task);

      const duration = (Date.now() - startTime) / 1000;

      // Update task with result
      await client.query(
        `UPDATE agent_tasks 
         SET status = $1, output_data = $2, completed_at = CURRENT_TIMESTAMP, execution_time = $3
         WHERE id = $4`,
        ['completed', JSON.stringify(result), duration, task.id]
      );

      // Record metrics
      metricsService.recordAgentTask(agent.agent_type, task.task_type, 'completed', duration);

      logger.info('Agent task executed', {
        taskId: task.id,
        agentId: agent.id,
        duration,
      });
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      await client.query(
        `UPDATE agent_tasks 
         SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP, execution_time = $3
         WHERE id = $4`,
        ['failed', error.message, duration, task.id]
      );

      metricsService.recordAgentTask(agent.agent_type, task.task_type, 'failed', duration);
      metricsService.recordAgentError(agent.agent_type, error.name);

      logger.error('Agent task failed', {
        taskId: task.id,
        agentId: agent.id,
        error,
      });
    }
  }

  /**
   * Run agent logic (placeholder for actual AI agent implementation)
   */
  private async runAgentLogic(agent: IAgent, task: IAgentTask): Promise<any> {
    // This is a placeholder for actual AI agent logic
    // In production, this would integrate with DeepSeek R1 or other AI models

    logger.debug('Running agent logic', {
      agentType: agent.agent_type,
      taskType: task.task_type,
    });

    // Simulate agent processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      status: 'success',
      message: `Task ${task.task_type} completed by ${agent.name}`,
      timestamp: new Date(),
    };

    // TODO: Integrate with DeepSeek R1 or other AI models
    // const response = await fetch('http://deepseek-api/execute', {
    //   method: 'POST',
    //   body: JSON.stringify({ agent, task }),
    // });
    // return await response.json();
  }

  /**
   * Analyze cash flow constraint
   */
  private async analyzeCashFlowConstraint(client: any, tenantId: string): Promise<IConstraint | null> {
    const result = await client.query(
      `SELECT 
         SUM(amount_due) as total_outstanding,
         COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
         AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/86400) as avg_overdue_days
       FROM invoices
       WHERE tenant_id = $1 AND status IN ('sent', 'overdue', 'partially_paid')`,
      [tenantId]
    );

    const data = result.rows[0];

    if (data.total_outstanding > 100000 || data.overdue_count > 10) {
      return {
        constraint_type: 'cash_flow',
        severity: data.total_outstanding > 500000 ? 'critical' : 'high',
        description: `High outstanding receivables: ${data.total_outstanding.toFixed(2)} with ${data.overdue_count} overdue invoices`,
        impact_score: Math.min(100, (data.total_outstanding / 10000) + (data.overdue_count * 2)),
        identified_data: data,
      } as IConstraint;
    }

    return null;
  }

  /**
   * Analyze collection efficiency constraint
   */
  private async analyzeCollectionConstraint(client: any, tenantId: string): Promise<IConstraint | null> {
    const result = await client.query(
      `SELECT 
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_collection_days,
         COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate
       FROM payments
       WHERE tenant_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'`,
      [tenantId]
    );

    const data = result.rows[0];

    if (data.avg_collection_days > 45 || data.failure_rate > 10) {
      return {
        constraint_type: 'collection_efficiency',
        severity: data.avg_collection_days > 60 ? 'high' : 'medium',
        description: `Slow collection process: Average ${data.avg_collection_days.toFixed(1)} days with ${data.failure_rate.toFixed(1)}% failure rate`,
        impact_score: Math.min(100, data.avg_collection_days + data.failure_rate),
        identified_data: data,
      } as IConstraint;
    }

    return null;
  }

  /**
   * Analyze credit risk constraint
   */
  private async analyzeCreditRiskConstraint(client: any, tenantId: string): Promise<IConstraint | null> {
    const result = await client.query(
      `SELECT 
         COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')) as high_risk_count,
         AVG(current_score) as avg_score
       FROM credit_profiles
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const data = result.rows[0];

    if (data.high_risk_count > 5 || data.avg_score < 600) {
      return {
        constraint_type: 'credit_risk',
        severity: data.high_risk_count > 10 ? 'critical' : 'high',
        description: `High credit risk exposure: ${data.high_risk_count} high-risk customers with average score ${data.avg_score.toFixed(0)}`,
        impact_score: Math.min(100, data.high_risk_count * 5 + (700 - data.avg_score) / 10),
        identified_data: data,
      } as IConstraint;
    }

    return null;
  }

  /**
   * Analyze operational constraint
   */
  private async analyzeOperationalConstraint(client: any, tenantId: string): Promise<IConstraint | null> {
    const result = await client.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices,
         AVG(EXTRACT(EPOCH FROM (sent_at - created_at))/86400) as avg_send_delay
       FROM invoices
       WHERE tenant_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'`,
      [tenantId]
    );

    const data = result.rows[0];

    if (data.draft_invoices > 20 || data.avg_send_delay > 3) {
      return {
        constraint_type: 'operational',
        severity: 'medium',
        description: `Operational bottleneck: ${data.draft_invoices} draft invoices with ${data.avg_send_delay.toFixed(1)} days average delay`,
        impact_score: Math.min(100, data.draft_invoices + data.avg_send_delay * 10),
        identified_data: data,
      } as IConstraint;
    }

    return null;
  }

  /**
   * Generate recommendation for constraint
   */
  private async generateRecommendationForConstraint(
    client: any,
    tenantId: string,
    constraint: IConstraint
  ): Promise<IStrategicRecommendation | null> {
    const recommendations: Record<ConstraintType, any> = {
      cash_flow: {
        title: 'Improve Cash Flow Management',
        description: 'Focus on collecting outstanding receivables to improve cash flow',
        action_items: [
          'Prioritize collection of top 10 overdue invoices',
          'Implement automated payment reminders',
          'Offer early payment discounts',
          'Review and tighten credit terms for high-risk customers',
        ],
        expected_impact: 'Reduce outstanding receivables by 30-40% within 60 days',
      },
      collection_efficiency: {
        title: 'Optimize Collection Process',
        description: 'Streamline the collection process to reduce days sales outstanding',
        action_items: [
          'Automate invoice delivery and reminders',
          'Implement multiple payment options',
          'Train team on effective collection techniques',
          'Set up automated follow-up workflows',
        ],
        expected_impact: 'Reduce average collection time by 15-20 days',
      },
      credit_risk: {
        title: 'Mitigate Credit Risk Exposure',
        description: 'Reduce exposure to high-risk customers and improve credit assessment',
        action_items: [
          'Review credit limits for high-risk customers',
          'Implement stricter payment terms for risky accounts',
          'Require advance payments or deposits',
          'Diversify customer base to reduce concentration risk',
        ],
        expected_impact: 'Reduce bad debt by 40-50%',
      },
      operational: {
        title: 'Eliminate Operational Bottlenecks',
        description: 'Streamline invoice creation and approval processes',
        action_items: [
          'Implement automated invoice generation',
          'Set up approval workflows',
          'Use invoice templates for common scenarios',
          'Train staff on system efficiency',
        ],
        expected_impact: 'Reduce invoice processing time by 50%',
      },
      market: {
        title: 'Address Market Challenges',
        description: 'Adapt to market conditions and customer needs',
        action_items: [
          'Review pricing strategy',
          'Analyze competitor offerings',
          'Gather customer feedback',
          'Adjust service delivery',
        ],
        expected_impact: 'Improve customer satisfaction and retention',
      },
    };

    const template = recommendations[constraint.constraint_type];

    if (!template) return null;

    return {
      constraint_id: constraint.id,
      recommendation_type: constraint.constraint_type,
      title: template.title,
      description: template.description,
      expected_impact: template.expected_impact,
      priority: constraint.severity === 'critical' ? 10 : constraint.severity === 'high' ? 8 : 5,
      action_items: template.action_items,
    } as IStrategicRecommendation;
  }
}

export const orchestrationService = new OrchestrationService();
