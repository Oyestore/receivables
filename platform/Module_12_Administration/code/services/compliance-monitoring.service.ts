import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IComplianceStandard,
    IComplianceControl,
    IComplianceAudit,
    IComplianceFinding,
    IComplianceEvidence,
    IControlTestResult,
    IComplianceStatus,
} from '../interfaces/compliance.interface';

const logger = new Logger('ComplianceMonitoringService');

/**
 * Compliance Monitoring Service  
 * Automated compliance monitoring for GDPR, SOC2, ISO27001, etc.
 */
export class ComplianceMonitoringService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get all compliance standards
     */
    async getStandards(activeOnly: boolean = true): Promise<IComplianceStandard[]> {
        try {
            let query = 'SELECT * FROM compliance_standards';

            if (activeOnly) {
                query += ' WHERE is_active = true';
            }

            query += ' ORDER BY standard_name';

            const result = await this.pool.query(query);

            return result.rows.map(row => this.mapStandardFromDb(row));
        } catch (error) {
            logger.error('Failed to get compliance standards', { error });
            throw error;
        }
    }

    /**
     * Create compliance audit
     */
    async createAudit(auditData: {
        tenantId?: string;
        standardId: string;
        auditDate: Date;
        auditorId?: string;
        auditorName?: string;
        auditType: 'internal' | 'external' | 'self_assessment' | 'certification';
        scope?: string;
    }): Promise<IComplianceAudit> {
        try {
            // Verify standard exists
            const standardResult = await this.pool.query(
                'SELECT * FROM compliance_standards WHERE id = $1',
                [auditData.standardId]
            );

            if (standardResult.rows.length === 0) {
                throw new NotFoundError('Compliance standard not found');
            }

            // Generate audit number
            const auditNumber = await this.generateAuditNumber(auditData.standardId);

            const result = await this.pool.query(
                `INSERT INTO compliance_audits (
          tenant_id, standard_id, audit_number, audit_date, auditor_id,
          auditor_name, audit_type, scope, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'planned')
        RETURNING *`,
                [
                    auditData.tenantId || null,
                    auditData.standardId,
                    auditNumber,
                    auditData.auditDate,
                    auditData.auditorId || null,
                    auditData.auditorName || null,
                    auditData.auditType,
                    auditData.scope || null,
                ]
            );

            logger.info('Compliance audit created', {
                auditId: result.rows[0].id,
                auditNumber,
                standardId: auditData.standardId,
            });

            return this.mapAuditFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create compliance audit', { error, auditData });
            throw error;
        }
    }

    /**
     * Add finding to audit
     */
    async addFinding(findingData: {
        auditId: string;
        controlId?: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        findingType?: 'non_conformance' | 'observation' | 'opportunity' | 'best_practice';
        findingDescription: string;
        evidence?: string;
        impactAssessment?: string;
        remediationPlan?: string;
        assignedTo?: string;
        dueDate?: Date;
        priority?: number;
    }): Promise<IComplianceFinding> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get audit
            const auditResult = await client.query(
                'SELECT * FROM compliance_audits WHERE id = $1',
                [findingData.auditId]
            );

            if (auditResult.rows.length === 0) {
                throw new NotFoundError('Audit not found');
            }

            const audit = auditResult.rows[0];

            // Generate finding number
            const findingNumber = await this.generateFindingNumber(findingData.auditId);

            // Create finding
            const findingResult = await client.query(
                `INSERT INTO compliance_findings (
          audit_id, control_id, finding_number, severity, finding_type,
          finding_description, evidence, impact_assessment, remediation_plan,
          assigned_to, due_date, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open')
        RETURNING *`,
                [
                    findingData.auditId,
                    findingData.controlId || null,
                    findingNumber,
                    findingData.severity,
                    findingData.findingType || 'non_conformance',
                    findingData.findingDescription,
                    findingData.evidence || null,
                    findingData.impactAssessment || null,
                    findingData.remediationPlan || null,
                    findingData.assignedTo || null,
                    findingData.dueDate || null,
                    findingData.priority || null,
                ]
            );

            // Update audit findings count
            const severityColumn = `${findingData.severity}_findings`;
            await client.query(
                `UPDATE compliance_audits
         SET findings_count = findings_count + 1,
             ${severityColumn} = ${severityColumn} + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
                [findingData.auditId]
            );

            await client.query('COMMIT');

            logger.info('Compliance finding added', {
                findingId: findingResult.rows[0].id,
                auditId: findingData.auditId,
                severity: findingData.severity,
            });

            return this.mapFindingFromDb(findingResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to add compliance finding', { error, findingData });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Run automated control test
     */
    async runAutomatedTest(controlId: string, tenantId?: string): Promise<IControlTestResult> {
        try {
            // Get control details
            const control = await this.getControl(controlId);

            if (!control) {
                throw new NotFoundError('Control not found');
            }

            if (!control.automatedTest) {
                throw new ValidationError('Control does not have automated testing enabled');
            }

            // Execute test script
            const testResult = await this.executeTestScript(control.testScript, tenantId);

            // Record test result
            const result = await this.pool.query(
                `INSERT INTO control_test_results (
          tenant_id, control_id, test_type, test_result, test_details
        ) VALUES ($1, $2, 'automated', $3, $4)
        RETURNING *`,
                [
                    tenantId || null,
                    controlId,
                    testResult.result,
                    JSON.stringify(testResult.details),
                ]
            );

            logger.info('Automated control test executed', {
                controlId,
                result: testResult.result,
            });

            return this.mapTestResultFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to run automated test', { error, controlId });
            throw error;
        }
    }

    /**
     * Collect compliance evidence
     */
    async collectEvidence(evidenceData: {
        tenantId?: string;
        controlId?: string;
        auditId?: string;
        findingId?: string;
        evidenceType: 'document' | 'screenshot' | 'log' | 'certificate' | 'report' | 'video' | 'other';
        evidenceTitle: string;
        evidenceDescription?: string;
        filePath?: string;
        fileSize?: number;
        fileHash?: string;
        retentionDays?: number;
        metadata?: any;
    }, collectedBy: string): Promise<IComplianceEvidence> {
        try {
            const retentionDate = evidenceData.retentionDays
                ? new Date(Date.now() + evidenceData.retentionDays * 24 * 60 * 60 * 1000)
                : null;

            const result = await this.pool.query(
                `INSERT INTO compliance_evidence (
          tenant_id, control_id, audit_id, finding_id, evidence_type,
          evidence_title, evidence_description, file_path, file_size,
          file_hash, retention_date, collected_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
                [
                    evidenceData.tenantId || null,
                    evidenceData.controlId || null,
                    evidenceData.auditId || null,
                    evidenceData.findingId || null,
                    evidenceData.evidenceType,
                    evidenceData.evidenceTitle,
                    evidenceData.evidenceDescription || null,
                    evidenceData.filePath || null,
                    evidenceData.fileSize || null,
                    evidenceData.fileHash || null,
                    retentionDate,
                    collectedBy,
                    evidenceData.metadata ? JSON.stringify(evidenceData.metadata) : null,
                ]
            );

            logger.info('Compliance evidence collected', {
                evidenceId: result.rows[0].id,
                evidenceType: evidenceData.evidenceType,
            });

            return this.mapEvidenceFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to collect evidence', { error, evidenceData });
            throw error;
        }
    }

    /**
     * Calculate compliance score for tenant
     */
    async calculateComplianceScore(tenantId: string, standardId: string): Promise<number> {
        try {
            // Get all controls for standard
            const controlsResult = await this.pool.query(
                'SELECT COUNT(*) as total FROM compliance_controls WHERE standard_id = $1 AND is_active = true',
                [standardId]
            );

            const totalControls = parseInt(controlsResult.rows[0].total, 10);

            if (totalControls === 0) {
                return 0;
            }

            // Get passing test results
            const testsResult = await this.pool.query(
                `SELECT COUNT(DISTINCT ctr.control_id) as passing
         FROM control_test_results ctr
         JOIN compliance_controls cc ON ctr.control_id = cc.id
         WHERE ctr.tenant_id = $1
           AND cc.standard_id = $2
           AND ctr.test_result = 'pass'
           AND ctr.test_date >= CURRENT_DATE - INTERVAL '90 days'`,
                [tenantId, standardId]
            );

            const passingControls = parseInt(testsResult.rows[0].passing, 10);

            const score = (passingControls / totalControls) * 100;

            logger.info('Compliance score calculated', {
                tenantId,
                standardId,
                score,
                passingControls,
                totalControls,
            });

            return Math.round(score * 100) / 100; // Round to 2 decimals
        } catch (error) {
            logger.error('Failed to calculate compliance score', { error, tenantId, standardId });
            throw error;
        }
    }

    /**
     * Update compliance status
     */
    async updateComplianceStatus(tenantId: string, standardId: string): Promise<void> {
        try {
            // Calculate current score
            const score = await this.calculateComplianceScore(tenantId, standardId);

            // Get total controls
            const controlsResult = await this.pool.query(
                'SELECT COUNT(*) as total FROM compliance_controls WHERE standard_id = $1 AND is_active = true',
                [standardId]
            );

            const totalControls = parseInt(controlsResult.rows[0].total, 10);

            // Get passing controls
            const passingResult = await this.pool.query(
                `SELECT COUNT(DISTINCT ctr.control_id) as passing
         FROM control_test_results ctr
         JOIN compliance_controls cc ON ctr.control_id = cc.id
         WHERE ctr.tenant_id = $1
           AND cc.standard_id = $2
           AND ctr.test_result = 'pass'
           AND ctr.test_date >= CURRENT_DATE - INTERVAL '90 days'`,
                [tenantId, standardId]
            );

            const compliantControls = parseInt(passingResult.rows[0].passing, 10);

            // Get open findings
            const findingsResult = await this.pool.query(
                `SELECT
           COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as open_total,
           COUNT(*) FILTER (WHERE status IN ('open', 'in_progress') AND severity = 'critical') as critical_total
         FROM compliance_findings cf
         JOIN compliance_audits ca ON cf.audit_id = ca.id
         WHERE ca.tenant_id = $1 AND ca.standard_id = $2`,
                [tenantId, standardId]
            );

            const openFindings = parseInt(findingsResult.rows[0].open_total, 10) || 0;
            const criticalFindings = parseInt(findingsResult.rows[0].critical_total, 10) || 0;

            // Get last audit
            const lastAuditResult = await this.pool.query(
                `SELECT audit_date FROM compliance_audits
         WHERE tenant_id = $1 AND standard_id = $2 AND status = 'completed'
         ORDER BY audit_date DESC LIMIT 1`,
                [tenantId, standardId]
            );

            const lastAuditDate = lastAuditResult.rows.length > 0 ? lastAuditResult.rows[0].audit_date : null;

            // Upsert compliance status
            await this.pool.query(
                `INSERT INTO compliance_status (
          tenant_id, standard_id, status_date, overall_score, compliant_controls,
          total_controls, compliance_percentage, open_findings, critical_findings,
          last_audit_date
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, standard_id, status_date)
        DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          compliant_controls = EXCLUDED.compliant_controls,
          total_controls = EXCLUDED.total_controls,
          compliance_percentage = EXCLUDED.compliance_percentage,
          open_findings = EXCLUDED.open_findings,
          critical_findings = EXCLUDED.critical_findings,
          last_audit_date = EXCLUDED.last_audit_date,
          updated_at = CURRENT_TIMESTAMP`,
                [
                    tenantId,
                    standardId,
                    score,
                    compliantControls,
                    totalControls,
                    score,
                    openFindings,
                    criticalFindings,
                    lastAuditDate,
                ]
            );

            logger.info('Compliance status updated', { tenantId, standardId, score });
        } catch (error) {
            logger.error('Failed to update compliance status', { error, tenantId, standardId });
            throw error;
        }
    }

    /**
     * Get compliance status
     */
    async getComplianceStatus(tenantId: string, standardId: string): Promise<IComplianceStatus | null> {
        try {
            const result = await this.pool.query(
                `SELECT * FROM compliance_status
         WHERE tenant_id = $1 AND standard_id = $2
         ORDER BY status_date DESC
         LIMIT 1`,
                [tenantId, standardId]
            );

            return result.rows.length > 0 ? this.mapStatusFromDb(result.rows[0]) : null;
        } catch (error) {
            logger.error('Failed to get compliance status', { error, tenantId, standardId });
            throw error;
        }
    }

    /**
     * Resolve finding
     */
    async resolveFinding(findingId: string, resolutionNotes: string, resolvedBy: string): Promise<IComplianceFinding> {
        try {
            const result = await this.pool.query(
                `UPDATE compliance_findings
         SET status = 'resolved',
             resolution_notes = $1,
             resolved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
                [resolutionNotes, findingId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Finding not found');
            }

            logger.info('Finding resolved', { findingId, resolvedBy });

            return this.mapFindingFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to resolve finding', { error, findingId });
            throw error;
        }
    }

    /**
     * Get control by ID
     */
    private async getControl(controlId: string): Promise<IComplianceControl | null> {
        const result = await this.pool.query(
            'SELECT * FROM compliance_controls WHERE id = $1',
            [controlId]
        );

        return result.rows.length > 0 ? this.mapControlFromDb(result.rows[0]) : null;
    }

    /**
     * Execute test script
     */
    private async executeTestScript(testScript: any, tenantId?: string): Promise<any> {
        // Simplified test execution
        // In production, this would execute actual test scripts
        try {
            if (!testScript || !testScript.checks) {
                return {
                    result: 'not_applicable',
                    details: { message: 'No test script defined' },
                };
            }

            // Simulate test execution
            const allChecksPass = Math.random() > 0.2; // 80% pass rate

            return {
                result: allChecksPass ? 'pass' : 'fail',
                details: {
                    checksPerformed: testScript.checks.length,
                    passed: allChecksPass,
                    timestamp: new Date(),
                },
            };
        } catch (error) {
            return {
                result: 'fail',
                details: { error: error.message },
            };
        }
    }

    /**
     * Generate audit number
     */
    private async generateAuditNumber(standardId: string): Promise<string> {
        const standardResult = await this.pool.query(
            'SELECT standard_code FROM compliance_standards WHERE id = $1',
            [standardId]
        );

        const standardCode = standardResult.rows[0].standard_code;
        const year = new Date().getFullYear();

        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM compliance_audits
       WHERE standard_id = $1 AND EXTRACT(YEAR FROM audit_date) = $2`,
            [standardId, year]
        );

        const seq = (parseInt(countResult.rows[0].count, 10) + 1).toString().padStart(4, '0');

        return `AUDIT-${standardCode}-${year}-${seq}`;
    }

    /**
     * Generate finding number
     */
    private async generateFindingNumber(auditId: string): Promise<string> {
        const countResult = await this.pool.query(
            'SELECT COUNT(*) FROM compliance_findings WHERE audit_id = $1',
            [auditId]
        );

        const seq = (parseInt(countResult.rows[0].count, 10) + 1).toString().padStart(3, '0');

        return `F-${seq}`;
    }

    /**
     * Map standard from database
     */
    private mapStandardFromDb(row: any): IComplianceStandard {
        return {
            id: row.id,
            standardCode: row.standard_code,
            standardName: row.standard_name,
            version: row.version,
            description: row.description,
            authority: row.authority,
            effectiveDate: row.effective_date,
            isActive: row.is_active,
        };
    }

    /**
     * Map control from database
     */
    private mapControlFromDb(row: any): IComplianceControl {
        return {
            id: row.id,
            standardId: row.standard_id,
            controlId: row.control_id,
            controlName: row.control_name,
            controlCategory: row.control_category,
            controlType: row.control_type,
            description: row.description,
            testFrequency: row.test_frequency,
            automatedTest: row.automated_test,
            testScript: row.test_script,
            riskLevel: row.risk_level,
            isActive: row.is_active,
        };
    }

    /**
     * Map audit from database
     */
    private mapAuditFromDb(row: any): IComplianceAudit {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            standardId: row.standard_id,
            auditNumber: row.audit_number,
            auditDate: row.audit_date,
            auditorId: row.auditor_id,
            auditorName: row.auditor_name,
            auditType: row.audit_type,
            scope: row.scope,
            status: row.status,
            findingsCount: row.findings_count,
            criticalFindings: row.critical_findings,
            highFindings: row.high_findings,
            mediumFindings: row.medium_findings,
            lowFindings: row.low_findings,
            score: row.score ? parseFloat(row.score) : undefined,
            result: row.result,
            startDate: row.start_date,
            completionDate: row.completion_date,
            reportUrl: row.report_url,
        };
    }

    /**
     * Map finding from database
     */
    private mapFindingFromDb(row: any): IComplianceFinding {
        return {
            id: row.id,
            auditId: row.audit_id,
            controlId: row.control_id,
            findingNumber: row.finding_number,
            severity: row.severity,
            findingType: row.finding_type,
            findingDescription: row.finding_description,
            evidence: row.evidence,
            impactAssessment: row.impact_assessment,
            remediationPlan: row.remediation_plan,
            assignedTo: row.assigned_to,
            dueDate: row.due_date,
            priority: row.priority,
            status: row.status,
            resolutionNotes: row.resolution_notes,
            resolvedAt: row.resolved_at,
            verifiedAt: row.verified_at,
        };
    }

    /**
     * Map evidence from database
     */
    private mapEvidenceFromDb(row: any): IComplianceEvidence {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            controlId: row.control_id,
            auditId: row.audit_id,
            findingId: row.finding_id,
            evidenceType: row.evidence_type,
            evidenceTitle: row.evidence_title,
            evidenceDescription: row.evidence_description,
            filePath: row.file_path,
            fileSize: row.file_size,
            fileHash: row.file_hash,
            collectedDate: row.collected_date,
            collectedBy: row.collected_by,
            retentionDate: row.retention_date,
            isArchived: row.is_archived,
            metadata: row.metadata,
        };
    }

    /**
     * Map test result from database
     */
    private mapTestResultFromDb(row: any): IControlTestResult {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            controlId: row.control_id,
            testDate: row.test_date,
            testType: row.test_type,
            testResult: row.test_result,
            testDetails: row.test_details,
            testedBy: row.tested_by,
            evidenceId: row.evidence_id,
            notes: row.notes,
        };
    }

    /**
     * Map status from database
     */
    private mapStatusFromDb(row: any): IComplianceStatus {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            standardId: row.standard_id,
            statusDate: row.status_date,
            overallScore: row.overall_score ? parseFloat(row.overall_score) : undefined,
            compliantControls: row.compliant_controls,
            totalControls: row.total_controls,
            compliancePercentage: row.compliance_percentage ? parseFloat(row.compliance_percentage) : undefined,
            openFindings: row.open_findings,
            criticalFindings: row.critical_findings,
            lastAuditDate: row.last_audit_date,
            nextAuditDate: row.next_audit_date,
            certificationStatus: row.certification_status,
            certificationExpiry: row.certification_expiry,
        };
    }
}

export const complianceMonitoringService = new ComplianceMonitoringService();
