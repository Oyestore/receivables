import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { User } from '../types/auth.types';

// Audit event types
export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  
  // Authorization events
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  
  // Data events
  DATA_CREATE = 'DATA_CREATE',
  DATA_READ = 'DATA_READ',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  BULK_OPERATION = 'BULK_OPERATION',
  
  // System events
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  
  // Business events
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_DELETED = 'INVOICE_DELETED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DISPUTE_CREATED = 'DISPUTE_CREATED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  CREDIT_SCORE_GENERATED = 'CREDIT_SCORE_GENERATED',
  FINANCING_APPROVED = 'FINANCING_APPROVED',
  
  // Security events
  SECURITY_BREACH = 'SECURITY_BREACH',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  MALICIOUS_REQUEST = 'MALICIOUS_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // Compliance events
  GDPR_REQUEST = 'GDPR_REQUEST',
  DATA_RETENTION = 'DATA_RETENTION',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  AUDIT_REPORT = 'AUDIT_REPORT',
}

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  details?: Record<string, any>;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA' | 'SYSTEM' | 'BUSINESS' | 'SECURITY' | 'COMPLIANCE';
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  metadata?: Record<string, any>;
}

// Audit log query filters
export interface AuditLogQuery {
  userId?: string;
  tenantId?: string;
  eventType?: AuditEventType;
  category?: string;
  severity?: string;
  status?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

// Audit service class
export class AuditService {
  private pool: Pool;
  private redis: Redis;
  private batchSize = 100;
  private batchTimeout = 5000; // 5 seconds
  private pendingLogs: AuditLogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.initializeDatabase();
  }

