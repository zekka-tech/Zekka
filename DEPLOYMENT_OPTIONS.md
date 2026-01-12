# Zekka Framework - Deployment Options

## Overview

The Zekka Framework can be deployed in several ways depending on your environment and requirements. This guide covers all deployment options.

---

## Option 1: Docker Compose (Recommended for Production)

**Best for:** Production environments, team deployments, consistent environments

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- 8GB+ RAM available
- 20GB+ disk space

### Quick Start
```bash
cd /home/user/webapp/zekka-framework
cp .env.example .env
# Edit .env with your API keys
./setup.sh
```

### What Gets Deployed
- **Orchestrator** (Node.js) - Main application on port 3000
- **Arbitrator** (Node.js) - Conflict resolution on port 3001
- **PostgreSQL** - Database on port 5432
- **Redis** - Context Bus on port 6379
- **Ollama** - Local AI models on port 11434

### Manual Docker Deployment
```bash
# 1. Create .env file
cp .env.example .env
nano .env  # Add your GitHub token

# 2. Start services
docker-compose up -d

# 3. Wait for services to be ready (2-3 minutes)
docker-compose logs -f

# 4. Pull AI models
docker-compose exec ollama ollama pull llama3.1:8b
docker-compose exec ollama ollama pull mistral
docker-compose exec ollama ollama pull codellama

# 5. Access dashboard
# Open http://localhost:3000
```

### Useful Docker Commands
```bash
# View logs
docker-compose logs -f orchestrator
docker-compose logs -f arbitrator

# Restart a service
docker-compose restart orchestrator

# Stop everything
docker-compose down

# Full cleanup (removes data!)
docker-compose down -v

# Check service health
docker-compose ps
```

---

## Option 2: Native Node.js Deployment (Development)

**Best for:** Development, debugging, environments without Docker

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Ollama (optional, for local AI)

### Step-by-Step Setup

#### 1. Install Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server nodejs npm

# macOS
brew install postgresql redis node

# Install Ollama (optional)
curl -fsSL https://ollama.com/install.sh | sh
```

#### 2. Setup PostgreSQL
```bash
# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Create database
sudo -u postgres psql
CREATE DATABASE zekka_framework;
CREATE USER zekka WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE zekka_framework TO zekka;
\q

# Initialize schema
cd /home/user/webapp/zekka-framework
psql -U zekka -d zekka_framework -f init-db.sql
```

#### 3. Setup Redis
```bash
# Start Redis
sudo systemctl start redis  # Linux
brew services start redis   # macOS

# Test connection
redis-cli ping  # Should return "PONG"
```

#### 4. Setup Ollama (Optional)
```bash
# Start Ollama
ollama serve &

# Pull models
ollama pull llama3.1:8b
ollama pull mistral
ollama pull codellama
```

#### 5. Configure Environment
```bash
cd /home/user/webapp/zekka-framework
cp .env.example .env

# Edit .env with your settings
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_your_token_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
OPENAI_API_KEY=sk-your_key_here

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=zekka_framework
POSTGRES_USER=zekka
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Ollama
OLLAMA_HOST=http://localhost:11434

# Budgets
DAILY_BUDGET=50
MONTHLY_BUDGET=1000

LOG_LEVEL=info
MAX_CONCURRENT_AGENTS=10
DEFAULT_MODEL=ollama
EOF
```

#### 6. Install Node.js Dependencies
```bash
npm install
```

#### 7. Start Services
```bash
# Terminal 1: Start Orchestrator
cd /home/user/webapp/zekka-framework
node src/index.js

# Terminal 2: Start Arbitrator
cd /home/user/webapp/zekka-framework
node src/arbitrator/server.js

# Or use PM2 for production
npm install -g pm2
pm2 start src/index.js --name orchestrator
pm2 start src/arbitrator/server.js --name arbitrator
pm2 logs
```

#### 8. Verify Deployment
```bash
# Check Orchestrator
curl http://localhost:3000/health

# Check Arbitrator
curl http://localhost:3001/health

# Open dashboard
# http://localhost:3000
```

---

## Option 3: Hetzner Cloud Deployment (Hybrid)

**Best for:** Production hosting, cost-effective scaling, hybrid architecture

### Architecture
- **Frontend:** Netlify (free tier)
- **Backend:** Hetzner VPS (CPX31 or better)
- **Database:** Managed PostgreSQL or self-hosted
- **AI Models:** Ollama on Hetzner + API fallback

### Server Requirements
- **Minimum:** Hetzner CPX31 (4 vCPU, 8GB RAM, €8/month)
- **Recommended:** Hetzner CPX41 (8 vCPU, 16GB RAM, €15/month)
- **Heavy Load:** Hetzner CPX52 (12 vCPU, 24GB RAM, €28/month)

### Setup on Hetzner

#### 1. Provision Server
```bash
# Create server at Hetzner Console
# https://console.hetzner.cloud/
# Location: Singapore (best for South Africa latency)
# OS: Ubuntu 22.04
```

#### 2. Initial Server Setup
```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create non-root user
adduser zekka
usermod -aG sudo,docker zekka
su - zekka
```

#### 3. Deploy Zekka
```bash
# Clone or upload project
git clone https://github.com/yourusername/zekka-framework.git
cd zekka-framework

# Configure environment
cp .env.example .env
nano .env  # Add your API keys

# Deploy
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

#### 4. Setup Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/zekka

# Add configuration:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /arbitrator {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/zekka /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d api.yourdomain.com
```

#### 5. Configure Firewall
```bash
# Setup UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

