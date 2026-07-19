# Changelog

All notable changes to the Zekka Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Multi-tenancy foundation (SaaS).** New `tenants` and `tenant_members`
  tables (migration 008) with per-tenant RBAC (owner/admin/member/viewer),
  subscription management (plan, status, billing period, seat limits with
  402 gating when limits/status block access), and a `/api/v1/tenants`
  management API. Tenant context is resolved from the `X-Tenant-Id` header
  (UUID or slug) by the new `tenant-context` middleware; projects are
  tenant-scoped when tenant context is present (`projects.tenant_id`).
  Single-tenant deployments are unaffected — tenant scoping is opt-in.

### Changed
- **Backend is now TypeScript-first.** The runtime entrypoint was migrated to
  strict TypeScript (`src/index.ts`) along with the core shared modules
  (`src/shared/context-bus.ts`, `src/shared/token-economics.ts`); all new
  backend code (tenant service/middleware/routes/schemas) is TypeScript.
  `main`/`npm start`, the Docker images (including the arbitrator image,
  which now compiles TS in its builder stage), and the systemd unit run the
  compiled `dist/index.js`. Remaining JS modules compile through `allowJs`
  and will migrate incrementally; ESLint resolves `.ts` imports repo-wide.

---

## [3.2.2] - 2026-07-09

### 🐛 Fixed
- **IPv6 rate-limit bypass under express-rate-limit 8.** The 7 → 8 bump in
  v3.2.1 made express-rate-limit reject custom `keyGenerator`s that key on a
  raw `req.ip`: an unnormalized IPv6 address lets a single client rotate the
  low-order bits to get a fresh key per request and evade per-IP limits.
  The errors were non-fatal (the app booted healthy and logged
  `ERR_ERL_KEY_GEN_IPV6`), so the IP-keyed limiters silently degraded.
  All four IP-keyed limiters now route through a shared `userOrIpKey` helper
  that normalizes the address via express-rate-limit's `ipKeyGenerator`
  (collapses IPv6 to its subnet, leaves IPv4 unchanged). Verified against the
  published release image: 0 boot errors, `/readyz` healthy, `RateLimit-*`
  headers present and decrementing.

---

## [3.2.1] - 2026-07-09

Dependency maintenance release. No application code changes.

### 🔐 Security
- **geoip-lite 1 → 2** pulls a fixed `ip-address`, clearing the last
  documented backend production vulnerability — `npm audit --omit=dev` is
  now 0 findings.

### ⬆️ Dependencies
- **Backend production**: express 4 → 5, redis 4 → 6, connect-redis 8 → 9,
  express-session 1.19, express-rate-limit 8, rate-limit-redis 5, joi 18,
  helmet 8, opossum 10, dotenv 16 → 17 (`{ quiet: true }` at all
  `config()` sites), winston-daily-rotate-file 5, plus cors/fuse.js/
  lru-cache/morgan/pg/swagger-jsdoc bumps. uuid held at 11 (v14 is
  ESM-only and breaks the CommonJS test harness / Node 20 `require()`).
- **Backend dev**: ESLint 8 → 9 with a **flat-config migration**
  (`.eslintrc.json` → `eslint.config.js`; dropped the unmaintained,
  eslint-8-only `eslint-config-airbnb-base` for explicit rules).
  TypeScript 5.3 → 6.0 (removed deprecated `baseUrl` and
  `downlevelIteration`; `ignoreDeprecations: "6.0"` retains the node10
  resolver pending a dedicated node16/nodenext migration). Jest 29 → 30
  (`--testPathPattern` → `--testPathPatterns`), ts-node 1.x → 10.9,
  @types/jest 30, @types/node 26, supertest 7, husky 9, lint-staged 17,
  prettier 3.9, nodemon 3.1, snyk bump. @faker-js/faker held at 8
  (v9+ is ESM-only).
