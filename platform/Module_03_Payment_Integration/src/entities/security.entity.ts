import { 
  PaymentGateway, 
  PaymentMethod, 
  PaymentStatus, 
  RiskLevel,
  ComplianceStandard,
  MonitoringMetric 
} from '../../shared/enums/payment-orchestration.enum';

/**
 * Security Context Entity
 * Manages security context for requests and operations
 */
export class SecurityContext {
  public id: string;
  public tenantId: string;
  public userId?: string;
  public sessionId?: string;
  public requestId: string;
  public ipAddress: string;
  public userAgent: string;
  public authenticationMethod: 'JWT' | 'API_KEY' | 'OAUTH' | 'BASIC' | 'NONE';
  public authenticationLevel: 'NONE' | 'BASIC' | 'STRONG' | 'MULTI_FACTOR';
  public permissions: string[];
  public roles: string[];
  public securityFlags: string[];
  public riskScore: number;
  public trustLevel: 'UNTRUSTED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';
  public encryptionLevel: 'NONE' | 'BASIC' | 'STRONG' | 'QUANTUM_SAFE';
  public complianceRequirements: ComplianceStandard[];
  public auditTrail: Array<{
    timestamp: Date;
    action: string;
    resource: string;
    result: 'ALLOW' | 'DENY' | 'CHALLENGE';
    details?: any;
  }>;
  public createdAt: Date;
  public expiresAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<SecurityContext>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.requestId = data.requestId || '';
    this.ipAddress = data.ipAddress || '';
    this.userAgent = data.userAgent || '';
    this.authenticationMethod = data.authenticationMethod || 'NONE';
    this.authenticationLevel = data.authenticationLevel || 'NONE';
    this.permissions = data.permissions || [];
    this.roles = data.roles || [];
    this.securityFlags = data.securityFlags || [];
    this.riskScore = data.riskScore || 0;
    this.trustLevel = data.trustLevel || 'UNTRUSTED';
    this.encryptionLevel = data.encryptionLevel || 'NONE';
    this.complianceRequirements = data.complianceRequirements || [];
    this.auditTrail = data.auditTrail || [];
    this.createdAt = data.createdAt || new Date();
    this.expiresAt = data.expiresAt || new Date(Date.now() + 3600000); // 1 hour default
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.permissions.includes('*');
  }

  public hasRole(role: string): boolean {
    return this.roles.includes(role) || this.roles.includes('admin');
  }

  public addSecurityFlag(flag: string): void {
    if (!this.securityFlags.includes(flag)) {
      this.securityFlags.push(flag);
    }
  }

  public removeSecurityFlag(flag: string): void {
    this.securityFlags = this.securityFlags.filter(f => f !== flag);
  }

  public addAuditEntry(action: string, resource: string, result: 'ALLOW' | 'DENY' | 'CHALLENGE', details?: any): void {
    this.auditTrail.push({
      timestamp: new Date(),
      action,
      resource,
      result,
      details
    });
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isHighRisk(): boolean {
    return this.riskScore >= 70 || this.trustLevel === 'UNTRUSTED';
  }

  public requiresStrongAuthentication(): boolean {
    return this.authenticationLevel === 'MULTI_FACTOR' || 
           this.isHighRisk() || 
           this.securityFlags.includes('REQUIRES_MFA');
  }

  public canAccessResource(resource: string, action: string): boolean {
    if (this.isExpired()) return false;
    if (this.isHighRisk() && !this.requiresStrongAuthentication()) return false;
    
    const requiredPermission = `${resource}:${action}`;
    return this.hasPermission(requiredPermission) || this.hasPermission(`${resource}:*`);
  }

  public toJSON(): any {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      authenticationMethod: this.authenticationMethod,
      authenticationLevel: this.authenticationLevel,
      permissions: this.permissions,
      roles: this.roles,
      securityFlags: this.securityFlags,
      riskScore: this.riskScore,
      trustLevel: this.trustLevel,
      encryptionLevel: this.encryptionLevel,
      complianceRequirements: this.complianceRequirements,
      auditTrail: this.auditTrail,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired(),
      isHighRisk: this.isHighRisk(),
      requiresStrongAuth: this.requiresStrongAuthentication(),
      metadata: this.metadata
    };
  }
}

/**
 * Encryption Key Entity
 * Manages encryption keys and key rotation
 */
