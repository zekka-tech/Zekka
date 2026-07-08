# Production Readiness Implementation Plan

Audit date: 2026-04-06  
Baseline: 462 tests passing (174 backend, 288 frontend)  
Branch: `codex/production-readiness-remediation`

---

## Summary

60 gaps identified across 10 dimensions. All items from the original Phases 1–5 are complete. This plan covers remaining work only.

| Dimension | Critical | High | Medium | Low | Total |
|-----------|:--------:|:----:|:------:|:---:|------:|
| Security | 1 | 5 | 2 | 0 | 8 |
| Backend Reliability | 1 | 3 | 4 | 0 | 8 |
| API Completeness | 1 | 2 | 2 | 1 | 6 |
| Frontend | 0 | 1 | 6 | 1 | 8 |
| Database | 1 | 2 | 3 | 0 | 6 |
| Logging/Observability | 1 | 1 | 4 | 0 | 6 |
| Testing | 1 | 1 | 3 | 0 | 5 |
| Config/Secrets | 1 | 1 | 2 | 0 | 4 |
| Documentation | 0 | 0 | 3 | 1 | 4 |
| Performance | 0 | 0 | 3 | 2 | 5 |
| **Total** | **7** | **16** | **32** | **5** | **60** |

---

## Critical Issues (7)

| # | Issue | File | Fix |
|---|-------|------|-----|
| C1 | No `unhandledRejection` / `uncaughtException` handlers — process dies silently in Node 16+ | `src/index.js` | Add process-level handlers before server start; forward to Sentry |
| C2 | Services call `db.query()` directly — no retry on transient DB failures | `src/services/*.js` | Switch all service DB calls to existing `db.queryWithRetry()` helper |
| C3 | Backend services have **zero dedicated unit tests** | `tests/unit/services/` | Write unit tests for `auth.service`, `project.service`, `conversation.service` targeting ≥80% coverage |
| C4 | No down/rollback migration scripts — forward-only migrations block safe deploys | `migrations/` | Create `001_down.sql` – `006_down.sql` inverting each migration |
| C5 | Email uniqueness not enforced case-insensitively — `user@x.com` and `USER@X.COM` create duplicate accounts | `migrations/003_create_user_tables.sql` | `CREATE UNIQUE INDEX ON users (LOWER(email))` |
| C6 | No structured log context (requestId, userId) propagated through services — traces unrelatable | `src/utils/logger.js`, `src/services/` | Add child-logger pattern with request context to all service log calls |
| C7 | Required env vars only warn on missing values — app starts in broken state in production | `src/config/index.js` | Throw (not warn) when required vars are absent and `NODE_ENV=production` |

---

## High Issues (16)

| # | Issue | File | Fix |
|---|-------|------|-----|
| H1 | No request ID middleware — `requestId` referenced in error handler but never generated | `src/middleware/` | Add UUID-generating middleware; inject into logs and `X-Request-ID` response header |
| H2 | No idempotency key deduplication on POST / PATCH / DELETE | `src/routes/*.js` | Add idempotency-key header validation and Redis-backed deduplication on write endpoints |
| H3 | JWT algorithm not pinned — vulnerable to algorithm confusion attacks | `src/middleware/auth.js:44` | `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` |
| H4 | SSRF risk — `OLLAMA_HOST` and external API URLs used without private IP range validation | `src/services/model-client.js:69` | Validate all URL configs against domain allowlist; block `10.0.0.0/8`, `127.0.0.1`, `169.254.0.0/16` |
| H5 | Token scope enforcement missing — all authenticated tokens get full API access | `src/middleware/auth.js:54` | Add `scope` claim to JWT; validate required scopes per route |
| H6 | Database connection pool exhaustion not checked in `/readyz` — requests queue indefinitely | `src/index.js:310`, `src/config/database.js` | Fail readiness if `pool.waiting > pool.max * 0.8` |
| H7 | No graceful shutdown drain — in-flight requests killed immediately on SIGTERM | `src/index.js:640` | Track active request count; wait for drain before closing server |
| H8 | API keys (ANTHROPIC, OPENAI, GITHUB) read from env in production — should be Vault-enforced | `src/services/model-client.js:56` | Fail startup if Vault enabled but API keys not fetched from Vault |
| H9 | Rate limiting missing on bulk write and export endpoints | `src/routes/projects.routes.js` | Add rate limiters to `updateProject`, `deleteProject`, export, and bulk operation routes |
| H10 | No error toast notifications on mutation failures — user gets no feedback | `frontend/src/hooks/useProjects.ts:60` | Add `onError` callbacks showing error toasts on all `useMutation` calls |
| H11 | No retry logic on React Query mutations — transient failures are permanent from UX perspective | `frontend/src/hooks/useProjects.ts:16` | Add `retry: 3, retryDelay: exponentialBackoff` to mutation configs |
| H12 | No E2E test for full auth flow (register → verify email → login → MFA → refresh → logout) | `frontend/tests/e2e/` | Add Playwright auth E2E spec |
| H13 | Circuit breaker not used on Gemini/external API direct axios calls | `src/services/model-client.js:200` | Route all external calls through existing `ExternalAPIClient` circuit breaker |
| H14 | Missing response compression middleware — all JSON responses uncompressed | `src/index.js:93` | `app.use(require('compression')())` early in middleware stack |
| H15 | `ALLOWED_ORIGINS` in ConfigMap — visible in plain text via `kubectl` | `k8s/deployment.yaml:18` | Move `ALLOWED_ORIGINS` and `VAULT_ADDR` to K8s Secrets |
| H16 | User-provided text (project names, messages) not sanitized against XSS | `src/services/project.service.js` | Sanitize text fields with `sanitize-html` on backend; DOMPurify on frontend |

