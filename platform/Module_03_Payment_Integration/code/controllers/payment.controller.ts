import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { Logger } from '../../../common/logging/logger';
import { AppError } from '../../../common/errors/app-error';

const logger = new Logger('PaymentController');

export class PaymentController {

  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const payment = await paymentService.processPayment(
        tenantId,
        req.body,
        req.user.id
      );
      
      logger.info('Payment processed via API', {
        paymentId: payment.id,
        tenantId,
        amount: req.body.amount,
        gateway: req.body.gateway,
      });
      
      res.status(201).json(payment);
    } catch (error) {
      logger.error('Failed to process payment', { error, tenantId: req.params.tenantId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, paymentId } = req.params;
      const payment = await paymentService.getPayment(tenantId, paymentId);
      res.status(200).json(payment);
    } catch (error) {
      logger.error('Failed to get payment', { error, paymentId: req.params.paymentId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status as string,
        invoice_id: req.query.invoice_id as string,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
      };
      
      const payments = await paymentService.listPayments(tenantId, filters);
      res.status(200).json(payments);
    } catch (error) {
      logger.error('Failed to list payments', { error, tenantId: req.params.tenantId });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, paymentId } = req.params;
      const { amount, reason } = req.body;
      
      const refund = await paymentService.refundPayment(
        tenantId,
        paymentId,
        amount,
        reason,
        req.user.id
      );
      
      logger.info('Payment refunded via API', {
        paymentId,
        tenantId,
        refundAmount: amount,
        reason,
      });
      
      res.status(200).json(refund);
    } catch (error) {
      logger.error('Failed to refund payment', { error, paymentId: req.params.paymentId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async reconcilePayment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, paymentId } = req.params;
      const { gateway_transaction_id, reconciliation_status, notes } = req.body;
      
      await paymentService.reconcilePayment(
        tenantId,
        paymentId,
        gateway_transaction_id,
        reconciliation_status,
        notes
      );
      
      logger.info('Payment reconciled via API', {
        paymentId,
        tenantId,
        gatewayTransactionId: gateway_transaction_id,
        status: reconciliation_status,
      });
      
      res.status(200).json({ message: 'Payment reconciled successfully' });
    } catch (error) {
      logger.error('Failed to reconcile payment', { error, paymentId: req.params.paymentId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { gateway } = req.params;
      const signature = req.headers['x-webhook-signature'] as string;
      
      await paymentService.handleWebhook(gateway, req.body, signature);
      
      logger.info('Webhook processed', { gateway });
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Failed to process webhook', { error, gateway: req.params.gateway });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export const paymentController = new PaymentController();