#### 6. Setup Monitoring
```bash
# Install monitoring tools
docker run -d --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower --interval 3600

# View logs
docker-compose logs -f
```

---

## Option 4: Coolify Deployment (GUI Management)

**Best for:** Easy container management, visual interface, quick deployments

### Setup Coolify on Hetzner

```bash
# SSH into Hetzner server
ssh root@your-server-ip

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify GUI
# Open http://your-server-ip:8000
# Follow setup wizard
```

### Deploy via Coolify

1. **Access Coolify:** http://your-server-ip:8000
2. **Add New Resource:** Click "New Resource"
3. **Select Docker Compose:** Choose "Docker Compose"
4. **Upload docker-compose.yml:** Upload the project file
5. **Add Environment Variables:** Paste your .env content
6. **Deploy:** Click "Deploy"

### Coolify Benefits
- Visual container management
- Automatic SSL with Let's Encrypt
- Built-in monitoring
- Easy rollbacks
- One-click backups

---

## Option 5: Kubernetes Deployment (Enterprise)

**Best for:** Large-scale production, multi-tenant, high availability

### Prerequisites
- Kubernetes cluster (GKE, EKS, AKS, or self-hosted)
- kubectl configured
- Helm 3+ (optional)

### Quick Deploy
```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n zekka
kubectl get services -n zekka

# Access logs
kubectl logs -f deployment/orchestrator -n zekka
```

*See KUBERNETES.md for detailed K8s deployment guide*

---

## Environment Variables Reference

### Required Variables
```bash
GITHUB_TOKEN=ghp_xxx              # GitHub Personal Access Token
```

### Optional but Recommended
```bash
ANTHROPIC_API_KEY=sk-ant-xxx     # Claude API for Arbitrator
OPENAI_API_KEY=sk-xxx            # GPT API (optional)
WEBHOOK_SECRET=xxx               # GitHub webhook security
```

### Database Configuration
```bash
POSTGRES_HOST=postgres           # Hostname (postgres for Docker)
POSTGRES_PORT=5432               # Port
POSTGRES_DB=zekka_framework      # Database name
POSTGRES_USER=zekka              # Username
POSTGRES_PASSWORD=xxx            # Password
```

### Redis Configuration
```bash
REDIS_HOST=redis                 # Hostname (redis for Docker)
REDIS_PORT=6379                  # Port
```

### AI Configuration
```bash
OLLAMA_HOST=http://ollama:11434  # Ollama endpoint
DEFAULT_MODEL=ollama             # ollama, claude, or gpt
```

### Budget Controls
```bash
DAILY_BUDGET=50                  # Daily spend limit (USD)
MONTHLY_BUDGET=1000              # Monthly spend limit (USD)
```

### Advanced Settings
```bash
LOG_LEVEL=info                   # debug, info, warn, error
MAX_CONCURRENT_AGENTS=10         # Max parallel agents
```

---

## Troubleshooting

### Docker Issues

**Port already in use**
```bash
# Find process using port
sudo lsof -i :3000
# Kill process
sudo kill -9 <PID>
# Or use different ports in docker-compose.yml
```

**Services not starting**
```bash
# View logs
docker-compose logs orchestrator
docker-compose logs postgres

# Restart service
docker-compose restart orchestrator
```

**Ollama models not downloading**
```bash
# Manual download
docker-compose exec ollama ollama pull llama3.1:8b

# Check Ollama logs
docker-compose logs ollama
```

### Native Deployment Issues

**PostgreSQL connection failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql

# Test connection
psql -U zekka -d zekka_framework -h localhost
```

**Redis connection failed**
```bash
# Check Redis is running
sudo systemctl status redis
sudo systemctl start redis

# Test connection
redis-cli ping
```

**Node.js version issues**
```bash
# Install correct Node.js version
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v18+
```

### API Key Issues

**GitHub token not working**
- Verify token has correct permissions: `repo`, `workflow`
- Token not expired
- Format: `ghp_...` (classic token)

**Anthropic API key not working**
- Get key from https://console.anthropic.com/
- Format: `sk-ant-...`
- Check billing/credits

---

## Next Steps

After successful deployment:

1. **Access Dashboard:** http://localhost:3000 (or your domain)
2. **Create First Project:** Use the web interface
3. **Monitor Logs:** `docker-compose logs -f` or PM2 logs
4. **Configure GitHub Webhooks:** For automatic trigger
5. **Setup Monitoring:** Add Prometheus/Grafana (optional)
6. **Backup Strategy:** Regular database backups

---

## Cost Comparison

### Docker (Local/VPS)
- **Infrastructure:** $0 (local) or $8-28/month (Hetzner)
- **AI Costs:** Mostly free (Ollama) + API calls ($0-50/month)
- **Total:** $8-78/month

### Kubernetes (Enterprise)
- **Infrastructure:** $100-500/month (managed cluster)
- **AI Costs:** $50-200/month (higher usage)
- **Total:** $150-700/month

### Hybrid (Netlify + Hetzner)
- **Frontend:** Free (Netlify)
- **Backend:** $8-28/month (Hetzner)
- **AI:** $0-50/month (Ollama + APIs)
- **Total:** $8-78/month

---

## Support & Resources

- **Documentation:** See README.md, QUICK_START.md
- **GitHub Issues:** Report bugs and feature requests
- **Docker Hub:** Pre-built images (coming soon)
- **Community:** Discord/Slack (coming soon)

---

**Last Updated:** January 2026
**Version:** 1.0.0
