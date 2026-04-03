# Quick Start

## 1. Start the backend stack

```bash
cp .env.production.example .env.production
./setup.sh
```

This starts the API, PostgreSQL, Redis, Prometheus, and Grafana.

## 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## 3. Check the backend

- Health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api/docs`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Required config files

- Backend compose stack: `.env.production`
- Local secure backend runtime: `.env` from `.env.example.secure` when running the Node app directly
- Frontend env: optional `frontend/.env.development` or `VITE_*` variables

## Verification commands

Backend:

```bash
npm run lint
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm run type-check
npm run test:run
npm run build
```
