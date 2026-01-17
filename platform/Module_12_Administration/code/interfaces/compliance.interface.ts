export interface IComplianceStandard {
    id: string;
    standardCode: string;
    standardName: string;
    version?: string;
    description?: string;
    authority?: string;
    effectiveDate?: Date;
    isActive: boolean;
}

export interface IComplianceControl {
    id: string;
    standardId: string;
    controlId: string;
    controlName: string;
    controlCategory?: string;
    controlType: 'preventive' | 'detective' | 'corrective' | 'administrative';
    description?: string;
    testFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';
    automatedTest: boolean;
    testScript?: any;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    isActive: boolean;
}

export interface IComplianceAudit {
    id: string;
    tenantId?: string;
    standardId: string;
    auditNumber: string;
    auditDate: Date;
    auditorId?: string;
    auditorName?: string;
    auditType: 'internal' | 'external' | 'self_assessment' | 'certification';
    scope?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    findingsCount: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    score?: number;
    result?: 'pass' | 'pass_with_findings' | 'fail' | 'pending';
    startDate?: Date;
    completionDate?: Date;
    reportUrl?: string;
}

export interface IComplianceFinding {
    id: string;
    auditId: string;
    controlId?: string;
    findingNumber: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    findingType?: 'non_conformance' | 'observation' | 'opportunity' | 'best_practice';
    findingDescription: string;
    evidence?: string;
    impactAssessment?: string;
    remediationPlan?: string;
    assignedTo?: string;
    dueDate?: Date;
    priority?: number;
    status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'accepted_risk';
    resolutionNotes?: string;
    resolvedAt?: Date;
    verifiedAt?: Date;
}

export interface IComplianceEvidence {
    id: string;
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
    collectedDate: Date;
    collectedBy?: string;
    retentionDate?: Date;
    isArchived: boolean;
    metadata?: any;
}

export interface IControlTestResult {
    id: string;
    tenantId?: string;
    controlId: string;
    testDate: Date;
    testType?: 'automated' | 'manual' | 'walkthrough' | 'inspection';
    testResult: 'pass' | 'fail' | 'warning' | 'not_applicable';
    testDetails?: any;
    testedBy?: string;
    evidenceId?: string;
    notes?: string;
}

export interface IComplianceStatus {
    id: string;
    tenantId: string;
    standardId: string;
    statusDate: Date;
    overallScore?: number;
    compliantControls: number;
    totalControls: number;
    compliancePercentage?: number;
    openFindings: number;
    criticalFindings: number;
    lastAuditDate?: Date;
    nextAuditDate?: Date;
    certificationStatus?: 'certified' | 'expired' | 'in_progress' | 'not_certified';
    certificationExpiry?: Date;
}
