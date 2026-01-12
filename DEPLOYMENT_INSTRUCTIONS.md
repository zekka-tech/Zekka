# 🚀 Zekka Framework - Local Deployment Instructions

## ✅ You're About to Deploy!

Follow these exact steps on your local machine where Docker is installed.

---

## 📋 Pre-Deployment Checklist

Before you start, ensure:
- [ ] Docker Desktop is installed and running
- [ ] You have at least 8GB RAM available
- [ ] You have at least 20GB free disk space
- [ ] Ports 3000, 3001, 5432, 6379, 11434 are free
- [ ] You have stable internet connection (for downloading AI models)

**Check Docker:**
```bash
docker --version
docker-compose --version
docker ps
```

All commands should work without errors.

---

## 🎯 Deployment Steps

### Step 1: Clone the Repository
```bash
git clone https://github.com/zekka-tech/Zekka.git
cd Zekka
```

**What this does:**
- Downloads the complete Zekka Framework from GitHub
- Changes directory into the project folder

**Expected output:**
```
Cloning into 'Zekka'...
remote: Enumerating objects: XX, done.
remote: Counting objects: 100% (XX/XX), done.
remote: Compressing objects: 100% (XX/XX), done.
Receiving objects: 100% (XX/XX), XXX.XX KiB | XXX.00 KiB/s, done.
```

---

### Step 2: Create Environment Configuration
```bash
cp .env.example .env
```

**What this does:**
- Copies the template environment file
- Creates a new `.env` file for your configuration

**Expected output:**
- No output (silent success)
- You'll see `.env` file created

---

### Step 3: Configure Your GitHub Token

**Option A: Using nano (Terminal Editor)**
```bash
nano .env
```

**Option B: Using VS Code**
```bash
code .env
```

**Option C: Using vim**
```bash
vim .env
```

**What to change:**
Find this line:
```bash
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
```

Replace with your actual token (the one you received earlier):
```bash
GITHUB_TOKEN=ghp_YOUR_ACTUAL_TOKEN_HERE
```

**Optional: Add AI API Keys**
If you have them, also add:
```bash
# For better conflict resolution (recommended)
ANTHROPIC_API_KEY=sk-ant-your_key_here

# For GPT models (optional)
OPENAI_API_KEY=sk-your_key_here
```

**Save and exit:**
- **nano:** Press `Ctrl+X`, then `Y`, then `Enter`
- **VS Code:** Press `Ctrl+S` (or `Cmd+S` on Mac)
- **vim:** Press `Esc`, type `:wq`, press `Enter`

---

### Step 4: Make Setup Script Executable
```bash
chmod +x setup.sh
```

**What this does:**
- Adds execute permission to the setup script

**Expected output:**
- No output (silent success)

---

### Step 5: Run Deployment! 🚀
```bash
./setup.sh
```

**What this does:**
1. ✅ Verifies Docker and Docker Compose are installed
2. ✅ Pulls Docker images (postgres, redis, ollama, node)
3. ✅ Starts 5 containers in the background
4. ✅ Waits for services to be ready
5. ✅ Initializes PostgreSQL database
6. ✅ Downloads AI models (llama3.1, mistral, codellama)
7. ✅ Starts Orchestrator and Arbitrator
8. ✅ Runs health checks

**Expected timeline:**
```
⏱️  0:00 - Checking Docker... ✅
⏱️  0:10 - Pulling images... (1-2 minutes)
⏱️  2:00 - Starting containers... ✅
⏱️  2:30 - PostgreSQL ready... ✅
⏱️  2:40 - Redis ready... ✅
⏱️  3:00 - Ollama ready... ✅
⏱️  3:30 - Downloading llama3.1... (2-3 minutes)
⏱️  6:00 - Downloading mistral... (2-3 minutes)
⏱️  8:30 - Downloading codellama... (2-3 minutes)
⏱️ 11:00 - Orchestrator ready... ✅
⏱️ 11:30 - Arbitrator ready... ✅
⏱️ 12:00 - 🎉 DEPLOYMENT COMPLETE!
```

**Total time:** ~12-15 minutes (first time)