---

## Medium Issues (32)

### Backend Reliability (4)
- **M1** `src/services/model-client.js:200` — No per-query timeout monitoring; slow queries not logged
- **M2** `src/utils/circuit-breaker.js:25` — Circuit breaker state changes logged to console, not exported to Prometheus
- **M3** `src/services/project.service.js:52` — `listProjects` uses `COUNT(*)` correlated subqueries per row; instrument query plans
- **M4** `src/config/database.js:115` — `healthCheck()` runs `SELECT 1` but doesn't verify pool is not near exhaustion

### API Completeness (2)
- **M5** `src/index.js:151` — Morgan logs HTTP metadata only; no sanitized request/response body for audit trail
- **M6** `src/swagger.js:26` — Swagger servers hardcoded to `localhost:3000`; no production server URL from `APP_URL` env var

### Frontend (6)
- **M7** `frontend/src/App.tsx:73` — No per-route error boundaries; sub-component crash takes down entire page
- **M8** `frontend/src/pages/Analytics.tsx` — Lazy-loaded chart components use generic spinner, not shape-matching skeleton
- **M9** `frontend/src/services/api.ts` — No explicit request timeout on axios instance (default: none)
- **M10** `frontend/src/main.tsx` — `VITE_API_URL` / `VITE_WS_URL` not validated at runtime; silently falls back to localhost
- **M11** `frontend/public/` — No PWA `manifest.json` or service worker for installability
- **M12** `frontend/vite.config.ts` — No bundle size budgets; large chunks not detected during build

### Database (3)
- **M13** `migrations/003_create_user_tables.sql` — `budget_allocated`, `progress` fields lack `CHECK` constraints tightening at DB layer
- **M14** `src/config/database.js:134` — `healthCheck()` does not check pool waiting queue depth
- **M15** `migrations/` — No migration lock mechanism (advisory lock) to prevent concurrent migration runs

### Logging / Observability (4)
- **M16** `src/middleware/` — W3C Trace Context headers (`traceparent`, `tracestate`) not propagated for distributed tracing
- **M17** `src/middleware/metrics.js` — No business metrics: projects created, token usage per user, cost per project
- **M18** `src/index.js:151` — Health and metrics endpoints logged at full volume; no sampling for high-frequency routes
- **M19** `src/utils/logger.js` — Structured context (requestId, userId, traceId) not consistently included in all log statements

### Config / Secrets (2)
- **M20** `src/config/index.js`, `src/utils/encryption-key-manager.js` — No hot-reload of secrets from Vault; JWT/session rotation requires restart
- **M21** `k8s/deployment.yaml` — No secret versioning strategy; rolling back a deployment doesn't roll back secrets

### Documentation (3)
- **M22** `DEPLOYMENT_RUNBOOK.md` — Missing troubleshooting playbooks for pool exhaustion, OOM kill, open circuit breakers, token refresh failures
- **M23** `API_REFERENCE.md` — Cursor pagination format, rate limit headers, and health endpoint schemas not documented
- **M24** `frontend/` — No `frontend/.env.example`; required env vars undiscoverable for new developers

### Performance (3)
- **M25** `src/controllers/projects.controller.js` — No `Cache-Control` headers on GET list endpoints; clients always re-fetch
- **M26** `src/controllers/conversations.controller.js` — No `ETag` support; no `304 Not Modified` responses
- **M27** `frontend/vite.config.ts` — No `vite-plugin-compression` for Brotli/gzip pre-compression of static assets

