import { Request, Response } from 'express';
import { creditService } from '../services/credit.service';
import { Logger } from '../../../common/logging/logger';
import { AppError } from '../../../common/errors/app-error';

const logger = new Logger('CreditController');

export class CreditController {

  async assessCredit(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const assessment = await creditService.assessCredit(
        tenantId,
        req.body,
        req.user.id
      );
      
      logger.info('Credit assessment completed via API', {
        assessmentId: assessment.id,
        tenantId,
        customerId: req.body.customer_id,
        score: assessment.score,
      });
      
      res.status(201).json(assessment);
    } catch (error) {
      logger.error('Failed to assess credit', { error, tenantId: req.params.tenantId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getCreditScore(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, customerId } = req.params;
      const creditScore = await creditService.getCreditScore(tenantId, customerId);
      res.status(200).json(creditScore);
    } catch (error) {
      logger.error('Failed to get credit score', { error, customerId: req.params.customerId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async listCreditAssessments(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        customer_id: req.query.customer_id as string,
        risk_level: req.query.risk_level as string,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
      };
      
      const assessments = await creditService.listCreditAssessments(tenantId, filters);
      res.status(200).json(assessments);
    } catch (error) {
      logger.error('Failed to list credit assessments', { error, tenantId: req.params.tenantId });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateCreditLimit(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, customerId } = req.params;
      const { credit_limit, reason } = req.body;
      
      await creditService.updateCreditLimit(
        tenantId,
        customerId,
        credit_limit,
        reason,
        req.user.id
      );
      
      logger.info('Credit limit updated via API', {
        tenantId,
        customerId,
        newLimit: credit_limit,
        reason,
      });
      
      res.status(200).json({ message: 'Credit limit updated successfully' });
    } catch (error) {
      logger.error('Failed to update credit limit', { error, customerId: req.params.customerId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async getRiskAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const filters = {
        severity: req.query.severity as string,
        status: req.query.status as string,
        customer_id: req.query.customer_id as string,
      };
      
      const alerts = await creditService.getRiskAlerts(tenantId, filters);
      res.status(200).json(alerts);
    } catch (error) {
      logger.error('Failed to get risk alerts', { error, tenantId: req.params.tenantId });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async acknowledgeRiskAlert(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, alertId } = req.params;
      
      await creditService.acknowledgeRiskAlert(tenantId, alertId, req.user.id);
      
      logger.info('Risk alert acknowledged via API', {
        tenantId,
        alertId,
        userId: req.user.id,
      });
      
      res.status(200).json({ message: 'Risk alert acknowledged successfully' });
    } catch (error) {
      logger.error('Failed to acknowledge risk alert', { error, alertId: req.params.alertId });
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}

export const creditController = new CreditController();