export class EncryptionKey {
  public id: string;
  public tenantId: string;
  public keyType: 'AES_256' | 'RSA_2048' | 'RSA_4096' | 'ECC_P256' | 'ECC_P384';
  public purpose: 'DATA_ENCRYPTION' | 'KEY_ENCRYPTION' | 'SIGNING' | 'AUTHENTICATION';
  public algorithm: string;
  public keySize: number;
  public keyData: string; // Base64 encoded
  public publicKey?: string; // For asymmetric keys
  public keyVersion: number;
  public isActive: boolean;
  public createdAt: Date;
  public activatedAt?: Date;
  public expiresAt?: Date;
  public rotationSchedule?: {
    frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'NEVER';
    nextRotation: Date;
    autoRotate: boolean;
  };
  public usage: {
    encryptionCount: number;
    decryptionCount: number;
    signingCount: number;
    verificationCount: number;
    lastUsed?: Date;
  };
  public metadata: Record<string, any>;

  constructor(data: Partial<EncryptionKey>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.keyType = data.keyType || 'AES_256';
    this.purpose = data.purpose || 'DATA_ENCRYPTION';
    this.algorithm = data.algorithm || 'AES-256-GCM';
    this.keySize = data.keySize || 256;
    this.keyData = data.keyData || '';
    this.publicKey = data.publicKey;
    this.keyVersion = data.keyVersion || 1;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.activatedAt = data.activatedAt;
    this.expiresAt = data.expiresAt;
    this.rotationSchedule = data.rotationSchedule;
    this.usage = data.usage || {
      encryptionCount: 0,
      decryptionCount: 0,
      signingCount: 0,
      verificationCount: 0
    };
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `key_${this.keyType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public activate(): void {
    this.isActive = true;
    this.activatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  public needsRotation(): boolean {
    if (!this.rotationSchedule || !this.rotationSchedule.autoRotate) return false;
    return new Date() >= this.rotationSchedule.nextRotation;
  }

  public recordUsage(operation: 'ENCRYPT' | 'DECRYPT' | 'SIGN' | 'VERIFY'): void {
    switch (operation) {
      case 'ENCRYPT':
        this.usage.encryptionCount++;
        break;
      case 'DECRYPT':
        this.usage.decryptionCount++;
        break;
      case 'SIGN':
        this.usage.signingCount++;
        break;
      case 'VERIFY':
        this.usage.verificationCount++;
        break;
    }
    this.usage.lastUsed = new Date();
  }

  public getTotalUsage(): number {
    return this.usage.encryptionCount + 
           this.usage.decryptionCount + 
           this.usage.signingCount + 
           this.usage.verificationCount;
  }

  public toJSON(): any {
    return {
      id: this.id,
      tenantId: this.tenantId,
      keyType: this.keyType,
      purpose: this.purpose,
      algorithm: this.algorithm,
      keySize: this.keySize,
      keyData: '***REDACTED***', // Never expose key data in JSON
      publicKey: this.publicKey,
      keyVersion: this.keyVersion,
      isActive: this.isActive,
      createdAt: this.createdAt,
      activatedAt: this.activatedAt,
      expiresAt: this.expiresAt,
      rotationSchedule: this.rotationSchedule,
      usage: this.usage,
      isExpired: this.isExpired(),
      needsRotation: this.needsRotation(),
      totalUsage: this.getTotalUsage(),
      metadata: this.metadata
    };
  }
}

/**
 * Security Incident Entity
 * Manages security incidents and responses
 */
export class SecurityIncident {
  public id: string;
  public tenantId: string;
  public incidentType: 'AUTHENTICATION_FAILURE' | 'AUTHORIZATION_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 
                      'DATA_BREACH' | 'MALWARE_DETECTED' | 'DDOS_ATTACK' | 'FRAUD_ATTEMPT' | 'OTHER';
  public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  public status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  public title: string;
  public description: string;
  public source: {
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    endpoint?: string;
  };
  public indicators: Array<{
    type: 'IP_ADDRESS' | 'USER_ID' | 'PATTERN' | 'SIGNATURE' | 'BEHAVIOR';
    value: string;
    confidence: number;
    description: string;
  }>;
  public impact: {
    affectedUsers: number;
    affectedTransactions: number;
    dataCompromised: boolean;
    serviceDisruption: boolean;
    financialImpact?: number;
  };
  public timeline: Array<{
    timestamp: Date;
    event: string;
    details: string;
    actor?: string;
  }>;
  public response: {
    actions: Array<{
      timestamp: Date;
      action: string;
      actor: string;
      result: string;
    }>;
    containmentMeasures: string[];
    mitigationSteps: string[];
    preventiveMeasures: string[];
  };
  public assignedTo?: string;
  public detectedAt: Date;
  public reportedAt: Date;
  public resolvedAt?: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<SecurityIncident>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.incidentType = data.incidentType || 'OTHER';
    this.severity = data.severity || 'MEDIUM';
    this.status = data.status || 'OPEN';
    this.title = data.title || '';
    this.description = data.description || '';
    this.source = data.source || {};
    this.indicators = data.indicators || [];
    this.impact = data.impact || {
      affectedUsers: 0,
      affectedTransactions: 0,
      dataCompromised: false,
      serviceDisruption: false
    };
    this.timeline = data.timeline || [];
    this.response = data.response || {
      actions: [],
      containmentMeasures: [],
      mitigationSteps: [],
      preventiveMeasures: []
    };
    this.assignedTo = data.assignedTo;
    this.detectedAt = data.detectedAt || new Date();
    this.reportedAt = data.reportedAt || new Date();
    this.resolvedAt = data.resolvedAt;
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `inc_${this.incidentType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public addTimelineEvent(event: string, details: string, actor?: string): void {
    this.timeline.push({
      timestamp: new Date(),
      event,
      details,
      actor
    });
  }

  public addResponseAction(action: string, actor: string, result: string): void {
    this.response.actions.push({
      timestamp: new Date(),
      action,
      actor,
      result
    });
  }

  public addIndicator(
    type: 'IP_ADDRESS' | 'USER_ID' | 'PATTERN' | 'SIGNATURE' | 'BEHAVIOR',
    value: string,
    confidence: number,
    description: string
  ): void {
    this.indicators.push({
      type,
      value,
      confidence,
      description
    });
  }

  public updateStatus(status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED'): void {
    const oldStatus = this.status;
    this.status = status;
    
    if (status === 'RESOLVED' || status === 'CLOSED') {
      this.resolvedAt = new Date();
    }
    
    this.addTimelineEvent('STATUS_CHANGE', `Status changed from ${oldStatus} to ${status}`);
  }

  public assignTo(userId: string): void {
    this.assignedTo = userId;
    this.addTimelineEvent('ASSIGNMENT', `Incident assigned to ${userId}`);
  }

  public escalate(newSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    const oldSeverity = this.severity;
    this.severity = newSeverity;
    this.addTimelineEvent('ESCALATION', `Severity escalated from ${oldSeverity} to ${newSeverity}`);
  }

  public getResolutionTime(): number | null {
    if (!this.resolvedAt) return null;
    return this.resolvedAt.getTime() - this.detectedAt.getTime();
  }

  public isHighPriority(): boolean {
    return this.severity === 'HIGH' || this.severity === 'CRITICAL';
  }

  public requiresImmediateAttention(): boolean {
    return this.severity === 'CRITICAL' || 
           this.impact.dataCompromised || 
           this.impact.serviceDisruption;
  }

  public toJSON(): any {
    return {
      id: this.id,
      tenantId: this.tenantId,
      incidentType: this.incidentType,
      severity: this.severity,
      status: this.status,
      title: this.title,
      description: this.description,
      source: this.source,
      indicators: this.indicators,
      impact: this.impact,
      timeline: this.timeline,
      response: this.response,
      assignedTo: this.assignedTo,
      detectedAt: this.detectedAt,
      reportedAt: this.reportedAt,
      resolvedAt: this.resolvedAt,
      resolutionTime: this.getResolutionTime(),
      isHighPriority: this.isHighPriority(),
      requiresImmediateAttention: this.requiresImmediateAttention(),
      metadata: this.metadata
    };
  }
}

/**
 * Access Control Policy Entity
 * Manages access control policies and rules
 */
export class AccessControlPolicy {
  public id: string;
  public tenantId: string;
  public name: string;
  public description: string;
  public policyType: 'RBAC' | 'ABAC' | 'MAC' | 'DAC';
  public isActive: boolean;
  public priority: number;
  public conditions: Array<{
    attribute: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN';
    value: any;
    required: boolean;
  }>;
  public rules: Array<{
    resource: string;
    actions: string[];
    effect: 'ALLOW' | 'DENY';
    conditions?: Array<{
      attribute: string;
      operator: string;
      value: any;
    }>;
  }>;
  public subjects: {
    users: string[];
    roles: string[];
    groups: string[];
  };
  public resources: {
    endpoints: string[];
    services: string[];
    data: string[];
  };
  public schedule?: {
    startTime?: string; // HH:MM format
    endTime?: string; // HH:MM format
    daysOfWeek?: number[]; // 0-6, 0 = Sunday
    timezone: string;
  };
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy: string;
  public lastModifiedBy: string;
  public metadata: Record<string, any>;

  constructor(data: Partial<AccessControlPolicy>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.policyType = data.policyType || 'RBAC';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.priority = data.priority || 1;
    this.conditions = data.conditions || [];
    this.rules = data.rules || [];
    this.subjects = data.subjects || {
      users: [],
      roles: [],
      groups: []
    };
    this.resources = data.resources || {
      endpoints: [],
      services: [],
      data: []
    };
    this.schedule = data.schedule;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt
(Content truncated due to size limit. Use line ranges to read in chunks)