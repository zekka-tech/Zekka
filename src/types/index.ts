/**
 * Core Type Definitions for Zekka Framework
 * 
 * Provides TypeScript types for all major components
 */

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  is_active: boolean;
  is_locked: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  password_changed_at: Date;
  password_expires_at?: Date;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  metadata: Record<string, any>;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password_hash'>;
  token: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionData {
  userId: string;
  createdAt: number;
  lastActivity: number;
  deviceFingerprint?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export interface SessionConfig {
  sessionMaxAge?: number;
  sessionName?: string;
  sessionSecret?: string;
  secureCookie?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxConcurrentSessions?: number;
  maxIdleTime?: number;
  trackActivity?: boolean;
  trackLocation?: boolean;
  trackDevice?: boolean;
  rollingSession?: boolean;
}

// ============================================================================
// API Versioning Types
// ============================================================================

export type ApiVersion = 'v1' | 'v2';

export interface ApiVersionConfig {
  defaultVersion: ApiVersion;
  supportedVersions: ApiVersion[];
  deprecatedVersions: ApiVersion[];
  versionHeader: string;
  deprecationWarningDays: number;
}

export interface VersionMetadata {
  version: ApiVersion;
  status: 'active' | 'deprecated' | 'removed';
  introduced: Date;
  deprecatedAt?: Date;
  removalDate?: Date;
  endpoints: EndpointInfo[];
}

export interface EndpointInfo {
  method: string;
  path: string;
  registered: Date;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export type ErrorCode = string;

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'resource'
  | 'database'
  | 'external'
  | 'business'
  | 'security'
  | 'system';

export interface ErrorDetails {
  statusCode?: number;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  recoverable?: boolean;
  retryable?: boolean;
  retryAfter?: number;
  field?: string;
  value?: any;
  userMessage?: string;
  recoverySuggestion?: string;
  originalError?: Error;
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    timestamp: string;
    category: ErrorCategory;
    requestId?: string;
    field?: string;
    value?: any;
    recoverable?: boolean;
    recovery?: {
      suggestion: string;
      retryable?: boolean;
      retryAfter?: number;
    };
    documentation: string;
    stack?: string;
  };
}

// ============================================================================
// Health Check Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type CheckType = 'liveness' | 'readiness' | 'startup';

export interface HealthCheckConfig {
  timeout?: number;
  cacheTimeout?: number;
}

export interface CheckConfig {
  name: string;
  fn: () => Promise<CheckResult>;
  critical?: boolean;
  timeout?: number;
  enabled?: boolean;
}

export interface CheckResult {
  status: HealthStatus;
  message: string;
  latency?: number;
  duration?: number;
  timestamp?: string;
  error?: string;
  metrics?: Record<string, any>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, CheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}

// ============================================================================
// Audit Logging Types
// ============================================================================

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'security_event'
  | 'system_event'
  | 'user_action'
  | 'api_call'
  | 'admin_action';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditOutcome = 'success' | 'failure' | 'partial';

export interface AuditEvent {
  category: AuditCategory;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  action: string;
  message: string;
  actor?: {
    userId?: string;
    email?: string;
    ipAddress?: string;
  };
  target?: Record<string, any>;
  resource?: string;
  changes?: Record<string, any>;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

export interface AuditLoggerConfig {
  logDir?: string;
  retentionDays?: number;
  maxFileSize?: string;
  maxFiles?: string;
  batchSize?: number;
  batchInterval?: number;
}

// ============================================================================
// Encryption Types
// ============================================================================

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
  digest: string;
}

export interface EncryptedData {
  version: number;
  iv: string;
  tag: string;
  encrypted: string;
}

export interface KeyManagerConfig {
  keyStorePath?: string;
  rotationDays?: number;
  maxKeyAge?: number;
}

// ============================================================================
// Password Policy Types
// ============================================================================

export interface PasswordPolicyConfig {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  minUppercase?: number;
  minLowercase?: number;
  minNumbers?: number;
  minSpecialChars?: number;
  preventReuse?: boolean;
  historySize?: number;
  expirationDays?: number;
  warnDaysBefore?: number;
  checkBreaches?: boolean;
  checkCommonPasswords?: boolean;
  maxConsecutiveChars?: number;
  preventUserInfo?: boolean;
  maxFailedAttempts?: number;
  lockoutDurationMinutes?: number;
  requireMFAAfterReset?: boolean;
  minStrengthScore?: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strengthScore: number;
  suggestions: string[];
}

// ============================================================================
// Security Monitoring Types
// ============================================================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertType = 
  | 'failed_login'
  | 'account_lockout'
  | 'suspicious_activity'
  | 'data_breach_attempt'
  | 'unauthorized_access'
  | 'rate_limit_exceeded'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'session_hijacking'
  | 'brute_force'
  | 'privilege_escalation'
  | 'data_exfiltration';

export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface SecurityMetrics {
  authenticationEvents: number;
  failedLogins: number;
  successfulLogins: number;
  activeUsers: Set<string>;
  activeSessions: number;
  apiCalls: number;
  securityViolations: number;
  alerts: SecurityAlert[];
}

// ============================================================================
// Request/Response Extensions
// ============================================================================

export interface AuthenticatedRequest extends ExpressRequest {
  id: string;
  user: {
    userId: string;
    email: string;
    name: string;
  };
  apiVersion: ApiVersion;
  session: SessionData;
}

export interface TypedResponse<T = any> extends ExpressResponse {
  json: (body: T) => this;
}

// ============================================================================
// Service Types
// ============================================================================

export interface UserService {
  createUser(data: CreateUserDto): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  authenticate(credentials: LoginCredentials): Promise<AuthResult>;
  changePassword(userId: string, newPassword: string, userInfo?: Record<string, any>): Promise<void>;
}

export interface ProjectService {
  createProject(data: any): Promise<any>;
  getProject(id: string): Promise<any>;
  listProjects(): Promise<any[]>;
  executeProject(id: string): Promise<void>;
}

// ============================================================================
// Repository Types
// ============================================================================

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  authenticate(email: string, password: string): Promise<User | null>;
  recordFailedLogin(userId: string): Promise<number>;
  unlockAccount(userId: string): Promise<void>;
  addToPasswordHistory(userId: string, passwordHash: string): Promise<void>;
  checkPasswordHistory(userId: string, password: string): Promise<boolean>;
}

// ============================================================================
// Database Types
// ============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolMin: number;
  poolMax: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface DatabaseConnection {
  pool: Pool;
  query: (text: string, params?: any[]) => Promise<any>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  sessionSecret: string;
  jwtSecret: string;
  jwtExpiration: string;
  database: DatabaseConfig;
  redis: {
    host: string;
    port: number;
  };
  budgets: {
    daily: number;
    monthly: number;
  };
  apiKeys: {
    github?: string;
    anthropic?: string;
    openai?: string;
  };
  ollama: {
    host: string;
  };
  orchestrator: {
    maxConcurrentAgents: number;
    defaultModel: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;
export type Callback<T = void> = (error: Error | null, result?: T) => void;
