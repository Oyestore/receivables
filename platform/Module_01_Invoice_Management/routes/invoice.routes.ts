import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authMiddleware } from '../../../common/auth/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesSchema,
  getInvoiceSchema,
  sendInvoiceSchema,
} from '../validators/invoice.validators';

const router = Router();

// Create invoice
router.post(
  '/tenants/:tenantId/invoices',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:create']),
  validate(createInvoiceSchema),
  invoiceController.createInvoice
);

// List invoices
router.get(
  '/tenants/:tenantId/invoices',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:read']),
  validate(listInvoicesSchema),
  invoiceController.listInvoices
);

// Get invoice by ID
router.get(
  '/tenants/:tenantId/invoices/:invoiceId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:read']),
  validate(getInvoiceSchema),
  invoiceController.getInvoice
);

// Update invoice
router.patch(
  '/tenants/:tenantId/invoices/:invoiceId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:update']),
  validate(updateInvoiceSchema),
  invoiceController.updateInvoice
);

// Send invoice
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/send',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:send']),
  validate(sendInvoiceSchema),
  invoiceController.sendInvoice
);

// Delete invoice
router.delete(
  '/tenants/:tenantId/invoices/:invoiceId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['invoices:delete']),
  validate(getInvoiceSchema),
  invoiceController.deleteInvoice
);

export default router;
