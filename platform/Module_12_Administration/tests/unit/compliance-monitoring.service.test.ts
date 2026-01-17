import { ComplianceMonitoringService } from '../code/services/compliance-monitoring.service';

describe('ComplianceMonitoringService', () => {
    let complianceService: ComplianceMonitoringService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
            connect: jest.fn(() => ({
                query: jest.fn(),
                release: jest.fn(),
            })),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        complianceService = new ComplianceMonitoringService();
    });

    describe('getStandards', () => {
        it('should return all active standards', async () => {
            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        id: 'std-1',
                        standard_code: 'GDPR',
                        standard_name: 'General Data Protection Regulation',
                        version: '2016/679',
                        is_active: true,
                    },
                    {
                        id: 'std-2',
                        standard_code: 'SOC2',
                        standard_name: 'SOC 2 Type II',
                        version: '2017',
                        is_active: true,
                    },
                ],
            });

            const result = await complianceService.getStandards(true);

            expect(result).toHaveLength(2);
            expect(result[0].standardCode).toBe('GDPR');
            expect(result[1].standardCode).toBe('SOC2');
        });
    });

    describe('createAudit', () => {
        it('should create compliance audit', async () => {
            const auditData = {
                tenantId: 'tenant-123',
                standardId: 'std-gdpr',
                auditDate: new Date('2024-06-01'),
                auditorName: 'John Auditor',
                auditType: 'internal' as const,
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ id: 'std-gdpr', standard_code: 'GDPR' }],
                })
                .mockResolvedValueOnce({ rows: [{ count: '5' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'audit-123',
                        tenant_id: auditData.tenantId,
                        standard_id: auditData.standardId,
                        audit_number: 'AUDIT-GDPR-2024-0006',
                        audit_date: auditData.auditDate,
                        auditor_name: auditData.auditorName,
                        audit_type: auditData.auditType,
                        status: 'planned',
                        findings_count: 0,
                        critical_findings: 0,
                        high_findings: 0,
                        medium_findings: 0,
                        low_findings: 0,
                    }],
                });

            const result = await complianceService.createAudit(auditData);

            expect(result.auditNumber).toBe('AUDIT-GDPR-2024-0006');
            expect(result.status).toBe('planned');
            expect(result.auditType).toBe('internal');
        });
    });

    describe('addFinding', () => {
        it('should add finding to audit', async () => {
            const findingData = {
                auditId: 'audit-123',
                severity: 'high' as const,
                findingDescription: 'Data retention policy not properly documented',
                remediationPlan: 'Document and implement retention policy',
                priority: 1,
            };

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    rows: [{ id: findingData.auditId }],
                })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'finding-123',
                        audit_id: findingData.auditId,
                        finding_number: 'F-001',
                        severity: findingData.severity,
                        finding_description: findingData.findingDescription,
                        remediation_plan: findingData.remediationPlan,
                        priority: findingData.priority,
                        status: 'open',
                    }],
                })
                .mockResolvedValueOnce() // Update audit
                .mockResolvedValueOnce(); // COMMIT

            const result = await complianceService.addFinding(findingData);

            expect(result.findingNumber).toBe('F-001');
            expect(result.severity).toBe('high');
            expect(result.status).toBe('open');
        });
    });

    describe('runAutomatedTest', () => {
        it('should run automated control test', async () => {
            const controlId = 'control-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: controlId,
                        automated_test: true,
                        test_script: { checks: ['check1', 'check2'] },
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'test-123',
                        control_id: controlId,
                        test_type: 'automated',
                        test_result: 'pass',
                        test_date: new Date(),
                    }],
                });

            const result = await complianceService.runAutomatedTest(controlId);

            expect(result.testResult).toMatch(/pass|fail|warning|not_applicable/);
            expect(result.testType).toBe('automated');
        });

        it('should throw error for non-automated control', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'control-123',
                    automated_test: false,
                }],
            });

            await expect(
                complianceService.runAutomatedTest('control-123')
            ).rejects.toThrow('Control does not have automated testing enabled');
        });
    });

    describe('collectEvidence', () => {
        it('should collect compliance evidence', async () => {
            const evidenceData = {
                tenantId: 'tenant-123',
                controlId: 'control-456',
                evidenceType: 'document' as const,
                evidenceTitle: 'Data Processing Agreement',
                filePath: '/evidence/dpa.pdf',
                fileSize: 1024000,
                retentionDays: 365,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'evidence-123',
                    tenant_id: evidenceData.tenantId,
                    control_id: evidenceData.controlId,
                    evidence_type: evidenceData.evidenceType,
                    evidence_title: evidenceData.evidenceTitle,
                    file_path: evidenceData.filePath,
                    file_size: evidenceData.fileSize,
                    collected_date: new Date(),
                    is_archived: false,
                }],
            });

            const result = await complianceService.collectEvidence(evidenceData, 'user-123');

            expect(result.evidenceTitle).toBe('Data Processing Agreement');
            expect(result.evidenceType).toBe('document');
            expect(result.isArchived).toBe(false);
        });
    });

    describe('calculateComplianceScore', () => {
        it('should calculate compliance score correctly', async () => {
            const tenantId = 'tenant-123';
            const standardId = 'std-gdpr';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ total: '20' }], // Total controls
                })
                .mockResolvedValueOnce({
                    rows: [{ passing: '16' }], // Passing controls
                });

            const score = await complianceService.calculateComplianceScore(tenantId, standardId);

            expect(score).toBe(80); // 16/20 = 80%
        });

        it('should return 0 if no controls', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: '0' }],
            });

            const score = await complianceService.calculateComplianceScore('tenant-123', 'std-123');

            expect(score).toBe(0);
        });
    });

    describe('updateComplianceStatus', () => {
        it('should update compliance status', async () => {
            const tenantId = 'tenant-123';
            const standardId = 'std-soc2';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ total: '50' }] }) // Total controls (for score calc)
                .mockResolvedValueOnce({ rows: [{ passing: '45' }] }) // Passing (for score calc)
                .mockResolvedValueOnce({ rows: [{ total: '50' }] }) // Total controls
                .mockResolvedValueOnce({ rows: [{ passing: '45' }] }) // Passing controls
                .mockResolvedValueOnce({
                    rows: [{ open_total: '5', critical_total: '1' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ audit_date: new Date('2024-05-01') }],
                })
                .mockResolvedValueOnce({ rows: [] }); // Upsert

            await complianceService.updateComplianceStatus(tenantId, standardId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO compliance_status'),
                expect.any(Array)
            );
        });
    });

    describe('getComplianceStatus', () => {
        it('should return compliance status', async () => {
            const tenantId = 'tenant-123';
            const standardId = 'std-iso27001';

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'status-123',
                    tenant_id: tenantId,
                    standard_id: standardId,
                    status_date: new Date(),
                    overall_score: 92.5,
                    compliant_controls: 37,
                    total_controls: 40,
                    compliance_percentage: 92.5,
                    open_findings: 3,
                    critical_findings: 0,
                }],
            });

            const result = await complianceService.getComplianceStatus(tenantId, standardId);

            expect(result).not.toBeNull();
            expect(result?.overallScore).toBe(92.5);
            expect(result?.compliantControls).toBe(37);
            expect(result?.totalControls).toBe(40);
        });
    });

    describe('resolveFinding', () => {
        it('should resolve finding', async () => {
            const findingId = 'finding-123';
            const resolutionNotes = 'Policy documented and approved';

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: findingId,
                    status: 'resolved',
                    resolution_notes: resolutionNotes,
                    resolved_at: new Date(),
                }],
            });

            const result = await complianceService.resolveFinding(findingId, resolutionNotes, 'user-123');

            expect(result.status).toBe('resolved');
            expect(result.resolutionNotes).toBe(resolutionNotes);
        });
    });
});
