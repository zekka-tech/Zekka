# Multi-stage Dockerfile for Zekka Framework
# Optimized for production deployment

# ===================================================================
# Stage 1: Builder
# ===================================================================
FROM node:18-alpine AS builder

LABEL maintainer="Zekka Technologies"
LABEL description="Zekka Framework - Enterprise AI Orchestration Platform"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy application source
COPY . .

# Build TypeScript (if applicable)
RUN npm run build || true

# ===================================================================
# Stage 2: Production
# ===================================================================
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tini

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/backups && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "src/index.js"]
