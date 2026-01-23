/**
 * Enhanced Audit Logging System
 * 
 * Features:
 * - Structured audit logs with retention policies
 * - Log rotation and archiving
 * - Event categorization and severity levels
 * - Query and search capabilities
 * - Compliance-ready format (GDPR, SOC2)
 * - Performance optimized with batching
 */

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Audit event categories
const AuditCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SECURITY_EVENT: 'security_event',
  SYSTEM_EVENT: 'system_event',
  USER_ACTION: 'user_action',
  API_CALL: 'api_call',
  ADMIN_ACTION: 'admin_action'
};

// Audit event severity
const AuditSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Audit event outcomes
const AuditOutcome = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL: 'partial'
};

class AuditLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'logs', 'audit');
    this.retentionDays = options.retentionDays || 90; // 90 days default
    this.maxFileSize = options.maxFileSize || '100m';
    this.maxFiles = options.maxFiles || '90d';
    this.batchSize = options.batchSize || 100;
    this.batchInterval = options.batchInterval || 5000; // 5 seconds
    
    this.eventBatch = [];
    this.batchTimer = null;
    
    this.ensureLogDirectory();
    this.initializeLogger();
    this.startBatchProcessor();
  }
  
  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (err) {
        // Fall back to /tmp if we can't write to logs directory
        console.warn(`Cannot write to ${this.logDir}, falling back to /tmp`);
        this.logDir = path.join('/tmp', 'zekka-logs', 'audit');
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    }
  }
  
  /**
   * Initialize Winston logger with daily rotation
   */
  initializeLogger() {
    // Audit log transport with daily rotation
    const auditTransport = new transports.DailyRotateFile({
      filename: path.join(this.logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: this.maxFileSize,
      maxFiles: this.maxFiles,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.json()
      )
    });
    
    // Security events transport (separate file for critical events)
    const securityTransport = new transports.DailyRotateFile({
      filename: path.join(this.logDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: this.maxFileSize,
      maxFiles: this.maxFiles,
      level: 'warn',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.json()
      )
    });
    
    this.logger = createLogger({
      transports: [
        auditTransport,
        securityTransport,
        // Console transport for development
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.timestamp({ format: 'HH:mm:ss' }),
            format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [AUDIT] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            })
          )
        })
      ]
    });
  }
  
  /**
   * Start batch processor for performance optimization
   */
  startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.batchInterval);
  }
  
  /**
   * Flush event batch to logger
   */
  flushBatch() {
    if (this.eventBatch.length === 0) return;
    
    const events = [...this.eventBatch];
    this.eventBatch = [];
    
    events.forEach(event => {
      const level = this.getSeverityLevel(event.severity);
      this.logger.log(level, event.message, event.metadata);
    });
  }
  
  /**
   * Get Winston log level from audit severity
   */
  getSeverityLevel(severity) {
    switch (severity) {
      case AuditSeverity.INFO: return 'info';
      case AuditSeverity.WARNING: return 'warn';
      case AuditSeverity.ERROR: return 'error';
      case AuditSeverity.CRITICAL: return 'error';
      default: return 'info';
    }
  }
  
  /**
   * Log audit event
   */
  log(event) {
    const auditEvent = {
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId(),
      category: event.category,
      severity: event.severity || AuditSeverity.INFO,
      outcome: event.outcome || AuditOutcome.SUCCESS,
      message: event.message,
      metadata: {
        actor: event.actor || {},
        target: event.target || {},
        action: event.action,
        requestId: event.requestId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resource: event.resource,
        changes: event.changes,
        additionalData: event.additionalData || {}
      }
    };
    
    // Critical events are logged immediately
    if (event.severity === AuditSeverity.CRITICAL) {
      const level = this.getSeverityLevel(event.severity);
      this.logger.log(level, auditEvent.message, auditEvent.metadata);
    } else {
      // Add to batch for performance
      this.eventBatch.push(auditEvent);
      
      // Flush if batch is full
      if (this.eventBatch.length >= this.batchSize) {
        this.flushBatch();
      }
    }
    
    return auditEvent.eventId;
  }
  
  /**
   * Log authentication event
   */
  logAuthentication(action, outcome, actor, additionalData = {}) {
    return this.log({
      category: AuditCategory.AUTHENTICATION,
      severity: outcome === AuditOutcome.FAILURE ? AuditSeverity.WARNING : AuditSeverity.INFO,
      outcome,
      action,
      message: `Authentication ${action}: ${outcome}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log authorization event
   */
  logAuthorization(action, outcome, actor, resource, additionalData = {}) {
    return this.log({
      category: AuditCategory.AUTHORIZATION,
      severity: outcome === AuditOutcome.FAILURE ? AuditSeverity.WARNING : AuditSeverity.INFO,
      outcome,
      action,
      resource,
      message: `Authorization ${action} for ${resource}: ${outcome}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log data access event
   */
  logDataAccess(action, actor, resource, additionalData = {}) {
    return this.log({
      category: AuditCategory.DATA_ACCESS,
      severity: AuditSeverity.INFO,
      outcome: AuditOutcome.SUCCESS,
      action,
      resource,
      message: `Data access: ${action} on ${resource}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log data modification event
   */
  logDataModification(action, actor, resource, changes, additionalData = {}) {
    return this.log({
      category: AuditCategory.DATA_MODIFICATION,
      severity: AuditSeverity.INFO,
      outcome: AuditOutcome.SUCCESS,
      action,
      resource,
      changes,
      message: `Data modification: ${action} on ${resource}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log security event
   */
  logSecurityEvent(action, severity, outcome, actor, additionalData = {}) {
    return this.log({
      category: AuditCategory.SECURITY_EVENT,
      severity,
      outcome,
      action,
      message: `Security event: ${action}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log admin action
   */
  logAdminAction(action, actor, target, additionalData = {}) {
    return this.log({
      category: AuditCategory.ADMIN_ACTION,
      severity: AuditSeverity.WARNING, // Admin actions are always important
      outcome: AuditOutcome.SUCCESS,
      action,
      target,
      message: `Admin action: ${action}`,
      actor,
      additionalData
    });
  }
  
  /**
   * Log API call
   */
  logApiCall(method, path, statusCode, actor, requestId, additionalData = {}) {
    const outcome = statusCode >= 200 && statusCode < 400 
      ? AuditOutcome.SUCCESS 
      : AuditOutcome.FAILURE;
    
    const severity = statusCode >= 500 
      ? AuditSeverity.ERROR 
      : statusCode >= 400 
        ? AuditSeverity.WARNING 
        : AuditSeverity.INFO;
    
    return this.log({
      category: AuditCategory.API_CALL,
      severity,
      outcome,
      action: `${method} ${path}`,
      message: `API call: ${method} ${path} - ${statusCode}`,
      actor,
      requestId,
      additionalData: {
        ...additionalData,
        statusCode,
        method,
        path
      }
    });
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Flush remaining events
    this.flushBatch();
    
    // Wait for logger to finish
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Singleton instance
let auditLoggerInstance = null;

/**
 * Get audit logger instance
 */
function getAuditLogger(options) {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(options);
  }
  return auditLoggerInstance;
}

module.exports = {
  AuditLogger,
  getAuditLogger,
  AuditCategory,
  AuditSeverity,
  AuditOutcome
};
