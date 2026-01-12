# 🚀 Zekka Framework - Quick Reference Card

## 📦 One-Command Deployment

```bash
git clone https://github.com/zekka-tech/Zekka.git && cd Zekka && cp .env.example .env && nano .env && chmod +x setup.sh && ./setup.sh
```

**Then add your GitHub token to .env and save!**

---

## 🔑 Your Credentials

```bash
# GitHub Token (add to .env - you have this, it starts with ghp_...)
GITHUB_TOKEN=ghp_YOUR_ACTUAL_TOKEN_HERE

# Optional AI Keys (for better performance)
ANTHROPIC_API_KEY=<get from https://console.anthropic.com/>
OPENAI_API_KEY=<get from https://platform.openai.com/>
```

---

## 🖥️ Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | Main UI |
| **API** | http://localhost:3000/api | REST API |
| **Health** | http://localhost:3000/health | Status check |
| **Arbitrator** | http://localhost:3001 | Conflict resolution |

---

## ⚡ Essential Commands

### Start/Stop
```bash
cd Zekka
./setup.sh                  # Initial setup + start
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose restart      # Restart all services
```

### Status & Logs
```bash
docker-compose ps           # List services
docker-compose logs -f      # View all logs
curl http://localhost:3000/health  # Health check
```

### Service Control
```bash
docker-compose restart orchestrator  # Restart main app
docker-compose restart arbitrator    # Restart conflict resolver
docker-compose logs -f orchestrator  # View specific logs
```

### Database
```bash
docker-compose exec postgres psql -U zekka -d zekka_framework
```

### Redis
```bash
docker-compose exec redis redis-cli
```

### Ollama
```bash
docker-compose exec ollama ollama list          # List models
docker-compose exec ollama ollama pull llama3.1 # Add model
```

---

## 🎯 Create First Project

1. Open http://localhost:3000
2. Click "Create New Project"
3. Fill in:
   ```
   Name: My Todo App
   Requirements: Create full-stack todo app with React, Node.js, PostgreSQL
   Story Points: 8
   Budget: $50
   ```
4. Click "Start"
5. Wait ~8-10 minutes
6. Get complete application!

---

## 🐛 Quick Troubleshooting

### Port in use
```bash
lsof -i :3000              # Find process
kill -9 <PID>              # Kill it
```

### Services not starting
```bash
docker-compose down -v     # Clean slate
./setup.sh                 # Redeploy
```

### Check logs
```bash
docker-compose logs orchestrator
docker-compose logs postgres
```

---

## 💰 Cost (with defaults)

```
Local Infrastructure: $0
Ollama AI Models:     $0
GitHub (free tier):   $0
----------------------
TOTAL:                $0/month 🎉
```

**Add Claude for better quality:**
```
Claude API: $5-20/month
→ 92% conflict resolution (vs 80%)
```

---

## 📊 System Requirements

**Minimum:**
- 8GB RAM
- 4 CPU cores
- 20GB storage
- Docker 20.x+

**Recommended:**
- 16GB RAM
- 8 CPU cores
- 50GB SSD
- Docker latest

---

## 🔗 Quick Links

- **Repo:** https://github.com/zekka-tech/Zekka
- **Backup:** https://www.genspark.ai/api/files/s/tzWmFzhK
- **Dashboard:** http://localhost:3000
- **Docs:** See README.md and other .md files

---

## 📚 Documentation Files

1. **DEPLOYMENT_INSTRUCTIONS.md** ⭐ - Complete deployment guide
2. **QUICK_START.md** - Beginner guide
3. **README.md** - System overview
4. **DEPLOYMENT_OPTIONS.md** - All deployment methods
5. **LOCAL_DEPLOY.md** - Local deployment specifics

---

## ✅ Success Checklist

- [ ] Docker running
- [ ] Git clone completed
- [ ] .env configured with GitHub token
- [ ] ./setup.sh executed successfully
- [ ] Dashboard loads at http://localhost:3000
- [ ] All services show "Up"
- [ ] Health check returns healthy
- [ ] First project created
- [ ] Agents executing tasks
- [ ] Code generated successfully

---

## 🎉 You're Ready!

**Run this now:**
```bash
git clone https://github.com/zekka-tech/Zekka.git
cd Zekka
cp .env.example .env
nano .env  # Add GitHub token
./setup.sh
open http://localhost:3000
```

**Then build amazing things with 50+ AI agents! 🚀✨**

---

**Keep this card handy for quick reference!**
