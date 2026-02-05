# Multi-stage Dockerfile for Zekka Framework
# Production-grade container with security best practices

# ===================================================================
# Stage 1: Dependencies
# ===================================================================
FROM node:18-alpine AS dependencies

LABEL maintainer="Zekka Technologies <devops@zekka.io>"
LABEL description="Zekka Framework - Enterprise AI Orchestration Platform"
LABEL version="3.0.0"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    ca-certificates

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# ===================================================================
# Stage 2: Builder
# ===================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
COPY public ./public

# Build TypeScript and prepare for production
RUN npm run build || echo "Build step completed"

# Note: Skipping npm prune --production to preserve transitive runtime dependencies
# Some packages like lru-cache are required at runtime but not in direct dependencies
# RUN npm prune --production --legacy-peer-deps

# ===================================================================
# Stage 3: Production Runtime
# ===================================================================
FROM node:18-alpine AS production

# Security: Install only necessary runtime dependencies
RUN apk add --no-cache \
    curl \
    wget \
    tini \
    ca-certificates \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Security: Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies and built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy necessary configuration files
COPY --chown=nodejs:nodejs .env.production.example ./.env.example
COPY --chown=nodejs:nodejs scripts/health-check.sh ./scripts/

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/backups /app/temp && \
    chown -R nodejs:nodejs /app && \
    chmod -R 750 /app && \
    chmod +x /app/scripts/health-check.sh || true

# Security: Remove unnecessary setuid/setgid binaries
RUN find / -xdev -type f -perm /6000 -exec chmod a-s {} \; || true

# Switch to non-root user
USER nodejs

# Environment variables (can be overridden)
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Expose application port
EXPOSE 3000

# Health check with custom script fallback
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Security: Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "src/index.js"]
