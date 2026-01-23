# Frontend Deployment Guide

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Run unit tests with coverage
npm test:coverage

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t zekka-frontend:latest .
```

### Run Docker Container

```bash
docker run -p 3001:3001 \
  -e VITE_API_URL=https://api.zekka.app \
  -e VITE_WS_URL=wss://api.zekka.app \
  zekka-frontend:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3001:3001"
    environment:
      VITE_API_URL: https://api.zekka.app
      VITE_WS_URL: wss://api.zekka.app
    depends_on:
      - backend
    networks:
      - zekka-network

networks:
  zekka-network:
    driver: bridge
```

## Environment Variables

### Development (.env.development)
- `VITE_API_URL=http://localhost:3000`
- `VITE_WS_URL=ws://localhost:3000`

### Production (.env.production)
- `VITE_API_URL=https://api.zekka.app`
- `VITE_WS_URL=wss://api.zekka.app`

## Cloud Deployment

### AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Deploy to S3
aws s3 sync dist/ s3://zekka-frontend-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

## Production Checklist

- [ ] Build passes with no errors
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Code coverage >= 80%
- [ ] ESLint passes
- [ ] No TypeScript errors
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] CDN configured
- [ ] Monitoring/logging enabled
- [ ] Performance optimized
- [ ] SEO meta tags added
- [ ] Analytics configured

## Monitoring

### Performance Metrics
- Use Lighthouse for performance audits
- Monitor Core Web Vitals
- Track API response times
- Monitor WebSocket connections

### Error Tracking
- Sentry for error tracking
- CloudWatch for logs
- Custom analytics dashboard

## Health Check

The frontend includes a health check endpoint at the base URL. Monitor this for uptime.

```bash
curl http://localhost:3001/
```

## Troubleshooting

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf dist && npm run build`
- Check Node version: `node --version` (should be 20.19+)

### Runtime Issues
- Check browser console for JavaScript errors
- Verify API endpoint connectivity
- Check WebSocket connection
- Review server logs

### Performance Issues
- Run lighthouse audit
- Check bundle size: `npm run build`
- Profile with DevTools
- Optimize images and assets
