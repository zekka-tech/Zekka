/**
 * Ambient type augmentation for Express request objects.
 *
 * Custom properties are attached by early middleware in src/index.ts
 * (requestId, trace context, per-request logger), by the auth middleware
 * (user) and by the tenant-context middleware (tenant).
 */
import type { Logger } from 'winston';

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID, generated or propagated from X-Request-ID. */
      requestId: string;
      /** W3C trace context header, propagated or generated. */
      traceparent?: string;
      tracestate?: string;
      /** Child logger carrying requestId / traceId context. */
      logger?: Logger;
      /** Decoded JWT payload set by the auth middleware. */
      user?: {
        userId: string;
        email?: string;
        role?: string;
        [key: string]: unknown;
      };
      /** Tenant context set by the tenant-context middleware. */
      tenant?: {
        id: string;
        slug: string;
        plan: string;
        subscriptionStatus: string;
        role: string;
      };
    }
  }

  // @sentry/node is an optional peer dependency loaded at runtime only when
  // SENTRY_DSN is configured, so it cannot be statically typed here.
  var Sentry: any;
}

export {};
