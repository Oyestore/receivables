import { Request, Response, NextFunction } from 'express';
import { complianceMonitoringService } from '../services/compliance-monitoring.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('ComplianceController');

export class ComplianceController {
    /**
     * GET /api/v1/compliance/standards
     * Get all compliance standards
     */
    async getStandards(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { activeOnly } = req.query;

            const standards = await complianceMonitoringService.getStandards(
                activeOnly === 'false' ? false : true
            );

            res.status(200).json({
                data: standards,
                total: standards.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/compliance/audits
     * Create compliance audit
     */
    async createAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { standardId, auditDate, auditorId, auditorName, auditType, scope } = req.body;

            if (!standardId || !auditDate || !auditType) {
                throw new ValidationError('Missing required fields: standardId, auditDate, auditType');
            }

            const audit = await complianceMonitoringService.createAudit({
                tenantId: req.user?.tenantId,
                standardId,
                auditDate: new Date(auditDate),
                auditorId,
                auditorName,
                auditType,
                scope,
            });

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'compliance.audit_create',
                resourceType: 'compliance_audit',
                resourceId: audit.id,
                changes: { standardId, auditType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Compliance audit created',
                data: audit,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/compliance/findings
     * Add finding to audit
     */
    async addFinding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                auditId,
                controlId,
                severity,
                findingType,
                findingDescription,
                evidence,
                impactAssessment,
                remediationPlan,
                assignedTo,
                dueDate,
                priority,
            } = req.body;

            if (!auditId || !severity || !findingDescription) {
                throw new ValidationError('Missing required fields: auditId, severity, findingDescription');
            }

            const finding = await complianceMonitoringService.addFinding({
                auditId,
                controlId,
                severity,
                findingType,
                findingDescription,
                evidence,
                impactAssessment,
                remediationPlan,
                assignedTo,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                priority,
            });

            res.status(201).json({
                message: 'Finding added',
                data: finding,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/compliance/findings/:id/resolve
     * Resolve finding
     */
    async resolveFinding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { resolutionNotes } = req.body;

            if (!resolutionNotes) {
                throw new ValidationError('Resolution notes are required');
            }

            const finding = await complianceMonitoringService.resolveFinding(
                id,
                resolutionNotes,
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'compliance.finding_resolved',
                resourceType: 'compliance_finding',
                resourceId: id,
                changes: { status: 'resolved' },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'Finding resolved',
                data: finding,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/compliance/evidence
     * Collect evidence
     */
    async collectEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                controlId,
                auditId,
                findingId,
                evidenceType,
                evidenceTitle,
                evidenceDescription,
                filePath,
                fileSize,
                fileHash,
                retentionDays,
                metadata,
            } = req.body;

            if (!evidenceType || !evidenceTitle) {
                throw new ValidationError('Missing required fields: evidenceType, evidenceTitle');
            }

            const evidence = await complianceMonitoringService.collectEvidence(
                {
                    tenantId: req.user?.tenantId,
                    controlId,
                    auditId,
                    findingId,
                    evidenceType,
                    evidenceTitle,
                    evidenceDescription,
                    filePath,
                    fileSize,
                    fileHash,
                    retentionDays,
                    metadata,
                },
                req.user?.id
            );

            res.status(201).json({
                message: 'Evidence collected',
                data: evidence,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/compliance/controls/:id/test
     * Run automated control test
     */
    async runControlTest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: controlId } = req.params;

            const testResult = await complianceMonitoringService.runAutomatedTest(
                controlId,
                req.user?.tenantId
            );

            res.status(200).json({
                message: 'Control test executed',
                data: testResult,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/compliance/status/:tenantId/:standardId
     * Get compliance status
     */
    async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId, standardId } = req.params;

            // Update status first
            await complianceMonitoringService.updateComplianceStatus(tenantId, standardId);

            // Get current status
            const status = await complianceMonitoringService.getComplianceStatus(tenantId, standardId);

            res.status(200).json({
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/compliance/score/:tenantId/:standardId
     * Calculate compliance score
     */
    async calculateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId, standardId } = req.params;

            const score = await complianceMonitoringService.calculateComplianceScore(tenantId, standardId);

            res.status(200).json({
                data: {
                    tenantId,
                    standardId,
                    score,
                    timestamp: new Date(),
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const complianceController = new ComplianceController();
