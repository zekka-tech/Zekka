# 🤖 Zekka Framework - Production-Ready Deployment

**Multi-Agent AI Orchestration Platform**

Transform your development process with 50+ AI agents working together seamlessly. Build complete applications in minutes, not days.

---

## 🎯 What You're Deploying

Zekka Framework coordinates multiple AI agents to:
- Research best practices
- Write code across multiple files
- Resolve conflicts automatically
- Run tests
- Deploy applications

**All automatically, with budget controls and conflict resolution built-in.**

---

## 📋 Prerequisites (What You Need Installed)

### Required:
1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
   - Windows: Docker Desktop for Windows
   - Mac: Docker Desktop for Mac
   - Linux: Docker Engine + Docker Compose

2. **GitHub Account** - [Sign up free](https://github.com/signup)
   - You'll need a Personal Access Token (we'll guide you)

### Optional:
3. **Anthropic API Key** - [Get one here](https://console.anthropic.com/)
   - Enables Claude AI for better conflict resolution
   - Without this, system uses free local Ollama models

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Download the Project

```bash
# If you have git installed:
git clone <repository-url>
cd zekka-framework

# Or download and extract the ZIP file, then:
cd zekka-framework
```

### Step 2: Get Your GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "Zekka Framework"
4. Select permissions:
   - ✅ `repo` (all sub-options)
   - ✅ `workflow`
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file (use any text editor)
nano .env
# Or: code .env (VS Code)
# Or: open .env (Mac TextEdit)
```

**Paste your GitHub token:**
```bash
GITHUB_TOKEN=ghp_your_token_here_from_step_2
```

**Optional - Add Anthropic API key (for better AI):**
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 4: Run Setup Script

```bash
# Make setup script executable (Mac/Linux)
chmod +x setup.sh

# Run the setup
./setup.sh
```

**On Windows (use Git Bash or WSL):**
```bash
bash setup.sh
```

The script will:
- ✅ Check Docker is installed
- ✅ Start all services
- ✅ Download AI models (5-10 minutes)
- ✅ Initialize database
- ✅ Wait for everything to be ready

### Step 5: Access the Dashboard

Open your browser and go to:
```
http://localhost:3000
```

🎉 **You're done!** The Zekka Framework is running!

---

## 📊 What's Running

After setup, you'll have these services:

| Service | Purpose | URL |
|---------|---------|-----|
| **Orchestrator** | Main application & dashboard | http://localhost:3000 |
| **Arbitrator** | Conflict resolution agent | http://localhost:3001 |
| **PostgreSQL** | Project & task database | localhost:5432 |
| **Redis** | Context Bus (shared memory) | localhost:6379 |
| **Ollama** | Local AI models | http://localhost:11434 |

---

## 🎮 Using Zekka Framework

### Creating Your First Project

1. Open http://localhost:3000
2. Fill in the form:
   - **Project Name**: "My Todo App"
   - **Requirements**: 
     ```
     User authentication
     CRUD operations for todos
     RESTful API
     Unit tests
     ```
   - **Story Points**: 8
   - **Daily Budget**: $50
3. Click "Create & Execute Project"
4. Watch the dashboard as agents work!

### What Happens Next

The system will:
1. ✅ Research best practices (2 minutes)
2. ✅ Generate documentation (1 minute)
3. ✅ Write code across multiple files (5 minutes)
4. ✅ Resolve any conflicts automatically
5. ✅ Run tests (2 minutes)
6. ✅ Deploy to staging (1 minute)

**Total time: ~10 minutes**

---

## 💰 Cost Management

### Budget Controls

The Token Economics system automatically:
- Tracks spending in real-time
- Switches to free Ollama when budget reaches 80%
- Forces Ollama at 95% to prevent overruns

### Example Costs (8-point project):

| Scenario | Cost |
|----------|------|
| All Premium (Claude Opus) | $21.50 |
| All Ollama (local, free) | $0.80 |
| **Hybrid (recommended)** | **$5-8** |

The system automatically optimizes based on your budget!

---

## 🛠️ Common Commands

### View Live Logs
```bash
# All services
docker-compose logs -f

# Just orchestrator
docker-compose logs -f orchestrator

# Just arbitrator
docker-compose logs -f arbitrator
```

### Stop System
```bash
docker-compose down
```

### Restart System
```bash
docker-compose restart
```

### Complete Reset (clears all data)
```bash
docker-compose down -v
./setup.sh
```

### Check Health
```bash
curl http://localhost:3000/health
```

---

## 🔧 Troubleshooting

### Problem: "Docker is not running"

**Solution:**
- Open Docker Desktop
- Wait for it to fully start
- Try again

### Problem: "Port 3000 is already in use"

**Solution:**
```bash
# Stop any process using port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Problem: "Models download is slow"

**Solution:**
- First time download is 5-10 minutes
- Models are cached, next start is instant
- Check your internet connection

### Problem: "Database connection failed"

**Solution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait 30 seconds, then:
docker-compose restart orchestrator
```

### Problem: "Ollama not responding"

**Solution:**
```bash
# Restart Ollama
docker-compose restart ollama

# Re-pull models
docker-compose exec ollama ollama pull llama3.1:8b
```

---

## 📁 Project Structure

```
zekka-framework/
├── docker-compose.yml       # Service orchestration
├── .env                      # Your configuration (don't commit!)
├── .env.example              # Template for .env
├── setup.sh                  # Automated setup script
├── Dockerfile                # Orchestrator container
├── Dockerfile.arbitrator     # Arbitrator container
├── package.json              # Node.js dependencies
├── init-db.sql               # Database schema
│
├── src/
│   ├── index.js              # Main application
│   ├── orchestrator/         # Core orchestration logic
│   │   └── orchestrator.js
│   ├── arbitrator/           # Conflict resolution
│   │   └── server.js
│   └── shared/               # Shared utilities
│       ├── context-bus.js    # Redis-based state management
│       └── token-economics.js # Cost tracking & optimization
│
├── public/
│   └── index.html            # Web dashboard
│
├── logs/                     # Application logs
└── projects/                 # Generated project files
```

---

## 🔐 Security Notes

### What's Safe:
- ✅ All services run locally on your machine
- ✅ No data leaves your computer except API calls
- ✅ .env file is git-ignored (won't be committed)

### Keep Secret:
- 🔒 Your GitHub token
- 🔒 Your API keys
- 🔒 Never commit .env file

### GitHub Webhook Setup (Optional):

If you want the Arbitrator to automatically resolve conflicts:

1. Go to your GitHub repo settings
2. Webhooks → Add webhook
3. Payload URL: `http://your-server:3001/webhook/github`
4. Content type: `application/json`
5. Secret: (value from .env `WEBHOOK_SECRET`)
6. Events: Pull requests, Pushes

---

## 📈 Monitoring

### Dashboard Metrics

The web dashboard shows:
- 🟢 System status
- 📊 Active projects
- 💰 Daily/monthly costs
- 📈 Budget usage

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U zekka -d zekka

# View projects
SELECT * FROM projects;

# View tasks
SELECT * FROM tasks;

# View costs
SELECT * FROM cost_tracking;
```

### Redis Cache

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# View all keys
KEYS *

# Get project context
GET project:proj-abc123:context
```

---

## 🎓 Learning Path

### Beginner (You are here!)
- ✅ Install and run system
- ✅ Create first project
- ✅ Understand dashboard

### Intermediate (Next steps)
- Configure custom budgets
- Set up GitHub webhooks
- Customize agent behavior

### Advanced (Later)
- Add new agent types
- Integrate external tools
- Deploy to cloud

---

## 💡 Tips for Success

1. **Start Small**: First project should be 5-8 story points
2. **Use Ollama**: Free local models work great for most tasks
3. **Monitor Costs**: Check dashboard regularly
4. **Read Logs**: `docker-compose logs -f` shows what's happening
5. **Be Patient**: First run downloads models (~5-10 min)

---

## 🆘 Getting Help

### Resources:
- 📖 This README (you're reading it!)
- 🐛 GitHub Issues: Report problems
- 💬 Discussions: Ask questions
- 📧 Email: support@zekka-framework.io (if configured)

### Before Asking for Help:

1. Check logs: `docker-compose logs -f`
2. Verify .env configuration
3. Try restarting: `docker-compose restart`
4. Check troubleshooting section above

---

## 🎯 What's Next?

### Immediate:
1. ✅ Run setup.sh
2. ✅ Create first project
3. ✅ Watch it work!

### Short-term:
- Experiment with different project types
- Tune budget settings
- Set up GitHub webhooks

### Long-term:
- Deploy to production server
- Add custom agents
- Integrate with your CI/CD

---

## 📜 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

Built with:
- Node.js + Express
- PostgreSQL + Redis
- Ollama (local LLMs)
- Docker + Docker Compose
- Anthropic Claude (optional)

---

## ✨ Success Metrics

You'll know it's working when:
- ✅ Dashboard loads at http://localhost:3000
- ✅ Health status shows "● Online"
- ✅ You can create and execute projects
- ✅ Costs are tracked in real-time
- ✅ Agents complete tasks automatically

---

**Ready to transform your development process? Run `./setup.sh` now!** 🚀
