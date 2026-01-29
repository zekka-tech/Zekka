/**
 * Zekka Framework - Core Type Definitions
 * Comprehensive TypeScript types for enterprise-grade AI orchestration
 *
 * @version 3.0.0
 * @module types
 */

import { Request, Response, NextFunction } from "express";

// ============================================================================
// Core Types
// ============================================================================

export type UUID = string;
export type ISODateTime = string;
export type JWT = string;
export type URL = string;
export type Email = string;
export type PhoneNumber = string;

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: UUID;
  email: Email;
  username: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  mfa_enabled: boolean;
  mfa_secret?: string;
  password_changed_at: ISODateTime;
  failed_login_attempts: number;
  locked_until?: ISODateTime;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  last_login_at?: ISODateTime;
  metadata?: Record<string, unknown>;
}

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

export interface AuthToken {
  access_token: JWT;
  refresh_token: JWT;
  token_type: "Bearer";
  expires_in: number;
  user: Omit<User, "password_hash" | "mfa_secret">;
}

export interface MFASetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface MFAVerification {
  token: string;
  backup_code?: string;
}

// ============================================================================
// Audit & Security Types
// ============================================================================

export interface AuditLog {
  id: UUID;
  user_id?: UUID;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  request_body?: Record<string, unknown>;
  response_body?: Record<string, unknown>;
  success: boolean;
  error?: string;
  duration_ms: number;
  geo_location?: GeoLocation;
  created_at: ISODateTime;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface SecurityEvent {
  id: UUID;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  user_id?: UUID;
  ip_address: string;
  description: string;
  risk_level: number;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolved_at?: ISODateTime;
  created_at: ISODateTime;
}

export enum SecurityEventType {
  FAILED_LOGIN = "failed_login",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  UNUSUAL_IP = "unusual_ip",
  MFA_FAILED = "mfa_failed",
  PASSWORD_CHANGE = "password_change",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  DATA_EXPORT = "data_export",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
}

export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// ============================================================================
// API & Request/Response Types
// ============================================================================

export interface APIRequest extends Request {
  user?: User;
  api_version?: string;
  rate_limit?: RateLimitInfo;
  correlation_id?: string;
  start_time?: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMetadata {
  timestamp: ISODateTime;
  request_id: string;
  duration_ms: number;
  api_version: string;
  rate_limit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
}

// ============================================================================
// Pagination & Filtering Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Service & Integration Types
// ============================================================================

export interface ServiceConfig {
  name: string;
  enabled: boolean;
  api_key?: string;
  base_url?: string;
  timeout?: number;
  retry_count?: number;
  circuit_breaker?: CircuitBreakerConfig;
  cache_ttl?: number;
}

export interface CircuitBreakerConfig {
  failure_threshold: number;
  success_threshold: number;
  timeout: number;
  reset_timeout: number;
}

export interface IntegrationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration_ms: number;
  cached?: boolean;
}

// ============================================================================
// Monitoring & Metrics Types
// ============================================================================

export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export interface HealthCheck {
  status: "healthy" | "unhealthy" | "degraded";
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    external_services: ComponentHealth;
  };
  timestamp: ISODateTime;
}

export interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latency_ms?: number;
  error?: string;
  last_check: ISODateTime;
}

export interface PerformanceMetrics {
  request_count: number;
  error_count: number;
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  cache_hit_rate: number;
  active_connections: number;
}

// ============================================================================
// Compliance & GDPR Types
// ============================================================================

export interface DataSubjectRequest {
  id: UUID;
  user_id: UUID;
  request_type: DSRType;
  status: DSRStatus;
  requested_at: ISODateTime;
  completed_at?: ISODateTime;
  metadata?: Record<string, unknown>;
}

export enum DSRType {
  ACCESS = "access",
  PORTABILITY = "portability",
  ERASURE = "erasure",
  RECTIFICATION = "rectification",
  RESTRICTION = "restriction",
  OBJECTION = "objection",
}

export enum DSRStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

export interface ConsentRecord {
  id: UUID;
  user_id: UUID;
  purpose: string;
  consent_given: boolean;
  consent_date: ISODateTime;
  expiry_date?: ISODateTime;
  withdrawn_date?: ISODateTime;
}

// ============================================================================
// Database & Migration Types
// ============================================================================

export interface Migration {
  id: number;
  name: string;
  executed_at: ISODateTime;
  execution_time_ms: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  pool_size?: number;
  idle_timeout?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ZekkaError extends Error {
  constructor(
    message: string,
    public code: string,
    public status_code: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ZekkaError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ZekkaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ZekkaError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ZekkaError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "AUTHORIZATION_ERROR", 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ZekkaError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends ZekkaError {
  constructor(retry_after: number) {
    super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429, { retry_after });
    this.name = "RateLimitError";
  }
}

// ============================================================================
// Middleware Types
// ============================================================================

export type MiddlewareFunction = (
  req: APIRequest,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

export interface AuthMiddleware {
  authenticate: MiddlewareFunction;
  authorize: (roles: UserRole[]) => MiddlewareFunction;
  verifyMFA: MiddlewareFunction;
}

// ============================================================================
// Testing Types
// ============================================================================

export interface TestContext {
  user?: User;
  token?: JWT;
  db?: any;
  redis?: any;
}

export interface MockService {
  reset: () => void;
  verify: () => void;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  env: "development" | "staging" | "production";
  port: number;
  host: string;
  log_level: "debug" | "info" | "warn" | "error";
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl?: number;
}

export interface JWTConfig {
  secret: string;
  access_token_ttl: number;
  refresh_token_ttl: number;
  issuer: string;
  audience: string;
}

export interface SecurityConfig {
  rate_limit: {
    window_ms: number;
    max_requests: number;
  };
  password: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
    history_count: number;
    expiry_days: number;
  };
  session: {
    max_age: number;
    absolute_timeout: number;
  };
}

export interface MonitoringConfig {
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
  grafana: {
    enabled: boolean;
    url: string;
    api_key?: string;
  };
  alerting: {
    enabled: boolean;
    channels: string[];
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// ============================================================================
// Exports
// ============================================================================

export default {
  User,
  UserRole,
  UserStatus,
  AuthToken,
  MFASetup,
  AuditLog,
  SecurityEvent,
  APIRequest,
  APIResponse,
  ZekkaError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
};
