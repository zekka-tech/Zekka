# 🚀 DEPLOYMENT GUIDE - For Beginners

## 🆕 Version 3.0.0 Updates

### What's Fixed in v3.0.0
- ✅ **Vault Container Health Check** - Fixed "dependency failed to start" error
- ✅ **Improved Docker Reliability** - Services start consistently on first attempt
- ✅ **Better Error Messages** - Clear diagnostics for troubleshooting
- ✅ **Enhanced Documentation** - Comprehensive Docker troubleshooting guide

### Quick Fix for Existing Deployments
If upgrading from v2.0.0, simply pull and restart:

```bash
git pull origin main
docker-compose down -v
docker-compose up -d
```

See [VAULT_FIX_2026-01-21.md](./VAULT_FIX_2026-01-21.md) for details.

---

## ✅ What You Have Now

A complete, production-ready Zekka Framework with:
- ✅ Multi-agent orchestration
- ✅ Context Bus (shared memory)
- ✅ Arbitrator Agent (conflict resolution)
- ✅ Token Economics (cost control)
- ✅ Web dashboard
- ✅ Docker containerization
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Local Ollama AI models

---

## 📝 Step-by-Step Deployment

### 1️⃣ Install Docker (if not already installed)

#### Windows:
1. Download: https://www.docker.com/products/docker-desktop
2. Run installer
3. Restart computer
4. Open Docker Desktop

#### Mac:
1. Download: https://www.docker.com/products/docker-desktop
2. Drag to Applications
3. Open Docker Desktop
4. Grant permissions

#### Linux (Ubuntu/Debian):
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2️⃣ Get Your GitHub Token

**Why?** The system needs to create branches and PRs for agent work.

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Settings:
   - **Note**: "Zekka Framework"
   - **Expiration**: 90 days (or longer)
   - **Select scopes**:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
4. Click **"Generate token"**
5. **COPY THE TOKEN** (format: `ghp_...`)

### 3️⃣ Configure Environment

```bash
# Navigate to project directory
cd /home/user/webapp/zekka-framework

# Copy environment template
cp .env.example .env

# Edit with your tokens
nano .env  # or use any editor
```

**Minimum configuration (.env file):**
```bash
# Required
GITHUB_TOKEN=ghp_your_token_here

# Optional (for better AI)
ANTHROPIC_API_KEY=sk-ant-your_key_here
OPENAI_API_KEY=sk-your_key_here

# Budget controls
DAILY_BUDGET=50
MONTHLY_BUDGET=1000
```

### 4️⃣ Deploy with One Command

```bash
# Run the setup script
./setup.sh
```

**What it does:**
1. ✅ Checks Docker is running
2. ✅ Builds Docker images
3. ✅ Starts all services
4. ✅ Downloads AI models (llama3.1, mistral, codellama)
5. ✅ Initializes database
6. ✅ Waits for everything to be ready

**⏱️ Time: 5-15 minutes** (first time, includes model downloads)

### 5️⃣ Verify Deployment

Open your browser and visit:
```
http://localhost:3000
```

You should see:
- 🟢 System Status: ● Online
- 📊 Dashboard with metrics
- 📝 Create Project form

### 6️⃣ Create Your First Project

In the dashboard:
1. **Project Name**: "Todo App"
2. **Requirements** (one per line):
   ```
   User authentication
   CRUD operations for todos
   REST API
   Unit tests
   ```
3. **Story Points**: 8
4. **Daily Budget**: $50
5. Click **"Create & Execute Project"**

Watch as 10+ agents work together to build your app!

---

## 🌐 Deploy to Cloud (Production)

### Option A: Deploy to AWS

```bash
# 1. Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. Configure AWS
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output: json

# 3. Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups zekka-sg

# 4. SSH into instance
ssh -i your-key.pem ubuntu@<instance-ip>

# 5. Install Docker on instance
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 6. Clone your repository
git clone <your-repo-url>
cd zekka-framework

# 7. Configure .env with your tokens

# 8. Run setup
./setup.sh

# 9. Access via: http://<instance-ip>:3000
```

### Option B: Deploy to Google Cloud Platform

```bash
# 1. Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# 2. Create Compute Engine instance
gcloud compute instances create zekka-instance \
  --machine-type=n1-standard-2 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB

# 3. SSH into instance
gcloud compute ssh zekka-instance

# 4. Follow steps 5-9 from AWS option above
```

### Option C: Deploy to DigitalOcean

```bash
# 1. Create a Droplet
# - Visit: https://cloud.digitalocean.com/droplets/new
# - Choose Ubuntu 22.04
# - Plan: $24/month (4GB RAM)
# - Add SSH key

# 2. SSH into droplet
ssh root@<droplet-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Clone repository
git clone <your-repo-url>
cd zekka-framework

# 5. Configure .env

# 6. Run setup
./setup.sh

# 7. Access via: http://<droplet-ip>:3000
```

---

## 🐳 Docker Troubleshooting (v3.0.0+)

### Common Docker Issues

#### Issue 1: Vault Container Unhealthy

**Symptom:**
```
❌ dependency failed to start: container zekka-vault is unhealthy
```

