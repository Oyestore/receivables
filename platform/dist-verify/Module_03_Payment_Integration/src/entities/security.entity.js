"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControlPolicy = exports.SecurityIncident = exports.EncryptionKey = exports.SecurityContext = void 0;
/**
 * Security Context Entity
 * Manages security context for requests and operations
 */
class SecurityContext {
    constructor(data) {
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
    generateId() {
        return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    hasPermission(permission) {
        return this.permissions.includes(permission) || this.permissions.includes('*');
    }
    hasRole(role) {
        return this.roles.includes(role) || this.roles.includes('admin');
    }
    addSecurityFlag(flag) {
        if (!this.securityFlags.includes(flag)) {
            this.securityFlags.push(flag);
        }
    }
    removeSecurityFlag(flag) {
        this.securityFlags = this.securityFlags.filter(f => f !== flag);
    }
    addAuditEntry(action, resource, result, details) {
        this.auditTrail.push({
            timestamp: new Date(),
            action,
            resource,
            result,
            details
        });
    }
    isExpired() {
        return new Date() > this.expiresAt;
    }
    isHighRisk() {
        return this.riskScore >= 70 || this.trustLevel === 'UNTRUSTED';
    }
    requiresStrongAuthentication() {
        return this.authenticationLevel === 'MULTI_FACTOR' ||
            this.isHighRisk() ||
            this.securityFlags.includes('REQUIRES_MFA');
    }
    canAccessResource(resource, action) {
        if (this.isExpired())
            return false;
        if (this.isHighRisk() && !this.requiresStrongAuthentication())
            return false;
        const requiredPermission = `${resource}:${action}`;
        return this.hasPermission(requiredPermission) || this.hasPermission(`${resource}:*`);
    }
    toJSON() {
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
exports.SecurityContext = SecurityContext;
/**
 * Encryption Key Entity
 * Manages encryption keys and key rotation
 */
class EncryptionKey {
    constructor(data) {
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
    generateId() {
        return `key_${this.keyType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    activate() {
        this.isActive = true;
        this.activatedAt = new Date();
    }
    deactivate() {
        this.isActive = false;
    }
    isExpired() {
        return this.expiresAt ? new Date() > this.expiresAt : false;
    }
    needsRotation() {
        if (!this.rotationSchedule || !this.rotationSchedule.autoRotate)
            return false;
        return new Date() >= this.rotationSchedule.nextRotation;
    }
    recordUsage(operation) {
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
    getTotalUsage() {
        return this.usage.encryptionCount +
            this.usage.decryptionCount +
            this.usage.signingCount +
            this.usage.verificationCount;
    }
    toJSON() {
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
exports.EncryptionKey = EncryptionKey;
/**
 * Security Incident Entity
 * Manages security incidents and responses
 */
class SecurityIncident {
    constructor(data) {
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
    generateId() {
        return `inc_${this.incidentType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    addTimelineEvent(event, details, actor) {
        this.timeline.push({
            timestamp: new Date(),
            event,
            details,
            actor
        });
    }
    addResponseAction(action, actor, result) {
        this.response.actions.push({
            timestamp: new Date(),
            action,
            actor,
            result
        });
    }
    addIndicator(type, value, confidence, description) {
        this.indicators.push({
            type,
            value,
            confidence,
            description
        });
    }
    updateStatus(status) {
        const oldStatus = this.status;
        this.status = status;
        if (status === 'RESOLVED' || status === 'CLOSED') {
            this.resolvedAt = new Date();
        }
        this.addTimelineEvent('STATUS_CHANGE', `Status changed from ${oldStatus} to ${status}`);
    }
    assignTo(userId) {
        this.assignedTo = userId;
        this.addTimelineEvent('ASSIGNMENT', `Incident assigned to ${userId}`);
    }
    escalate(newSeverity) {
        const oldSeverity = this.severity;
        this.severity = newSeverity;
        this.addTimelineEvent('ESCALATION', `Severity escalated from ${oldSeverity} to ${newSeverity}`);
    }
    getResolutionTime() {
        if (!this.resolvedAt)
            return null;
        return this.resolvedAt.getTime() - this.detectedAt.getTime();
    }
    isHighPriority() {
        return this.severity === 'HIGH' || this.severity === 'CRITICAL';
    }
    requiresImmediateAttention() {
        return this.severity === 'CRITICAL' ||
            this.impact.dataCompromised ||
            this.impact.serviceDisruption;
    }
    toJSON() {
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
exports.SecurityIncident = SecurityIncident;
/**
 * Access Control Policy Entity
 * Manages access control policies and rules
 */
class AccessControlPolicy {
    constructor(data) {
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
        this.updatedAt = data.updatedAt(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks);
    }
}
exports.AccessControlPolicy = AccessControlPolicy;
//# sourceMappingURL=security.entity.js.map