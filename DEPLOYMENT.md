# Deployment Guide

## Packaged deployment model

The repository's root deployment assets package the backend stack and the primary React UI together:

- Node.js API container
- React frontend bundle served by the backend container at `/`
- PostgreSQL
- Redis
- Prometheus
- Grafana
- Optional production Nginx via `docker-compose.prod.yml`

## Local Docker deployment

```bash
cp .env.production.example .env.production
docker compose up -d --build
```

Verify:

```bash
curl http://localhost:3000/health
```

Service URLs:

- App UI: `http://localhost:3000`
- API: `http://localhost:3000/api`
- CSRF token: `http://localhost:3000/api/csrf-token`
- Swagger: `http://localhost:3000/api/docs`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Production-oriented compose file

Use `docker-compose.prod.yml` when you need the production stack shape. It adds:

- Nginx reverse proxy
- production resource limits
- production environment wiring
- Vault-related environment variables

Review and populate these before use:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `GRAFANA_ADMIN_PASSWORD`
- `VAULT_TOKEN` if Vault is enabled

## Frontend development and standalone deployment

Build from `frontend/`:

```bash
cd frontend
npm install
npm run build
```

The packaged Docker image already embeds this bundle for the primary shipped UI. You can also deploy the generated `frontend/dist` directory to a separate static host when needed. Set:

- `VITE_API_URL`
- `VITE_WS_URL`

## Operational notes

- Root Docker Compose does not include an `ollama` service.
- Local frontend development still runs separately with Vite on `5173`.
- The current backend health endpoint is `/health`.
- `/api` uses the CSRF session cookie plus `/api/csrf-token` for browser-session CSRF protection.
- Bearer-token API requests remain valid without a CSRF header.
- The only supported backend entrypoint is `src/index.js`; the old `auth.secure` stack has been removed from the active source tree.
- Grafana uses port `3001`, so that port is not available for another app service in the default stack.
