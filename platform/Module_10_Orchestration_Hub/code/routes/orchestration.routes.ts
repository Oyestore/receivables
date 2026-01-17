import { Router } from 'express';
import { orchestrationController } from '../controllers/orchestration.controller';
import { authMiddleware } from '../../../common/auth/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { createTaskSchema, getTaskSchema, listTasksSchema, assignAgentSchema } from '../validators/orchestration.validators';

const router = Router();

router.post('/tenants/:tenantId/tasks', authMiddleware.authenticate, authMiddleware.authorize(['tasks:create']), validate(createTaskSchema), orchestrationController.createTask);
router.get('/tenants/:tenantId/tasks', authMiddleware.authenticate, authMiddleware.authorize(['tasks:read']), validate(listTasksSchema), orchestrationController.listTasks);
router.get('/tenants/:tenantId/tasks/:taskId', authMiddleware.authenticate, authMiddleware.authorize(['tasks:read']), validate(getTaskSchema), orchestrationController.getTask);
router.post('/tenants/:tenantId/tasks/:taskId/assign', authMiddleware.authenticate, authMiddleware.authorize(['tasks:assign']), validate(assignAgentSchema), orchestrationController.assignAgent);

export default router;
