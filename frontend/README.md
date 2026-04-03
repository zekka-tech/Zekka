# Zekka Frontend

This workspace is the React source for the primary Zekka UI. In local development it runs as a standalone Vite app; in packaged Docker deployments the root `Dockerfile` builds this workspace and the backend serves the resulting bundle at `/`.

## Stack

- React 19
- TypeScript
- Vite 7
- React Router
- TanStack Query
- Vitest
- Playwright

## Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Environment

Set these when needed:

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

## Verification

```bash
npm run lint
npm run type-check
npm run test:run
npm run build
```

## Deployment

```bash
npm run build
```

Deploy `dist/` to a static host and point it at the backend API with `VITE_API_URL`, or let the root Docker build package and serve it through the backend container.