**Expected final output:**
```
=========================================
🎉 Zekka Framework is ready!
=========================================

📊 Access the dashboard:
   👉 http://localhost:3000

🤖 API endpoints:
   • Health: http://localhost:3000/health
   • API:    http://localhost:3000/api
   • Arbitrator: http://localhost:3001

📚 Useful commands:
   • View logs:     docker-compose logs -f
   • Stop system:   docker-compose down
   • Restart:       docker-compose restart
   • Full reset:    docker-compose down -v

💡 Next steps:
   1. Open http://localhost:3000 in your browser
   2. Create a new project in the dashboard
   3. Watch the multi-agent system work!

📖 For more help, see README.md
```

---

## 🎯 Step 6: Access Your System

### Open the Dashboard
```bash
# macOS
open http://localhost:3000

# Linux
xdg-open http://localhost:3000

# Windows
start http://localhost:3000

# Or manually open your browser and go to:
# http://localhost:3000
```

**What you should see:**
- 🖥️ Beautiful web dashboard
- 📊 Real-time system metrics
- ✅ "System Status: Online"
- 🟢 All services showing as "Connected"
- 🎯 "Create New Project" button

---

## 🎨 Create Your First Project

In the dashboard:

### 1. Click "Create New Project"

### 2. Fill in the Form:
```
Project Name: My First Todo App

Requirements:
Create a full-stack todo application with the following features:
- React frontend with Material-UI components
- Node.js/Express REST API backend
- PostgreSQL database for data persistence
- CRUD operations (Create, Read, Update, Delete todos)
- User authentication with JWT tokens
- Mark todos as complete/incomplete
- Filter todos by status (all/active/completed)
- Unit tests with Jest (minimum 80% coverage)
- API documentation with Swagger
- Responsive design for mobile and desktop

Story Points: 8

Daily Budget: $50
```

### 3. Click "Start Project"

### 4. Watch the Magic! ✨

**You'll see:**
- 📊 Real-time progress bar
- 🤖 Agent activities streaming
- 💰 Cost tracking (starts at $0 with Ollama)
- ⏱️ Time elapsed counter
- 📝 Stage completion indicators

**Expected stages:**
1. ✅ **Planning** (1 min) - AI analyzes requirements
2. ✅ **Architecture** (1 min) - Designs system structure
3. ✅ **Database Design** (1 min) - Creates schema
4. ✅ **Backend Development** (2 min) - Express API
5. ✅ **Frontend Development** (2 min) - React UI
6. ✅ **Testing** (2 min) - Unit & integration tests
7. ✅ **Code Review** (1 min) - Quality checks
8. ✅ **Documentation** (1 min) - API docs, README
9. ✅ **Integration** (1 min) - Combines components
10. ✅ **Deployment Prep** (1 min) - Packages for deployment

**Total time:** ~8-10 minutes

---

## 📊 Verify Everything is Working

### Check All Services
```bash
docker-compose ps
```

**Expected output:**
```
NAME                   STATUS    PORTS
zekka-orchestrator-1   Up        0.0.0.0:3000->3000/tcp
zekka-arbitrator-1     Up        0.0.0.0:3001->3001/tcp
zekka-postgres-1       Up        0.0.0.0:5432->5432/tcp
zekka-redis-1          Up        0.0.0.0:6379->6379/tcp
zekka-ollama-1         Up        0.0.0.0:11434->11434/tcp
```

All should show **"Up"** status.

### Check Health Endpoint
```bash
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T17:30:00.000Z",
  "services": {
    "redis": "connected",
    "postgres": "connected",
    "ollama": "available"
  },
  "version": "1.0.0"
}
```

### View Live Logs
```bash
docker-compose logs -f
```

**What you'll see:**
- Orchestrator startup logs
- Agent activity logs
- Database queries
- Redis operations
- API requests

Press `Ctrl+C` to stop viewing logs.

---

## 🛠️ Useful Commands

### Control Services
```bash
# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart orchestrator

# View resource usage
docker stats
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f orchestrator
docker-compose logs -f arbitrator
docker-compose logs -f ollama
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U zekka -d zekka_framework

# Inside psql:
\dt              # List tables
SELECT * FROM projects;
SELECT * FROM agents;
\q               # Quit
```

