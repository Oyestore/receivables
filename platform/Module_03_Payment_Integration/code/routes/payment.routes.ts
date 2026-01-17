import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../../../common/auth/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
  processPaymentSchema,
  getPaymentSchema,
  listPaymentsSchema,
  refundPaymentSchema,
  reconcilePaymentSchema,
} from '../validators/payment.validators';

const router = Router();

// Process payment
router.post(
  '/tenants/:tenantId/payments',
  authMiddleware.authenticate,
  authMiddleware.authorize(['payments:create']),
  validate(processPaymentSchema),
  paymentController.processPayment
);

// List payments
router.get(
  '/tenants/:tenantId/payments',
  authMiddleware.authenticate,
  authMiddleware.authorize(['payments:read']),
  validate(listPaymentsSchema),
  paymentController.listPayments
);

// Get payment by ID
router.get(
  '/tenants/:tenantId/payments/:paymentId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['payments:read']),
  validate(getPaymentSchema),
  paymentController.getPayment
);

// Refund payment
router.post(
  '/tenants/:tenantId/payments/:paymentId/refund',
  authMiddleware.authenticate,
  authMiddleware.authorize(['payments:refund']),
  validate(refundPaymentSchema),
  paymentController.refundPayment
);

// Reconcile payment
router.post(
  '/tenants/:tenantId/payments/:paymentId/reconcile',
  authMiddleware.authenticate,
  authMiddleware.authorize(['payments:reconcile']),
  validate(reconcilePaymentSchema),
  paymentController.reconcilePayment
);

// Webhook endpoint (no authentication required, verified via signature)
router.post(
  '/webhooks/:gateway',
  paymentController.handleWebhook
);

export default router;
