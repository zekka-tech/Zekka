# Deployment Guide

## Backend deployment model

The repository's root deployment assets are for the backend stack:

- Node.js API container
- PostgreSQL
- Redis
- Prometheus
- Grafana
- Optional production Nginx via `docker-compose.prod.yml`

The React frontend in `frontend/` is deployed separately as a static site.

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

- API: `http://localhost:3000`
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

## Frontend deployment

Build from `frontend/`:

```bash
cd frontend
npm install
npm run build
```

Deploy the generated `frontend/dist` directory to any static host. Set:

- `VITE_API_URL`
- `VITE_WS_URL`

## Operational notes

- Root Docker Compose does not include an `ollama` service.
- Root Docker Compose does not start the React frontend.
- The current backend health endpoint is `/health`.
- Grafana uses port `3001`, so that port is not available for another app service in the default stack.
