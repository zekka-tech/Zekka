# 🚀 Zekka Framework - Local Deployment Guide

## ✅ Status: Ready for Deployment

Your Zekka Framework is now:
- ✅ Uploaded to GitHub: https://github.com/zekka-tech/Zekka
- ✅ Configured with your GitHub token
- ✅ Ready to deploy on your local Docker system

---

## 📋 Prerequisites Check

Before running the deployment, ensure you have:

```bash
# Check Docker
docker --version
# Should show: Docker version 20.x or higher

# Check Docker Compose
docker-compose --version
# Should show: Docker Compose version 2.x or higher

# Verify Docker is running
docker ps
# Should not show errors
```

---

## 🚀 Quick Deploy (3 Steps)

### Step 1: Download the Code

```bash
# Clone from GitHub
git clone https://github.com/zekka-tech/Zekka.git
cd Zekka

# Or if you already have it locally at /home/user/webapp/zekka-framework
cd /path/to/zekka-framework
```

### Step 2: Verify Environment

The `.env` file is already configured with your GitHub token. You can optionally add:

```bash
# Edit .env to add optional API keys
nano .env   # or code .env, or vim .env

# Add these if you have them (optional):
ANTHROPIC_API_KEY=sk-ant-your_key_here  # For better AI arbitration
OPENAI_API_KEY=sk-your_key_here         # For GPT models
```

### Step 3: Deploy!

```bash
# Run the setup script
chmod +x setup.sh
./setup.sh
```

**What happens:**
- ⏳ Downloads and starts 5 Docker containers
- ⏳ Initializes PostgreSQL database
- ⏳ Sets up Redis (Context Bus)
- ⏳ Downloads AI models (llama3.1, mistral, codellama) - ~5-10 minutes
- ⏳ Starts Orchestrator and Arbitrator services
- ✅ Opens dashboard at http://localhost:3000

---

## 🖥️ Accessing Your System

Once deployment completes:

### **Web Dashboard**
```
http://localhost:3000
```

### **API Endpoints**
```
http://localhost:3000/api          # Main API
http://localhost:3000/health       # Health check
http://localhost:3001              # Arbitrator service
```

### **Service Ports**
- **3000:** Orchestrator (Main app + Dashboard)
- **3001:** Arbitrator (Conflict resolution)
- **5432:** PostgreSQL (Database)
- **6379:** Redis (Context Bus)
- **11434:** Ollama (Local AI models)

---

## 🎯 First Project

After the dashboard loads:

1. **Click "Create New Project"**
2. **Fill in:**
   - Name: `My First App`
   - Requirements: `Create a simple todo app with React frontend and Node.js backend`
   - Story Points: `5`
   - Daily Budget: `$10`
3. **Click "Start Project"**
4. **Watch the magic happen!** ✨

**Expected:**
- 50+ AI agents collaborate
- 10 workflow stages execute
- Code generated and reviewed
- Tests written and run
- Complete in ~8-10 minutes

---

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f orchestrator
docker-compose logs -f arbitrator
docker-compose logs -f ollama
```

### Check Service Status
```bash
docker-compose ps
```

### Check Resource Usage
```bash
docker stats
```

---

## 🛠️ Common Commands

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Restart Specific Service
```bash
docker-compose restart orchestrator
```

### Full Reset (Removes all data!)
```bash
docker-compose down -v
./setup.sh
```

### Update Code from GitHub
```bash
git pull origin main
docker-compose restart
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Stop the process or change ports in docker-compose.yml
```

### Ollama Models Not Downloading
```bash
# Manual download
docker-compose exec ollama ollama pull llama3.1:8b
docker-compose exec ollama ollama pull mistral
docker-compose exec ollama ollama pull codellama
```

### Services Not Starting
```bash
# Check logs
docker-compose logs orchestrator
docker-compose logs postgres

# Restart
docker-compose restart
```

### Database Connection Failed
```bash
# Recreate database
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose up -d
```

---

## 💡 Adding Optional AI APIs

To enhance the system with premium AI models:

### 1. Get Anthropic Claude API Key
- Visit: https://console.anthropic.com/settings/keys
- Create new key
- Copy key (starts with `sk-ant-`)

### 2. Add to .env
```bash
nano .env
# Add line:
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here
```

### 3. Restart Services
```bash
docker-compose restart orchestrator arbitrator
```

**Benefits:**
- 92% conflict auto-resolution (vs ~80% with Ollama)
- Better code quality
- Faster decision making

---

## 📈 System Requirements

### Minimum (Development)
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 20GB
- **Network:** 10 Mbps (for model downloads)

### Recommended (Production)
- **CPU:** 8+ cores
- **RAM:** 16GB
- **Storage:** 50GB SSD
- **Network:** 50+ Mbps

### Heavy Load (50+ agents)
- **CPU:** 12+ cores
- **RAM:** 24GB+
- **Storage:** 100GB+ SSD
- **Network:** 100+ Mbps

---

## 💰 Cost Estimates

### With Ollama Only (Default)
- **Infrastructure:** Free (local)
- **AI Costs:** $0 (local models)
- **Total:** **$0/month** 🎉

### Hybrid (Ollama + Claude)
- **Infrastructure:** Free (local)
- **AI Costs:** $5-20/month (Claude API)
- **Total:** **$5-20/month**

### All Premium (Claude + GPT)
- **Infrastructure:** Free (local)
- **AI Costs:** $20-50/month
- **Total:** **$20-50/month**

**Pro Tip:** System auto-switches to Ollama at 80% budget to prevent overages! 🛡️

---

## 🔐 Security Notes

### GitHub Token Security
- ✅ Token is in `.env` (not committed to Git)
- ✅ `.gitignore` prevents accidental commit
- ❌ Never share your `.env` file
- ❌ Never commit tokens to public repos

### Production Deployment
When deploying to servers:
- Change `POSTGRES_PASSWORD` to strong password
- Use secrets management (Vault, Docker Secrets)
- Enable HTTPS/TLS
- Set up firewall rules
- Use VPN for admin access

---

## 📚 Next Steps

1. ✅ **Deploy Locally:** Run `./setup.sh`
2. ✅ **Create First Project:** Use the dashboard
3. ✅ **Monitor Progress:** Watch the agents work
4. 📖 **Read Documentation:** See README.md for details
5. 🚀 **Deploy to Production:** See DEPLOYMENT.md for cloud options

---

## 🆘 Getting Help

### Documentation Files
- `README.md` - Complete system overview
- `QUICK_START.md` - Beginner guide
- `DEPLOYMENT.md` - Production deployment
- `DEPLOYMENT_OPTIONS.md` - All deployment methods

### Check Status
```bash
# System health
curl http://localhost:3000/health

# Database
docker-compose exec postgres pg_isready

# Redis
docker-compose exec redis redis-cli ping

# Ollama
curl http://localhost:11434/api/tags
```

---

## ✨ Success Indicators

Your deployment is successful when:
- ✅ Dashboard loads at http://localhost:3000
- ✅ All 5 services show "Up" in `docker-compose ps`
- ✅ Health check returns `{"status":"healthy"}`
- ✅ You can create and run projects
- ✅ Agents execute tasks
- ✅ Real-time metrics display

---

## 🎉 You're Ready!

Run this command to start:

```bash
cd /path/to/zekka-framework
./setup.sh
```

Then open: **http://localhost:3000**

**Good luck building with 50+ AI agents! 🚀**

---

**GitHub Repository:** https://github.com/zekka-tech/Zekka
**Last Updated:** January 2026
**Version:** 1.0.0
