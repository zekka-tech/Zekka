#!/bin/bash

set -euo pipefail

echo "========================================="
echo "Zekka setup"
echo "========================================="
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop or Docker Engine first."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Docker Compose is required. Install the Docker Compose plugin or docker-compose."
  exit 1
fi

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "Created .env.production from .env.production.example"
  echo "Edit .env.production before exposing this stack outside your machine."
  echo
fi

echo "Starting backend and monitoring services with: ${COMPOSE_CMD}"
${COMPOSE_CMD} up -d --build

echo
echo "Waiting for the API health endpoint..."
for i in {1..60}; do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi

  if [ "$i" -eq 60 ]; then
    echo "API health check timed out."
    echo "Inspect logs with: ${COMPOSE_CMD} logs app"
    exit 1
  fi

  sleep 2
done

echo
echo "Services:"
echo "  API:        http://localhost:3000/health"
echo "  Swagger:    http://localhost:3000/api/docs"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana:    http://localhost:3001"
echo
echo "Notes:"
echo "  - This script starts the backend, PostgreSQL, Redis, Prometheus, and Grafana."
echo "  - The React frontend lives in ./frontend and runs separately with npm install && npm run dev."
echo "  - Configure external model providers in .env.production if you need them."