**Solution (Fixed in v3.0.0):**
```bash
# Pull latest version with fix
git pull origin main

# Clean restart
docker-compose down -v
docker-compose up -d

# Verify vault is healthy
docker-compose ps vault
```

**Details:** Earlier versions had a problematic `./vault/config` directory mount. This has been fixed in v3.0.0. See [VAULT_FIX_2026-01-21.md](./VAULT_FIX_2026-01-21.md) for details.

#### Issue 2: Port Already in Use

**Symptom:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Find what's using the port
lsof -i :3000  # or :8200, :6379

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml
nano docker-compose.yml
# Change "3000:3000" to "3001:3000"
```

#### Issue 3: Build Failures

**Symptom:**
```
npm ERR! network timeout
```

**Solution:**
```bash
# Clean build with no cache
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

#### Issue 4: Container Keeps Restarting

**Solution:**
```bash
# Check container logs
docker-compose logs -f app
docker-compose logs -f vault
docker-compose logs -f redis

# Common fixes:
# 1. Check environment variables in .env
# 2. Verify all required secrets are set
# 3. Check for port conflicts
# 4. Ensure enough disk space (df -h)
# 5. Check memory availability (free -h)
```

#### Issue 5: Services Not Connecting

**Solution:**
```bash
# Verify network connectivity
docker-compose exec app ping redis
docker-compose exec app ping vault

# Check service health
docker-compose ps

# Restart all services
docker-compose restart
```

### Docker Best Practices

1. **Always use latest version:**
   ```bash
   git pull origin main
   docker-compose pull
   ```

2. **Clean restart when updating:**
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```

3. **Monitor container health:**
   ```bash
   docker-compose ps
   docker stats
   ```

4. **Check logs regularly:**
   ```bash
   docker-compose logs -f --tail=100
   ```

5. **Backup before major changes:**
   ```bash
   docker-compose exec postgres pg_dump -U zekka zekka > backup.sql
   ```

---

## 🔒 Production Security Checklist

### Before Going Live:

1. **Change Default Passwords**
   ```bash
   # Edit .env
   POSTGRES_PASSWORD=your_strong_password_here
   WEBHOOK_SECRET=$(openssl rand -hex 32)
   ```

2. **Enable Firewall**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 22  # SSH
   sudo ufw allow 80  # HTTP
   sudo ufw allow 443 # HTTPS
   sudo ufw enable
   ```

3. **Set Up HTTPS** (using Nginx + Let's Encrypt)
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Configure Backups**
   ```bash
   # Add to crontab
   crontab -e
   
   # Add line:
   0 2 * * * docker-compose exec postgres pg_dump -U zekka zekka > /backups/zekka-$(date +\%Y\%m\%d).sql
   ```

5. **Monitor Logs**
   ```bash
   # Set up log rotation
   sudo nano /etc/logrotate.d/zekka
   ```

---

## 📊 Monitoring Production

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health

# Check database
docker-compose exec postgres pg_isready -U zekka

# Check Redis
docker-compose exec redis redis-cli ping
```

### View Metrics

```bash
# API endpoint
curl http://localhost:3000/api/metrics

# Database stats
docker-compose exec postgres psql -U zekka -d zekka -c "SELECT COUNT(*) FROM projects"
```

### Monitor Costs

```bash
# Get cost summary
curl http://localhost:3000/api/costs
```

---

## 🔧 Maintenance

### Daily Tasks
- ✅ Check health status
- ✅ Review cost metrics
- ✅ Monitor logs for errors

### Weekly Tasks
- ✅ Backup database
- ✅ Review pending conflicts
- ✅ Update Ollama models

### Monthly Tasks
- ✅ Review security
- ✅ Update dependencies
- ✅ Optimize costs

---

## 🆘 Troubleshooting Production

### Service Won't Start

```bash
# Check Docker logs
docker-compose logs orchestrator

# Restart service
docker-compose restart orchestrator
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart Ollama (often the culprit)
docker-compose restart ollama
```

### Database Connection Issues

```bash
# Verify PostgreSQL
docker-compose exec postgres psql -U zekka -d zekka -c "SELECT 1"

# Recreate connection pool
docker-compose restart orchestrator
```

---

## 📈 Scaling Production

### Horizontal Scaling

**Option 1: Load Balancer**
```nginx
# /etc/nginx/conf.d/zekka.conf
upstream zekka_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

**Option 2: Kubernetes**
```bash
# See k8s_core_infra.yaml from earlier artifacts
kubectl apply -f k8s_core_infra.yaml
```

### Vertical Scaling

Edit `docker-compose.yml`:
```yaml
orchestrator:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 8G
```

---

## 🎯 Success Metrics

Your deployment is successful when:

- ✅ Dashboard accessible
- ✅ Projects can be created
- ✅ Agents execute tasks
- ✅ Costs are tracked
- ✅ Conflicts are resolved
- ✅ System runs 24/7

---

## 📞 Support

- 📖 **Documentation**: README.md
- 🐛 **Issues**: GitHub Issues
- 💬 **Community**: Discussions
- 📧 **Email**: support@zekka-framework.io

---

**Ready to deploy? Start with `./setup.sh`!** 🚀
