# Quick Start: Model Configuration

## TL;DR

```bash
# 1. Set API keys in .env
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=AIzaSy-your-key-here

# 2. Start services
docker-compose up -d
npm run start:orchestrator
npm run start:arbitrator

# 3. That's it! Models are auto-configured:
# - Arbitrator → Claude Sonnet 4.5 (fallback: Ollama)
# - Orchestrator → Gemini Pro (fallback: Ollama)
```

## 5-Minute Setup

### 1. Get API Keys

**Anthropic (for Arbitrator)**
- Visit: https://console.anthropic.com/
- Create account → Settings → API Keys
- Copy key (starts with `sk-ant-`)

**Google Gemini (for Orchestrator)**
- Visit: https://makersuite.google.com/app/apikey
- Create API key
- Copy key (starts with `AIzaSy`)

### 2. Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit .env
nano .env

# Add your keys:
ANTHROPIC_API_KEY=sk-ant-your-actual-key
GEMINI_API_KEY=AIzaSy-your-actual-key
```

### 3. Start Services

```bash
# Start dependencies
docker-compose up -d postgres redis ollama

# Start Orchestrator (uses Gemini)
npm run start:orchestrator

# Start Arbitrator (uses Claude)
npm run start:arbitrator
```

## Usage

### In Code

```javascript
const ModelClient = require('./src/services/model-client');

const client = new ModelClient({
  logger: console,
  tokenEconomics: tokenEconomics,
  contextBus: contextBus
});

// For conflict resolution (uses Claude Sonnet 4.5)
const resolution = await client.generateArbitratorResponse(
  "Analyze this conflict: ...",
  { taskId: 'conflict-1', maxTokens: 4000 }
);

// For workflow coordination (uses Gemini Pro)
const plan = await client.generateOrchestratorResponse(
  "Create execution plan: ...",
  { projectId: 'proj-1', maxTokens: 2000 }
);
```

### Fallback Behavior

**Without API keys:**
```bash
# Both components automatically use Ollama (local)
# No errors - just logs warning
```

**With API failures:**
```bash
# Automatically falls back to Ollama
# Continues working without interruption
```

## Cost Estimation

### Typical Project

| Task | Model | Tokens | Cost |
|------|-------|--------|------|
| 10 conflicts | Claude | 40,000 | $0.72 |
| 100 orchestrations | Gemini | 200,000 | $0.10 |
| **Total** | | | **$0.82** |

### With 50% Ollama fallback: **$0.41**

## Common Scenarios

### Development (No API costs)

```bash
# .env
ARBITRATOR_MODEL=llama3.1:8b
ORCHESTRATOR_MODEL=llama3.1:8b
# Don't set API keys
```

### Production (Optimal performance)

```bash
# .env
ARBITRATOR_MODEL=claude-sonnet-4-5
ORCHESTRATOR_MODEL=gemini-pro
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIzaSy...
```

### Budget-Conscious

```bash
# .env
ARBITRATOR_MODEL=claude-sonnet-4-5
ORCHESTRATOR_MODEL=gemini-pro
DAILY_BUDGET=10
FALLBACK_THRESHOLD=50  # Use Ollama more aggressively
```

## Troubleshooting

### "Arbitrator always using Ollama"

```bash
# Check API key
echo $ANTHROPIC_API_KEY

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

### "Orchestrator always using Ollama"

```bash
# Check API key
echo $GEMINI_API_KEY

# Test API key
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

### "High costs"

```bash
# Reduce budget
DAILY_BUDGET=10

# Use Ollama for development
ARBITRATOR_MODEL=llama3.1:8b
ORCHESTRATOR_MODEL=llama3.1:8b
```

## Monitoring

### Check model availability

```bash
node -e "
const ModelClient = require('./src/services/model-client');
new ModelClient().checkModelAvailability().then(console.log);
"
```

### Check fallback stats

```bash
# View logs for fallback events
docker-compose logs -f orchestrator | grep "fallback"
docker-compose logs -f arbitrator | grep "fallback"
```

### Check costs

```bash
# View token economics dashboard
curl http://localhost:3000/api/metrics
```

## Next Steps

- Read: `MODEL_ARCHITECTURE.md` for detailed docs
- Review: `IMPLEMENTATION_SUMMARY.md` for changes
- See: `.env.example` for all configuration options

## Quick Reference

| What | Value |
|------|-------|
| Arbitrator Model | `claude-sonnet-4-5` |
| Orchestrator Model | `gemini-pro` |
| Fallback Model | `llama3.1:8b` |
| Anthropic API | `ANTHROPIC_API_KEY` |
| Gemini API | `GEMINI_API_KEY` |
| Ollama Host | `OLLAMA_HOST` |

---

**That's it!** You're ready to use the new model architecture.