### Redis Operations
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Inside redis-cli:
KEYS *           # List all keys
GET project:1    # Get specific key
QUIT             # Exit
```

### Ollama Operations
```bash
# List installed models
docker-compose exec ollama ollama list

# Pull additional model
docker-compose exec ollama ollama pull codellama:13b

# Test a model
docker-compose exec ollama ollama run llama3.1 "Hello, world!"
```

---

## 🐛 Troubleshooting

### Problem: Port Already in Use

**Error:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Replace <PID> with actual process ID

# Or use different ports in docker-compose.yml
```

---

### Problem: Docker Not Running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# macOS: Start Docker Desktop from Applications
# Windows: Start Docker Desktop from Start Menu
# Linux:
sudo systemctl start docker
```

---

### Problem: Insufficient Memory

**Error:**
```
Error: Cannot allocate memory
```

**Solution:**
1. Close other applications
2. Increase Docker memory limit:
   - Docker Desktop → Settings → Resources → Memory
   - Set to at least 8GB (16GB recommended)
3. Restart Docker Desktop

---

### Problem: Models Not Downloading

**Error:**
```
Error pulling model: connection timeout
```

**Solution:**
```bash
# Check internet connection
ping ollama.com

# Try manual download
docker-compose exec ollama ollama pull llama3.1:8b

# Or use smaller models
docker-compose exec ollama ollama pull llama3.1:7b
```

---

### Problem: Services Won't Start

**Error:**
```
Service 'postgres' failed to build
```

**Solution:**
```bash
# Clean everything and start fresh
docker-compose down -v
docker system prune -a
./setup.sh
```

---

## 💡 Optimization Tips

### Speed Up AI Processing
1. **Add Claude API key** for better quality and speed:
   ```bash
   nano .env
   # Add: ANTHROPIC_API_KEY=sk-ant-your_key
   docker-compose restart
   ```

2. **Increase concurrent agents**:
   ```bash
   nano .env
   # Change: MAX_CONCURRENT_AGENTS=20
   docker-compose restart
   ```

### Reduce Resource Usage
1. **Use smaller models**:
   ```bash
   docker-compose exec ollama ollama pull llama3.1:7b
   ```

2. **Limit concurrent agents**:
   ```bash
   nano .env
   # Change: MAX_CONCURRENT_AGENTS=5
   ```

---

## 🎉 Success Indicators

You've successfully deployed when:

- ✅ Dashboard loads at http://localhost:3000
- ✅ All 5 services show "Up" in `docker-compose ps`
- ✅ Health endpoint returns `{"status":"healthy"}`
- ✅ You can create new projects
- ✅ Agents execute tasks successfully
- ✅ Real-time metrics display
- ✅ No errors in logs

---

## 📞 Next Steps After Deployment

### Immediate
1. ✅ Create your first project
2. ✅ Watch the agents work
3. ✅ Review the generated code

### This Week
4. 📖 Read the full documentation
5. 🧪 Test with different project types
6. 🤖 Consider adding Claude API key
7. 📊 Monitor system performance

### This Month
8. 🚀 Deploy to production server (Hetzner/AWS/GCP)
9. 🔒 Implement security hardening
10. 📈 Set up monitoring and alerts
11. 💾 Configure automated backups

---

## 🔗 Important Resources

- **Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/health
- **Arbitrator:** http://localhost:3001
- **GitHub Repo:** https://github.com/zekka-tech/Zekka
- **Documentation:** See all .md files in project root

---

## 🆘 Getting Help

### Documentation
- **README.md** - System overview
- **QUICK_START.md** - Beginner guide
- **DEPLOYMENT_COMPLETE.md** - Comprehensive deployment info

### Check Logs
```bash
docker-compose logs -f
```

### GitHub Issues
Create an issue at: https://github.com/zekka-tech/Zekka/issues

---

## 🎊 Congratulations!

You're now running a **production-ready multi-agent AI orchestration platform**!

**What you can do:**
- ✨ Build complete applications in 8-10 minutes
- ✨ Deploy 50+ AI agents in parallel
- ✨ Automatic conflict resolution
- ✨ Real-time cost tracking
- ✨ Scale to enterprise workloads

**Happy building! 🚀✨**

---

**Your GitHub Token:** (You have this - it starts with `ghp_...` - keep it secure!)

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** ✅ Ready to Deploy