  // Initialize audit tables
  private async initializeDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create audit_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(50) NOT NULL,
          user_id UUID,
          tenant_id UUID,
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          resource VARCHAR(255),
          resource_id UUID,
          action VARCHAR(100),
          details JSONB,
          old_value JSONB,
          new_value JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
          category VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
      `);

      console.log('✅ Audit database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize audit database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Log an audit event
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Add to batch for performance
    this.pendingLogs.push(auditEntry);

    // Process batch if it's full or start timer
    if (this.pendingLogs.length >= this.batchSize) {
      await this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
    }
  }

  // Process batch of audit logs
  private async processBatch(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const batch = [...this.pendingLogs];
    this.pendingLogs = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    try {
      await this.insertBatch(batch);
    } catch (error) {
      console.error('Failed to process audit log batch:', error);
      // Re-add failed logs to pending for retry
      this.pendingLogs.unshift(...batch);
    }
  }

  // Insert batch of audit logs
  private async insertBatch(batch: AuditLogEntry[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const entry of batch) {
        const query = `
          INSERT INTO audit_logs (
            event_type, user_id, tenant_id, session_id, ip_address, user_agent,
            resource, resource_id, action, details, old_value, new_value,
            timestamp, severity, category, status, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
        `;

        const values = [
          entry.eventType,
          entry.userId || null,
          entry.tenantId || null,
          entry.sessionId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.resource || null,
          entry.resourceId || null,
          entry.action || null,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.oldValue ? JSON.stringify(entry.oldValue) : null,
          entry.newValue ? JSON.stringify(entry.newValue) : null,
          entry.timestamp,
          entry.severity,
          entry.category,
          entry.status,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
        ];

        await client.query(query, values);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Query audit logs
  async query(filters: AuditLogQuery): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const client = await this.pool.connect();
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(filters.userId);
      }

      if (filters.tenantId) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        values.push(filters.tenantId);
      }

      if (filters.eventType) {
        conditions.push(`event_type = $${paramIndex++}`);
        values.push(filters.eventType);
      }

      if (filters.category) {
        conditions.push(`category = $${paramIndex++}`);
        values.push(filters.category);
      }

      if (filters.severity) {
        conditions.push(`severity = $${paramIndex++}`);
        values.push(filters.severity);
      }

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.resource) {
        conditions.push(`resource = $${paramIndex++}`);
        values.push(filters.resource);
      }

      if (filters.resourceId) {
        conditions.push(`resource_id = $${paramIndex++}`);
        values.push(filters.resourceId);
      }

      if (filters.startDate) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(filters.endDate);
      }

      if (filters.ipAddress) {
        conditions.push(`ip_address = $${paramIndex++}`);
        values.push(filters.ipAddress);
      }

      if (filters.sessionId) {
        conditions.push(`session_id = $${paramIndex++}`);
        values.push(filters.sessionId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      const sortBy = filters.sortBy || 'timestamp';
      const sortOrder = filters.sortOrder || 'desc';
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Build LIMIT and OFFSET
      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;
      const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(limit, offset);

      // Main query
      const query = `
        SELECT * FROM audit_logs 
        ${whereClause} 
        ${orderClause} 
        ${limitClause}
      `;

      const result = await client.query(query, values);
      const logs = result.rows.map(this.mapRowToAuditLog);

      return { logs, total };
    } finally {
      client.release();
    }
  }

  // Get audit log by ID
  async findById(id: string): Promise<AuditLogEntry | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToAuditLog(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // Get recent audit logs for a user
  async getUserRecentActivity(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.query({
      userId,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then(result => result.logs);
  }

  // Get security events
  async getSecurityEvents(severity?: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this.query({
      category: 'SECURITY',
      severity,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then(result => result.logs);
  }

  // Get compliance report
  async getComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Get summary statistics
      const summaryQuery = `
        SELECT 
          category,
          severity,
          status,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY category, severity, status
        ORDER BY count DESC
      `;
      
      const summaryResult = await client.query(summaryQuery, [startDate, endDate]);

      // Get top users by activity
      const usersQuery = `
        SELECT 
          user_id,
          COUNT(*) as activity_count
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
          AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY activity_count DESC
        LIMIT 10
      `;
      
      const usersResult = await client.query(usersQuery, [startDate, endDate]);

      // Get top event types
      const eventsQuery = `
        SELECT 
          event_type,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const eventsResult = await client.query(eventsQuery, [startDate, endDate]);

      return {
        period: { startDate, endDate },
        summary: summaryResult.rows,
        topUsers: usersResult.rows,
        topEvents: eventsResult.rows,
      };
    } finally {
      client.release();
    }
  }

  // Cleanup old audit logs (data retention)
  async cleanup(retentionDays: number = 365): Promise<number> {
    const client = await this.pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await client.query(
        'DELETE FROM audit_logs WHERE timestamp < $1',
        [cutoffDate]
      );

      console.log(`🧹 Cleaned up ${result.rowCount} old audit log entries`);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Map database row to audit log entry
  private mapRowToAuditLog(row: any): AuditLogEntry {
    return {
      id: row.id,
      eventType: row.event_type,
      userId: row.user_id,
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      resource: row.resource,
      resourceId: row.resource_id,
      action: row.action,
      details: row.details,
      oldValue: row.old_value,
      newValue: row.new_value,
      timestamp: row.timestamp,
      severity: row.severity,
      category: row.category,
      status: row.status,
      metadata: row.metadata,
    };
  }

  // Force process any pending logs
  async flush(): Promise<void> {
    if (this.pendingLogs.length > 0) {
      await this.processBatch();
    }
  }

  // Get audit statistics
  async getStatistics(days: number = 30): Promise<any> {
    const client = await this.pool.connect();
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT tenant_id) as unique_tenants,
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_events,
          COUNT(CASE WHEN status = 'FAILURE' THEN 1 END) as failed_events,
          COUNT(CASE WHEN category = 'SECURITY' THEN 1 END) as security_events
        FROM audit_logs 
        WHERE timestamp >= $1
      `;

      const result = await client.query(query, [startDate]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Audit middleware factory
export const createAuditMiddleware = (auditService: AuditService) => {
  return (req: any, res: any, next: any) => {
    // Store audit service in request for use in handlers
    req.audit = auditService;
    
    // Log request start
    const startTime = Date.now();
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the request completion
      auditService.log({
        eventType: AuditEventType.DATA_READ,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        sessionId: req.sessionId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        resource: req.path,
        action: req.method,
        details: {
          statusCode: res.statusCode,
          duration,
          requestSize: req.headers['content-length'],
          responseSize: res.get('content-length'),
        },
        severity: res.statusCode >= 400 ? 'HIGH' : 'LOW',
        category: 'DATA',
        status: res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
        metadata: {
          url: req.url,
          method: req.method,
          headers: req.headers,
        },
      });
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Quick audit logging functions
export const auditLog = {
  login: (auditService: AuditService, user: User, ipAddress?: string, userAgent?: string) => {
    return auditService.log({
      eventType: AuditEventType.USER_LOGIN,
      userId: user.id,
      tenantId: user.tenantId,
      ipAddress,
      userAgent,
      details: { userEmail: user.email, userRole: user.role },
      severity: 'LOW',
      category: 'AUTHENTICATION',
      status: 'SUCCESS',
    });
  },
  
  logout: (auditService: AuditService, user: User, sessionId?: string) => {
    return auditService.log({
      eventType: AuditEventType.USER_LOGOUT,
      userId: user.id,
      tenantId: user.tenantId,
      sessionId,
      details: { userEmail: user.email },
      severity: 'LOW',
      category: 'AUTHENTICATION',
      status: 'SUCCESS',
    });
  },
  
  accessDenied: (auditService: AuditService, userId: string, resource: string, action: string, ipAddress?: string) => {
    return auditService.log({
      eventType: AuditEventType.ACCESS_DENIED,
      userId,
      resource,
      action,
      ipAddress,
      details: { attemptedAction: action },
      severity: 'HIGH',
      category: 'SECURITY',
      status: 'FAILURE',
    });
  },
  
  dataChange: (auditService: AuditService, user: User, resource: string, resourceId: string, action: string, oldValue?: any, newValue?: any) => {
    return auditService.log({
      eventType: action === 'CREATE' ? AuditEventType.DATA_CREATE : 
                 action === 'UPDATE' ? AuditEventType.DATA_UPDATE : 
                 AuditEventType.DATA_DELETE,
      userId: user.id,
      tenantId: user.tenantId,
      resource,
      resourceId,
      action,
      oldValue,
      newValue,
      severity: 'MEDIUM',
      category: 'DATA',
      status: 'SUCCESS',
    });
  },
};

export default AuditService;
