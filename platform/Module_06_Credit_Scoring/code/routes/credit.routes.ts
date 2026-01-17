import { Router } from 'express';
import { creditController } from '../controllers/credit.controller';
import { authMiddleware } from '../../../common/auth/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
  assessCreditSchema,
  getCreditScoreSchema,
  listCreditAssessmentsSchema,
  updateCreditLimitSchema,
  getRiskAlertsSchema,
} from '../validators/credit.validators';

const router = Router();

// Assess credit
router.post(
  '/tenants/:tenantId/credit/assess',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:assess']),
  validate(assessCreditSchema),
  creditController.assessCredit
);

// Get credit score for a customer
router.get(
  '/tenants/:tenantId/credit/customers/:customerId/score',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:read']),
  validate(getCreditScoreSchema),
  creditController.getCreditScore
);

// List credit assessments
router.get(
  '/tenants/:tenantId/credit/assessments',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:read']),
  validate(listCreditAssessmentsSchema),
  creditController.listCreditAssessments
);

// Update credit limit
router.patch(
  '/tenants/:tenantId/credit/customers/:customerId/limit',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:update']),
  validate(updateCreditLimitSchema),
  creditController.updateCreditLimit
);

// Get risk alerts
router.get(
  '/tenants/:tenantId/credit/alerts',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:read']),
  validate(getRiskAlertsSchema),
  creditController.getRiskAlerts
);

// Acknowledge risk alert
router.post(
  '/tenants/:tenantId/credit/alerts/:alertId/acknowledge',
  authMiddleware.authenticate,
  authMiddleware.authorize(['credit:update']),
  creditController.acknowledgeRiskAlert
);

export default router;