- **Frontend dev**: TypeScript 6, Vite 8, @vitejs/plugin-react 6,
  jsdom 29, tailwindcss 4.3, @playwright/test 1.61, jsdom/globals bumps.
  Removed unused `@pact-foundation/pact`. Migrated `tsconfig.app.json`
  off deprecated `baseUrl`. eslint held at 9 across both packages
  (`@typescript-eslint` 8.x does not support eslint 10 yet).
- **CI / infra**: nginx 1.27 → 1.31; workflow actions
  gitleaks-action 2 → 3, setup-node 4 → 6, codeql-action 3 → 4,
  login-action 3 → 4, codecov-action 4 → 7, build-push-action 5 → 7,
  actions/checkout 4 → 7, setup-buildx-action 3 → 4. Dependabot configured
  to keep Node base images on the LTS line (ignores semver-major bumps).

### ⏸️ Deferred (tracked)
- eslint 10 (blocked on `@typescript-eslint` support), TypeScript 7
  (pre-release), uuid 14 / @faker-js/faker 9+ (ESM-only vs. the CommonJS
  test harness), and the TypeScript node16/nodenext resolver migration.

---

## [3.2.0] - 2026-07-08

### 🔐 Security
- PostgreSQL TLS certificate verification is now enforced by default in
  production via a shared `getDatabaseSsl()` helper (previously
  `rejectUnauthorized: false` in all three connection pools). New env vars:
  `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_SSL_CA`.
