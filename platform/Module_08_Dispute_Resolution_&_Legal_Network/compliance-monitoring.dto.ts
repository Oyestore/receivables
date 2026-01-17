export class ComplianceMonitoringDto {
    entityId: string;
    entityType: string;
    checkType: string;
    status?: string;
    results?: Record<string, any>;
}
