import { Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { Logger } from '../../../common/logging/logger';
import { AppError } from '../../../common/errors/app-error';

const logger = new Logger('InvoiceController');

export class InvoiceController {

  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const invoice = await invoiceService.createInvoice(
        tenantId,
        req.body,
        req.user.id
      );
      
      logger.info('Invoice created via API', {
        invoiceId: invoice.id,
        tenantId,
        userId: req.user.id,
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      logger.error('Failed to create invoice', { error, tenantId: req.params.tenantId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, invoiceId } = req.params;
      const invoice = await invoiceService.getInvoice(tenantId, invoiceId);
      res.status(200).json(invoice);
    } catch (error) {
      logger.error('Failed to get invoice', { error, invoiceId: req.params.invoiceId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status as string,
        customer_id: req.query.customer_id as string,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
      };
      
      const invoices = await invoiceService.listInvoices(tenantId, filters);
      res.status(200).json(invoices);
    } catch (error) {
      logger.error('Failed to list invoices', { error, tenantId: req.params.tenantId });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, invoiceId } = req.params;
      const invoice = await invoiceService.updateInvoice(
        tenantId,
        invoiceId,
        req.body,
        req.user.id
      );
      
      logger.info('Invoice updated via API', {
        invoiceId,
        tenantId,
        userId: req.user.id,
      });
      
      res.status(200).json(invoice);
    } catch (error) {
      logger.error('Failed to update invoice', { error, invoiceId: req.params.invoiceId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async sendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, invoiceId } = req.params;
      const { recipient_email, message } = req.body;
      
      await invoiceService.sendInvoice(
        tenantId,
        invoiceId,
        recipient_email,
        message
      );
      
      logger.info('Invoice sent via API', {
        invoiceId,
        tenantId,
        recipientEmail: recipient_email,
      });
      
      res.status(200).json({ message: 'Invoice sent successfully' });
    } catch (error) {
      logger.error('Failed to send invoice', { error, invoiceId: req.params.invoiceId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async deleteInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, invoiceId } = req.params;
      await invoiceService.deleteInvoice(tenantId, invoiceId, req.user.id);
      
      logger.info('Invoice deleted via API', {
        invoiceId,
        tenantId,
        userId: req.user.id,
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete invoice', { error, invoiceId: req.params.invoiceId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}

export const invoiceController = new InvoiceController();