---

## Low Issues (5)

| # | Issue | File |
|---|-------|------|
| L1 | No ETag support on list endpoints | `src/controllers/*.js` |
| L2 | No Vite bundle size budget warnings | `frontend/vite.config.ts` |
| L3 | Swagger rate limit documentation missing | `src/swagger.js` |
| L4 | Health endpoints `/livez` `/readyz` not in API reference | `API_REFERENCE.md` |
| L5 | `frontend/.env.example` missing | `frontend/` |

---

## Sprint Plan

### Sprint 1 — Critical security + reliability (est. 1 day)
1. [ ] `C1` — `unhandledRejection` / `uncaughtException` handlers in `src/index.js`
2. [ ] `H1` — Request ID middleware (UUID → logs → `X-Request-ID` header)
3. [ ] `H3` — JWT algorithm pin (`algorithms: ['HS256']`) in `src/middleware/auth.js`
4. [ ] `H4` — SSRF IP-range validation on all external URL config
5. [ ] `C7` — Hard-fail on missing required env vars in production
6. [ ] `C2` — `queryWithRetry` in all service DB calls
7. [ ] `H6` — Pool exhaustion check in `/readyz`

### Sprint 2 — Reliability + DX (est. 1–2 days)
8. [ ] `H7` — Graceful shutdown drain (track active requests)
9. [ ] `C4` — Down migrations for all 6 migration files
10. [ ] `C5` — `UNIQUE INDEX ON users (LOWER(email))`
11. [ ] `H14` — Response compression (`compression` package)
12. [ ] `H10` — Error toast `onError` callbacks on all mutations
13. [ ] `H11` — Mutation retry config with exponential backoff
14. [ ] `M7` — Per-route error boundaries in `frontend/src/pages/`
15. [ ] `H13` — Route all model-client external calls through circuit breaker

### Sprint 3 — Observability + testing (est. 1–2 days)
16. [ ] `C6` — Structured log context (requestId, userId) throughout services
17. [ ] `M16` — W3C Trace Context header propagation
18. [ ] `M17` — Business Prometheus metrics (project creation, token usage, cost)
19. [ ] `C3` — Unit tests for `auth.service`, `project.service`, `conversation.service` (≥80% coverage)
20. [ ] `H12` — Playwright E2E auth flow test
21. [ ] `H2` — Idempotency key middleware on write endpoints

### Sprint 4 — Security hardening (est. 1 day)
22. [ ] `H5` — Token scope claims + per-route validation
23. [ ] `H8` — Vault enforcement for API keys in production
24. [ ] `H16` — Input sanitization (`sanitize-html` backend, DOMPurify frontend)
25. [ ] `H15` — Move `ALLOWED_ORIGINS` / `VAULT_ADDR` to K8s Secrets
26. [ ] `M20` — Vault secret hot-reload without restart

### Sprint 5 — Operational polish (est. half day)
27. [ ] `H9` — Rate limiting on bulk write and export endpoints
28. [ ] `M2` — Circuit breaker Prometheus metrics export
29. [ ] `M25` — `Cache-Control` headers on GET endpoints
30. [ ] `M23` — Document cursor pagination, rate limits, health endpoints in `API_REFERENCE.md`
31. [ ] `M22` — Runbook troubleshooting playbooks
32. [ ] `M24` / `L5` — `frontend/.env.example`
33. [ ] `M9` — Axios request timeout on API client
34. [ ] `M10` — Runtime validation of `VITE_API_URL` / `VITE_WS_URL`

---

## Already Complete (Phases 1–5 reference)

- Security: rate limiting, bcrypt, CSRF, CORS, JWT refresh rotation, HTTPS enforcement, upload validation, WebSocket auth, MFA
- Auth: email verification, password reset, GDPR delete/export, `sanitizeUser`
- Session: `maxConcurrentSessions` enforced for bearer + refresh tokens
- Infrastructure: K8s deployment (probes/RBAC/HPA/PDB/Ingress+TLS), NetworkPolicy, backup CronJob, `asyncHandler`
- DB: soft-delete views (005), composite indexes (006)
- Observability: Sentry/OpenTelemetry initialization
- Vault: production fail-fast when `VAULT_ADDR` set but `VAULT_ENABLED` not true
- Pagination: cursor-based keyset in `listProjects`, `listConversations`, `getMessages`
- Frontend: Zod + RHF forms, offline detection + mutation queue, `OfflineBanner`
- Testing: 174 backend (unit + integration + contract), 288 frontend (vitest + axe a11y) = 462 total
- CI/CD: `ci.yml`, `security.yml`, `release.yml`