- Dependency vulnerability remediation: backend production vulnerabilities
  reduced 19 → 2 moderate (remaining: `ip-address` XSS via geoip-lite in
  HTML-emitting methods the code never calls). Frontend: 14 → 0. Notable
  bumps: nodemailer 8 → 9 (GHSA-p6gq-j5cr-w38f), uuid 9 → 11 (incl. an
  override for bull's transitive copy), `ws`/engine.io/socket.io-adapter,
  @typescript-eslint 6 → 8.
- Pinned all `:latest` images in `docker-compose.prod.yml` (Vault,
  Prometheus, Grafana, exporters, nginx).

### 🐛 Fixed
- Converted `audit-service`, `encryption-service`, and
  `api-versioning.middleware` from ES modules to CommonJS. Consumers using
  `require()` previously received a module-namespace object, so calls such
  as `auditService.log(...)` were silently broken (and crashed outright on
  Node < 22).
- Declared `ioredis` and `lru-cache` as real dependencies (previously only
  transitive), and re-enabled `npm prune --omit=dev` in the Docker build so
  production images no longer ship dev dependencies.
- CI `ENCRYPTION_KEY` was not a valid 64-hex-character key, failing config
  validation in the backend test job.
- Removed unreachable modules that required uninstalled packages
  (`aws-sdk`, `bcrypt`, `express-validator`): `config/services.js`,
  `utils/password.js`, `utils/validation.js`, `services/audit-dr-service.js`,
  `services/performance-optimization.service.js`.
- Fixed a potential NaN in agent-zero teacher complexity scoring, a thrown
  object literal in the socket rate limiter, `isNaN` → `Number.isNaN`, and
  case-block lexical declarations.

### 🔧 Changed
- Stripped 61 unmounted "framework" modules (agent-zero/astron/dev-agents
  scaffolds, simulated ml/devops/analytics/monitoring/reporting integrations,
  unused schemas and util variants) plus the deprecated `src/index.secure.js`
  and `src/utils/database-migrations.js`, after require-graph reachability
  analysis from all real entrypoints, tests, and scripts.
- Lint warning burndown: backend 447 → 0 (radix, unused vars, shadowed
  identifiers, promise-executor returns, nested ternaries, consistent-return
  in middleware); frontend 59 → 21 (typed all production-code `any`s, fixed a
  stale-closure bug in ToastProvider, converted CommandPalette's reset-effect
  to the state-during-render pattern). `no-await-in-loop` disabled after
  reviewing all 46 sites — every remaining loop is sequential by design
  (retry backoff, Redis SCAN cursors, transaction-scoped queries, ordered
  migrations); two parallelizable loops were parallelized instead
  (agent listing, analytics cache invalidation). Remaining frontend warnings
  are React-compiler diagnostics requiring per-component refactors.
- Replaced the unmaintained `clinic` profiling toolchain (which pulled in the
  deprecated `request` package and both remaining critical advisories) with
  Node's built-in profilers (`node --cpu-prof` / `--heap-prof`). Repo-wide
  audit is now 0 critical / 0 high (18 moderate, all in dev tooling chains).
- Backend and frontend ESLint now pass with 0 errors and run clean in CI;
  legacy stylistic debt is downgraded to warnings, correctness rules remain
  errors. TypeScript files are linted with @typescript-eslint.
- Docker images upgraded from EOL Node 18/20 to Node 22; `engines.node`
  floor raised to >= 20. TypeScript build failures are no longer masked in
  the Docker build (`npm run build || echo` removed).

---

## [3.0.0] - 2026-01-21

### 🎉 Infrastructure & Docker Reliability Release

This release focuses on improving Docker deployment reliability and fixing critical infrastructure issues.

### 🐛 Fixed

#### Docker Infrastructure
- **Vault Container Health Check Issue** - CRITICAL FIX
  - Removed problematic `./vault/config:/vault/config` volume mount from docker-compose.yml
  - Vault container was failing health checks due to non-existent config directory
  - Application startup was blocked by unhealthy vault dependency
  - Vault in dev mode doesn't require config directory mount
  - Health check now passes consistently
  - Documented in VAULT_FIX_2026-01-21.md

#### Docker Compose Configuration
- Simplified Vault service configuration
- Removed unnecessary volume mounts causing startup failures
- Improved service dependency reliability
- Better error messages for debugging

### 📚 Documentation

#### New Documentation
- **VAULT_FIX_2026-01-21.md** - Comprehensive vault fix documentation
  - Root cause analysis
  - Solution details
  - Testing instructions
  - Prevention guidelines

#### Updated Documentation
- **README.md** - Added Docker troubleshooting section
  - Common Docker issues and solutions
  - Vault container health check troubleshooting
  - Port conflict resolution
  - Build failure remediation
  - Docker services overview
  
- **VAULT_SETUP.md** - Updated with troubleshooting section
  - Vault startup issues
  - Health check failures
  - Configuration best practices

### 🔧 Changed

- **docker-compose.yml**
  - Removed `./vault/config:/vault/config` volume mount from vault service
  - Kept only necessary `vault-data:/vault/data` volume mount
  - Maintained all other vault configuration (dev mode, environment variables, health checks)

### ✅ Improved

- **Deployment Reliability**
  - Docker containers now start consistently on first attempt
  - Vault health check passes reliably
  - Reduced startup errors and failures
  - Better diagnostic messages

- **User Experience**
  - Clear error messages for common Docker issues
  - Comprehensive troubleshooting documentation
  - Step-by-step fix instructions
  - Prevention guidelines for future deployments

### 🚀 Impact

- **Before v3.0.0:**
  ```
  ❌ Vault container: unhealthy
  ❌ App container: dependency failed to start
  ❌ Users blocked from running the application
  ```

- **After v3.0.0:**
  ```
  ✅ Vault container: healthy
  ✅ App container: running
  ✅ All services operational
  ```

### 📋 Migration from v2.0.0

No breaking changes. Simply pull the latest code and restart:

```bash
git pull origin main
docker-compose down -v
docker-compose up -d
```

### 🙏 Acknowledgments

Thanks to all users who reported the vault container health check issue and helped us identify the root cause.

---

## [2.0.0] - 2026-01-13

### 🎉 Major Release - Production Ready

This release marks Zekka Framework as production-ready with comprehensive enterprise features, monitoring, security, and documentation.

### ✨ Added

#### Core Features
- **OpenAPI/Swagger Documentation** - Complete interactive API documentation at `/api/docs`
  - Auto-generated from JSDoc comments
  - Try-it-now functionality for all endpoints
  - Request/response schema validation
  - Example requests and responses

- **WebSocket Support** - Real-time project updates via Socket.IO
  - `project:update` - General project status updates
  - `project:stage` - Stage transition notifications
  - `project:agent` - Agent activity tracking
  - `project:conflict` - Conflict resolution updates
  - `project:cost` - Real-time cost tracking
  - `project:complete` - Project completion events
  - `project:error` - Error notifications
  - `system:metrics` - System-wide metrics broadcast

- **Prometheus Metrics** - Comprehensive monitoring at `/metrics`
  - HTTP request metrics (duration, count)
  - Active projects and agents
  - Agent execution time
  - Token cost tracking
  - Conflict resolution metrics
  - Default Node.js metrics (CPU, memory)

- **Authentication System** - JWT-based user management
  - User registration and login
  - Password hashing with bcrypt
  - Token-based authentication
  - Protected API endpoints
  - User profile management

- **Rate Limiting** - API protection against abuse
  - General API: 100 requests per 15 minutes
  - Project creation: 10 requests per hour
  - Authentication: 5 requests per 15 minutes
  - Configurable per-endpoint limits

#### Documentation
- **Architecture Documentation** (ARCHITECTURE.md)
  - System overview with ASCII diagrams
  - Component architecture details
  - Agent types and workflow stages
  - Data flow diagrams
  - Security architecture
  - Monitoring stack
  - Deployment architecture
  - Performance metrics and SLAs

- **API Reference** (API_REFERENCE.md)
  - Complete endpoint documentation
  - Request/response examples
  - WebSocket event documentation
  - Error codes and rate limits
  - Interactive usage examples

- **Contributing Guide** (CONTRIBUTING.md)
  - Code of conduct
  - Development setup
  - Coding standards
  - Testing guidelines
  - Pull request process
  - Issue templates
  - Release process

#### AI Integration
- **Gemini Integration** - Primary LLM model
  - Gemini Pro as default model
  - Automatic fallback to Claude
  - Ollama as final fallback
  - Cost optimization with model switching
  - 80% cost savings with Ollama

- **Model Comparison Documentation**
  - Feature comparison matrix
  - Cost analysis per model
  - Performance benchmarks
  - Use case recommendations

### 🔧 Changed

- **Main Application (src/index.js)**
  - Refactored to use HTTP server for WebSocket support
  - Added middleware chain with metrics tracking
  - Integrated authentication on all API endpoints
  - Added Swagger UI serving
  - Enhanced error handling with proper status codes

- **Docker Compose Configuration**
  - Updated environment variables for Gemini
  - Added PRIMARY_LLM and FALLBACK_LLM configuration
  - Improved health check reliability

### 🚀 Improved

- **Package.json**
  - Added new dependencies:
    - `swagger-jsdoc` - OpenAPI specification generation
    - `swagger-ui-express` - Interactive API documentation
    - `express-rate-limit` - API rate limiting
    - `socket.io` - WebSocket support
    - `prom-client` - Prometheus metrics
    - `jsonwebtoken` - JWT authentication
    - `bcryptjs` - Password hashing

- **Testing Infrastructure**
  - Jest configuration for unit tests
  - ESLint configuration for code quality
  - GitHub Actions CI/CD pipeline

### 📚 Documentation

- Complete API reference with examples
- Architecture diagrams and explanations
- Contributing guidelines
- Model comparison and cost analysis
- Gemini setup guide
- Repository analysis documentation

---

## [1.0.1] - 2026-01-12

### 🐛 Fixed

#### Docker Build
- **npm ci Compatibility Issue**
  - Changed from `npm ci` to `npm install --omit=dev`
  - Resolves package-lock.json requirement
  - Automatically generates lock file during build
  - Documented in BUILD_FIX.md

- **Build Scripts**
  - Added fix-build.sh for quick fixes
  - Updated Dockerfile and Dockerfile.arbitrator

### 📚 Documentation

- Added BUILD_FIX.md with troubleshooting steps
- Updated deployment instructions

---

## [1.0.0] - 2026-01-12

### 🎉 Initial Production Release

The first production-ready version of Zekka Framework with complete multi-agent orchestration capabilities.

### ✨ Features

#### Core Orchestration
- **Multi-Agent System** - 50+ AI agents across 10 workflow stages
  - Stage 1: Requirements Analysis (5 agents)
  - Stage 2: Architecture Design (6 agents)
  - Stage 3: Database Schema (5 agents)
  - Stage 4: API Development (7 agents)
  - Stage 5: Frontend Development (8 agents)
  - Stage 6: Integration (5 agents)
  - Stage 7: Testing (7 agents)
  - Stage 8: Documentation (4 agents)
  - Stage 9: Deployment (4 agents)
  - Stage 10: Quality Assurance (4 agents)

- **Hub-and-Spoke Architecture**
  - Centralized orchestrator for coordination
  - Redis Context Bus for shared state
  - File-level locking mechanism
  - Race condition prevention
  - State recovery capabilities

- **AI Arbitrator** - Automatic conflict resolution
  - Claude-based resolution (92% success rate)
  - Ollama-based resolution (80% success rate)
  - GitHub webhook integration
  - Manual escalation for complex conflicts

#### Token Economics
- **Cost Tracking System**
  - Real-time cost calculation
  - Per-model cost tracking
  - Budget enforcement (daily/monthly)
  - Automatic model switching
  - 80% cost savings with Ollama

- **Supported Models**
  - Ollama (local, free)
  - Claude Sonnet ($3.00 per 1M tokens)
  - GPT-4 ($30.00 per 1M tokens)

#### Infrastructure
- **Docker Deployment**
  - Multi-container orchestration
  - PostgreSQL 15 for persistent storage
  - Redis 7 for Context Bus
  - Ollama for local LLM inference
  - Health checks for all services

- **Database**
  - PostgreSQL for project data
  - Redis for shared state and locking
  - Migration scripts
  - Seed data for testing

#### API
- **RESTful API**
  - Project creation and management
  - Project execution
  - Cost tracking
  - System metrics
  - Health checks

- **Endpoints**
  - `POST /api/projects` - Create project
  - `POST /api/projects/:id/execute` - Execute project
  - `GET /api/projects/:id` - Get project status
  - `GET /api/projects` - List all projects
  - `GET /api/costs` - Cost summary
  - `GET /api/metrics` - System metrics
  - `GET /health` - Health check

#### Frontend
- **Dashboard** (public/index.html)
  - Project creation interface
  - Real-time progress tracking
  - Cost monitoring
  - System status display

#### Security
- **Basic Security**
  - Helmet.js for HTTP headers
  - CORS configuration
  - Input validation with Joi
  - Environment variable management

#### Logging & Monitoring
- **Winston Logger**
  - Structured JSON logging
  - File-based log storage
  - Console output with colors
  - Log levels (error, info, debug)

### 📚 Documentation

- README.md - Project overview
- QUICK_START.md - Quick start guide
- START_HERE.md - Getting started guide
- DEPLOYMENT.md - Deployment instructions
- LOCAL_DEPLOY.md - Local setup guide
- DEPLOYMENT_OPTIONS.md - Deployment options
- DEPLOYMENT_READY.md - Deployment readiness
- DEPLOYMENT_COMPLETE.md - Completion guide
- DEPLOYMENT_INSTRUCTIONS.md - Detailed instructions
- QUICK_REFERENCE.md - Quick reference

### 🛠️ Technical Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4.18.2
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7+
- **LLM:** Ollama, Claude, GPT-4
- **Container:** Docker & Docker Compose
- **Logging:** Winston 3.11.0
- **Validation:** Joi 17.12.0

### 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "redis": "^4.6.12",
  "pg": "^8.11.3",
  "dotenv": "^16.3.1",
  "axios": "^1.6.5",
  "@octokit/rest": "^20.0.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0",
  "winston": "^3.11.0",
  "joi": "^17.12.0",
  "uuid": "^9.0.1"
}
```

### 🚀 Performance

- **Stage Success Rate:** ~97%
- **End-to-End Success Rate:** ~95%
- **Average Project Time:** 8-15 minutes
- **Concurrent Agents:** Up to 50
- **Conflict Auto-Resolution:** 80-92%

### 📊 System Requirements

#### Development
- RAM: 8 GB minimum, 16 GB recommended
- CPU: 4 cores minimum, 8 cores recommended
- Storage: 20 GB minimum, 50 GB recommended
- Network: 10 Mbps minimum, 50+ Mbps recommended

#### Production
- Orchestrator: 2 GB RAM, 2 CPU cores
- Arbitrator: 2 GB RAM, 2 CPU cores
- PostgreSQL: 4 GB RAM, 2 CPU cores
- Redis: 2 GB RAM, 1 CPU core
- Ollama: 8 GB RAM, 4 CPU cores (16 GB with GPU)

---

## Release Notes

### Version Numbering

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes

### Support Policy

- **Current Release (3.x):** Full support
- **Previous Major (2.x):** Security fixes only for 6 months
- **Older Releases (1.x):** No support

### Upgrade Guides

#### 1.x to 2.x

**Breaking Changes:**
- Authentication now required for most endpoints
- WebSocket path changed to `/ws`
- Environment variables added for JWT and rate limiting

**Migration Steps:**
1. Update environment variables:
   ```bash
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=24h
   ```

2. Update API calls to include authentication:
   ```javascript
   const response = await fetch('/api/projects', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

3. Update WebSocket connection:
   ```javascript
   const socket = io('http://localhost:3000', { path: '/ws' });
   ```

4. Update docker-compose.yml with new environment variables

5. Run migrations:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

**New Features Available:**
- OpenAPI/Swagger documentation at `/api/docs`
- WebSocket real-time updates
- Prometheus metrics at `/metrics`
- User authentication system
- Rate limiting protection

---

## Roadmap

### Version 2.1 (Planned - Q1 2026)

#### Features
- [ ] Kubernetes deployment support
- [ ] Advanced authentication (OAuth, SSO)
- [ ] Project templates
- [ ] Custom workflow stages
- [ ] Agent marketplace
- [ ] Enhanced dashboard UI

#### Improvements
- [ ] Performance optimizations
- [ ] Enhanced conflict resolution
- [ ] Improved cost predictions
- [ ] Better error recovery

### Version 3.0 (Planned - Q2 2026)

#### Features
- [ ] Multi-tenancy support
- [ ] Role-based access control (RBAC)
- [ ] Advanced analytics dashboard
- [ ] Machine learning for optimization
- [ ] Plugin system
- [ ] Custom agent development SDK

#### Infrastructure
- [ ] High availability (HA) setup
- [ ] Multi-region deployment
- [ ] Advanced monitoring with Grafana
- [ ] Automated scaling
- [ ] Disaster recovery

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- Development setup
- Coding standards
- Testing guidelines
- Pull request process

---

## Links

- **GitHub Repository:** https://github.com/zekka-tech/Zekka
- **Documentation:** https://github.com/zekka-tech/Zekka/tree/main/docs
- **Issue Tracker:** https://github.com/zekka-tech/Zekka/issues
- **Discussions:** https://github.com/zekka-tech/Zekka/discussions

---

**Maintained by:** Zekka Tech Team  
**License:** MIT  
**Current Version:** 3.0.0  
**Last Updated:** January 21, 2026
