# Zekka Framework

Zekka is a split-stack repository:

- `src/`: Node.js/Express backend with PostgreSQL, Redis, Swagger, Prometheus metrics, and Docker deployment assets.
- `frontend/`: React 19 + TypeScript + Vite frontend for local development and standalone frontend workflows.

## Current Tech Stack

- Backend: Node.js, Express, PostgreSQL, Redis, Socket.IO, Swagger, Prometheus, Winston
- Frontend: React 19, TypeScript 5, Vite 7, Vitest, Playwright
- Operations: Docker Compose, Nginx, Grafana, Prometheus, Kubernetes manifests in `k8s/`

## What The Root Docker Stack Starts

`docker-compose.yml` starts:

- `app` on `http://localhost:3000`
- `postgres` on `localhost:5432`
- `redis` on `localhost:6379`
- `prometheus` on `http://localhost:9090`
- `grafana` on `http://localhost:3001`

At development time, the React frontend still runs separately on `5173`. In packaged Docker deployments, the root `Dockerfile` now builds `frontend/` and the backend serves that bundle as the primary shipped UI at `/`.

## Quick Start

### Backend stack

```bash
cp .env.production.example .env.production
./setup.sh
```

Useful endpoints after startup:

- API health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api/docs`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

### Frontend development

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

Set `VITE_API_URL` to point at the backend when needed. Local default is `http://localhost:3000`.

### Packaged UI

After `docker compose up -d --build`, open:

- App UI: `http://localhost:3000`
- API health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api/docs`

## Verification

Backend:

```bash
npm run lint
npm test
npm run test:coverage
npm run build
npm run verify:ci
```

Frontend:

```bash
cd frontend
npm run lint
npm run type-check
npm run test:run
npm run build
```

## Deployment Notes

- Root Docker deployment now ships the React frontend bundle through the backend container.
- Frontend development remains a separate Vite workflow in `frontend/`.
- `frontend/dist` can still be deployed separately when you want an independent static frontend deployment.
- `docker-compose.prod.yml` contains the production-oriented backend stack.
- `setup.sh` is the current local bootstrap script for the backend stack.

## Documentation Priority

Use these files as the current source of truth:

- `README.md`
- `QUICK_START.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT_RUNBOOK.md`
- `ARCHITECTURE.md`
- `API_REFERENCE.md`
- `CONTRIBUTING.md`
- `frontend/README.md`
- `frontend/DEPLOYMENT.md`
- `docs/README.md`

Historical implementation reports are archived under:

- `docs/archive/root/`
- `docs/archive/frontend/`
- `docs/archive/README.md`
