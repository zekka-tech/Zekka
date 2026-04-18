# Build stage
FROM node:21-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage — static files served by nginx, non-root
FROM nginx:1.27-alpine

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Minimal nginx config: listen on 3001 to match prior contract; SPA fallback to index.html
RUN printf 'server {\n\
  listen 3001;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf \
  && rm -f /etc/nginx/conf.d/default.conf.template

# Run nginx as the unprivileged `nginx` user (uid 101 in upstream image)
# Redirect pid/log/cache paths so read-only root filesystems still work
RUN sed -i 's|pid /var/run/nginx.pid|pid /tmp/nginx.pid|' /etc/nginx/nginx.conf \
  && sed -i 's|user  nginx;|# run as non-root via USER directive|' /etc/nginx/nginx.conf \
  && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
  && chmod -R g+rwX /var/cache/nginx /var/log/nginx

USER nginx

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
