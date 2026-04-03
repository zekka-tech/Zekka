# Zekka Frontend

The frontend is a standalone React application in the monorepo. It is not served by the root Docker Compose stack.

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

Deploy `dist/` to a static host and point it at the backend API with `VITE_API_URL`.
