# Frontend Deployment Guide

This frontend is a separate Vite build, not part of the root Docker Compose stack by default.

## Build

```bash
npm install
npm run build
```

The production bundle is written to `dist/`.

## Required Environment Variables

```bash
VITE_API_URL=https://your-backend-host
VITE_WS_URL=https://your-backend-host
```

For local development:

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

## Local Preview

```bash
npm run preview
```

Default preview URL: `http://localhost:4173`

## Container Build

```bash
docker build -t zekka-frontend:latest .
```

## Deployment Targets

Any static hosting platform that can serve a Vite `dist/` directory will work, for example:

- S3 + CloudFront
- Netlify
- Vercel
- Nginx serving the built assets

## Verification

Run these before deployment:

```bash
npm run lint
npm run test:run
npm run build
```

Run Playwright separately when an environment is available:

```bash
npm run test:e2e
```
