import { Request, Response } from 'express';
import { orchestrationService } from '../services/orchestration.service';
import { Logger } from '../../../common/logging/logger';
import { AppError } from '../../../common/errors/app-error';

const logger = new Logger('OrchestrationController');

export class OrchestrationController {
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const task = await orchestrationService.createTask(tenantId, req.body, req.user.id);
      logger.info('Task created', { taskId: task.id, tenantId });
      res.status(201).json(task);
    } catch (error) {
      logger.error('Failed to create task', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, taskId } = req.params;
      const task = await orchestrationService.getTask(tenantId, taskId);
      res.status(200).json(task);
    } catch (error) {
      logger.error('Failed to get task', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listTasks(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const tasks = await orchestrationService.listTasks(tenantId, req.query);
      res.status(200).json(tasks);
    } catch (error) {
      logger.error('Failed to list tasks', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async assignAgent(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, taskId } = req.params;
      await orchestrationService.assignAgent(tenantId, taskId, req.body.agent_id);
      res.status(200).json({ message: 'Agent assigned successfully' });
    } catch (error) {
      logger.error('Failed to assign agent', { error });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}

export const orchestrationController = new OrchestrationController();
