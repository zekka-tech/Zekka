# Zekka Framework

Zekka is a split-stack repository:

- `src/`: Node.js/Express backend with PostgreSQL, Redis, Swagger, Prometheus metrics, and Docker deployment assets.
- `frontend/`: React 19 + TypeScript + Vite frontend, built and deployed separately from the root Docker Compose stack.

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

It does not start the React frontend in `frontend/`, and it does not define an `ollama` service.

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

Set `VITE_API_URL` to point at the backend when needed. Local default is `http://localhost:3000`.

## Verification

Backend:

```bash
npm run lint
npm test
npm run build
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

- Root Docker deployment is backend-only.
- Frontend deployment is a separate static build from `frontend/dist`.
- `docker-compose.prod.yml` contains the production-oriented backend stack.
- `setup.sh` is the current local bootstrap script for the backend stack.

## Documentation Priority

Use these files as the current source of truth:

- `README.md`
- `QUICK_START.md`
- `DEPLOYMENT.md`
- `frontend/README.md`
- `frontend/DEPLOYMENT.md`

Many other markdown files in the repo are historical implementation reports and should be treated as archival unless they are updated to match the current code.
