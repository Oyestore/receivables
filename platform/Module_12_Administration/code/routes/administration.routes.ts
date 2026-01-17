import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { provisioningController } from '../controllers/provisioning.controller';
import { usageController } from '../controllers/usage.controller';
import { authMiddleware } from '../../../Module_11_Common/code/auth/auth.middleware';
import { requireModuleAccess } from '../services/module-access.service';

const router = Router();

// ===== MFA Routes =====
const mfaRoutes = Router();
mfaRoutes.post('/enroll', authMiddleware.authenticate, mfaController.enroll.bind(mfaController));
mfaRoutes.post('/verify', authMiddleware.authenticate, mfaController.verify.bind(mfaController));
mfaRoutes.post('/validate', mfaController.validate.bind(mfaController)); // No auth - used during login
mfaRoutes.post('/backup-codes/regenerate', authMiddleware.authenticate, mfaController.regenerateBackupCodes.bind(mfaController));
mfaRoutes.delete('/disable', authMiddleware.authenticate, mfaController.disable.bind(mfaController));
mfaRoutes.get('/status', authMiddleware.authenticate, mfaController.getStatus.bind(mfaController));

router.use('/auth/mfa', mfaRoutes);

// ===== Subscription Routes =====
const subscriptionRoutes = Router();
subscriptionRoutes.get('/plans', subscriptionController.listPlans.bind(subscriptionController));
subscriptionRoutes.post(
  '/plans',
  authMiddleware.authenticate,
  authMiddleware.authorize('platform_admin'),
  subscriptionController.createPlan.bind(subscriptionController)
);

router.use('/subscriptions', subscriptionRoutes);

// ===== Tenant-specific Subscription Routes =====
const tenantSubscriptionRoutes = Router();
tenantSubscriptionRoutes.post(
  '/:tenantId/subscription',
  authMiddleware.authenticate,
  authMiddleware.authorize('platform_admin', 'tenant_admin'),
  subscriptionController.subscribe.bind(subscriptionController)
);
tenantSubscriptionRoutes.get(
  '/:tenantId/subscription',
  authMiddleware.authenticate,
  subscriptionController.getSubscription.bind(subscriptionController)
);
tenantSubscriptionRoutes.put(
  '/:tenantId/subscription/upgrade',
  authMiddleware.authenticate,
  authMiddleware.authorize('tenant_admin'),
  subscriptionController.upgrade.bind(subscriptionController)
);
tenantSubscriptionRoutes.delete(
  '/:tenantId/subscription',
  authMiddleware.authenticate,
  authMiddleware.authorize('tenant_admin'),
  subscriptionController.cancel.bind(subscriptionController)
);

router.use('/tenant', tenantSubscriptionRoutes);

// ===== Provisioning Routes =====
const provisioningRoutes = Router();
provisioningRoutes.post(
  '/tenants',
  authMiddleware.authenticate,
  authMiddleware.authorize('platform_admin'),
  provisioningController.provisionTenant.bind(provisioningController)
);
provisioningRoutes.get(
  '/jobs/:jobId',
  authMiddleware.authenticate,
  provisioningController.getJobStatus.bind(provisioningController)
);

router.use('/provisioning', provisioningRoutes);

// ===== Usage Tracking Routes =====
const usageRoutes = Router();
usageRoutes.get(
  '/stats',
  authMiddleware.authenticate,
  usageController.getStats.bind(usageController)
);
usageRoutes.post(
  '/quotas',
  authMiddleware.authenticate,
  authMiddleware.authorize('platform_admin'),
  usageController.setQuota.bind(usageController)
);
usageRoutes.get(
  '/quota/:moduleName/:quotaType',
  authMiddleware.authenticate,
  usageController.checkQuota.bind(usageController)
);

router.use('/usage', usageRoutes);

export default router;
