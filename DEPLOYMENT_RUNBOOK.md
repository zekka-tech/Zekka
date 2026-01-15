# 🚀 PRODUCTION DEPLOYMENT RUNBOOK

**Project**: Zekka Framework v3.0.0  
**Last Updated**: 2026-01-15  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [Redis Setup](#redis-setup)
5. [Application Deployment](#application-deployment)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup Configuration](#backup-configuration)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### ✅ Required Resources
- [ ] Server with minimum 4GB RAM, 2 CPU cores
- [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] Domain name configured with DNS
- [ ] SSL certificate (Let's Encrypt or commercial)
- [ ] PostgreSQL 13+ instance
- [ ] Redis 6+ instance
- [ ] Backup storage (local or S3-compatible)

### ✅ Required Access
- [ ] SSH access to server (with sudo privileges)
- [ ] Database administrator credentials
- [ ] DNS management access
- [ ] Email service for notifications (optional)
- [ ] Cloud storage access (optional)

### ✅ Required Information
- [ ] Server IP address
- [ ] Domain name
- [ ] Database connection details
- [ ] Redis connection details
- [ ] SMTP credentials (for notifications)
- [ ] External API keys (if needed)

---

## Infrastructure Setup

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    curl \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    postgresql-client \
    redis-tools \
    logrotate \
    mailutils

# Install Node.js 18+ LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v18+
npm --version
nginx -v
psql --version
redis-cli --version
```

### 2. Create Application User

```bash
# Create dedicated user for security
sudo useradd -r -s /bin/bash -d /opt/zekka -m zekka

# Set proper permissions
sudo chown -R zekka:zekka /opt/zekka
```

### 3. Clone Repository

```bash
# Switch to zekka user
sudo -u zekka -i

# Clone repository
cd /opt/zekka
git clone https://github.com/zekka-tech/Zekka.git .

# Checkout specific version (production)
git checkout main  # or specific tag like v3.0.0

# Exit zekka user
exit
```

---

## Database Setup

### 1. PostgreSQL Installation (if not already installed)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Run these SQL commands:
```

```sql
-- Create database
CREATE DATABASE zekka_production;

-- Create user with strong password
CREATE USER zekka_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE zekka_production TO zekka_user;

-- Enable necessary extensions
\c zekka_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify
\l  -- List databases
\du -- List users

-- Exit
\q
```

### 3. Configure PostgreSQL for Production

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
```

Update these settings:

```ini
# Connection settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%m [%p] %q%u@%d '
log_timezone = 'UTC'
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Test Database Connection

```bash
# Test connection
psql -h localhost -U zekka_user -d zekka_production -c "SELECT version();"
```

---

## Redis Setup

### 1. Redis Installation (if not already installed)

```bash
# Install Redis
sudo apt install -y redis-server

# Start and enable service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
sudo systemctl status redis-server
```

### 2. Configure Redis for Production

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

Update these settings:

```ini
# Bind to localhost (or specific IP)
bind 127.0.0.1

# Require password
requirepass YOUR_STRONG_REDIS_PASSWORD

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
timeout 300
tcp-keepalive 60
```

```bash
# Restart Redis
sudo systemctl restart redis-server

# Test Redis connection
redis-cli -a YOUR_STRONG_REDIS_PASSWORD ping
# Should return: PONG
```

---

## Application Deployment

### 1. Generate Environment Configuration

```bash
# Switch to zekka user
sudo -u zekka -i
cd /opt/zekka

# Generate secure secrets
node scripts/generate-secrets.js --output .env

# Edit .env file with actual credentials
nano .env
```

**IMPORTANT**: Update these placeholders in `.env`:
- `DATABASE_URL`: Use actual PostgreSQL connection string
- `DATABASE_PASSWORD`: Use the password created earlier
- `REDIS_URL`: Use actual Redis connection string
- `REDIS_PASSWORD`: Use the Redis password set earlier
- `CORS_ORIGIN`: Set to your actual domain

### 2. Install Dependencies

```bash
# Install production dependencies
npm ci --production

# Verify installation
npm list --depth=0
```

### 3. Run Database Migrations

```bash
# Run all migrations
npm run migrate

# Verify migrations
npm run migrate:status

# Exit zekka user
exit
```

### 4. Validate Environment

```bash
# Run validation script
sudo -u zekka node /opt/zekka/scripts/validate-environment.js

# Should show all checks passing
```

### 5. Install Systemd Service

```bash
# Copy systemd service file
sudo cp /opt/zekka/systemd/zekka.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable zekka.service

# Start service
sudo systemctl start zekka.service

# Check status
sudo systemctl status zekka.service

# View logs
sudo journalctl -u zekka.service -f
```

---

## Nginx Configuration

### 1. Install and Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /opt/zekka/nginx/zekka-production.conf /etc/nginx/sites-available/zekka

# Edit configuration with your domain
sudo nano /etc/nginx/sites-available/zekka
```

Update these values:
- Replace `yourdomain.com` with your actual domain
- Update SSL certificate paths

```bash
# Create proxy_params if not exists
sudo nano /etc/nginx/proxy_params
```

Add:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
proxy_buffering off;
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/zekka /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### 1. Obtain Let's Encrypt Certificate

```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --agree-tos \
    --email admin@yourdomain.com

# Start Nginx
sudo systemctl start nginx
```

### 2. Configure Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Auto-renewal is configured by default with systemd timer
sudo systemctl list-timers | grep certbot
```

### 3. Verify SSL Configuration

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

---

## Monitoring Setup

### 1. Deploy Prometheus + Grafana

```bash
# Using Docker Compose (recommended)
cd /opt/zekka
sudo docker-compose up -d prometheus grafana

# Verify services
sudo docker-compose ps

# Access Grafana
# URL: http://your-server-ip:3001
# Default credentials: admin/admin
```

### 2. Configure Grafana Dashboards

1. Login to Grafana
2. Add Prometheus data source (http://prometheus:9090)
3. Import dashboard from `/opt/zekka/grafana/dashboards/`

### 3. Configure Alerts

```bash
# Edit alert configuration
nano /opt/zekka/prometheus/alerts.yml

# Reload Prometheus
sudo docker-compose restart prometheus
```

---

## Backup Configuration

### 1. Configure Automated Backups

```bash
# Create backup directory
sudo mkdir -p /var/backups/zekka
sudo chown zekka:zekka /var/backups/zekka

# Test backup script
sudo -u zekka /opt/zekka/scripts/backup-database.sh

# Verify backup created
ls -lh /var/backups/zekka/
```

### 2. Schedule with Cron

```bash
# Edit crontab for zekka user
sudo -u zekka crontab -e
```

Add:

```cron
# Daily backup at 2 AM
0 2 * * * /opt/zekka/scripts/backup-database.sh >> /var/log/zekka-backup.log 2>&1

# Weekly cleanup of old logs
0 3 * * 0 find /opt/zekka/logs -name "*.log" -mtime +30 -delete
```

### 3. Configure Logrotate

```bash
# Copy logrotate configuration
sudo cp /opt/zekka/logrotate/zekka /etc/logrotate.d/zekka
sudo chmod 644 /etc/logrotate.d/zekka

# Test configuration
sudo logrotate -d /etc/logrotate.d/zekka

# Force run (optional)
sudo logrotate -f /etc/logrotate.d/zekka
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check application health
curl http://localhost:3000/health

# Check through Nginx
curl https://yourdomain.com/health

# Check metrics endpoint
curl http://localhost:3000/metrics
```

### 2. Security Tests

```bash
# Run security test suite
cd /opt/zekka
./test-security.sh
```

### 3. Load Testing

```bash
# Run smoke test
npm run load-test:smoke

# Run full load test (adjust based on server capacity)
npm run load-test
```

### 4. Monitoring Verification

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana
curl http://localhost:3001/api/health
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
sudo journalctl -u zekka.service -n 100

# Check environment variables
sudo -u zekka cat /opt/zekka/.env | grep -v PASSWORD

# Validate environment
sudo -u zekka node /opt/zekka/scripts/validate-environment.js
```

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U zekka_user -d zekka_production

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -a YOUR_PASSWORD ping

# Check Redis status
sudo systemctl status redis-server

# View Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/zekka-error.log
```

---

## Rollback Procedures

See [ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md) for detailed rollback instructions.

### Quick Rollback

```bash
# Stop current version
sudo systemctl stop zekka.service

# Rollback to previous version
cd /opt/zekka
git fetch --tags
git checkout v2.x.x  # Previous stable version

# Rollback database migrations (if needed)
npm run migrate:rollback

# Restart application
sudo systemctl start zekka.service
```

---

## Emergency Contacts

- **DevOps Lead**: [Name] - [Email] - [Phone]
- **Security Team**: [Email]
- **On-Call Engineer**: [Email] - [Phone]
- **Database Admin**: [Email]

---

## Appendix

### A. Firewall Rules

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### B. System Resource Limits

```bash
# Edit limits
sudo nano /etc/security/limits.conf
```

Add:

```
zekka soft nofile 65536
zekka hard nofile 65536
zekka soft nproc 4096
zekka hard nproc 4096
```

### C. Performance Tuning

```bash
# System-level tuning
sudo sysctl -w net.core.somaxconn=1024
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=2048
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Make permanent
sudo nano /etc/sysctl.conf
```

---

**Document Version**: 1.0  
**Last Reviewed**: 2026-01-15  
**Next Review**: 2026-02-15
