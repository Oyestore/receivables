import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    task_type: z.enum(['invoice_processing', 'payment_reconciliation', 'credit_assessment', 'workflow_execution']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    input_data: z.record(z.any()),
    assigned_agent: z.string().optional(),
  }),
});

export const getTaskSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
});

export const listTasksSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'failed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }),
});

export const assignAgentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    agent_id: z.string().uuid('Invalid agent ID'),
  }),
});
