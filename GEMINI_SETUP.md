# 🤖 Gemini API Setup Guide

## Overview

Zekka Framework now supports **Google Gemini** as the primary LLM with **Ollama** as a fallback. This guide will help you configure Gemini API for enhanced performance.

---

## 🎯 **Why Use Gemini?**

### **Performance Comparison**

| Feature | Gemini Pro | Ollama (llama3.1) |
|---------|------------|-------------------|
| **Speed** | ⚡ ~2-3 seconds | 🐢 ~5-10 seconds |
| **Quality** | 🌟 Excellent | ✅ Good |
| **Context Window** | 📊 32K tokens | 📊 8K tokens |
| **Multi-modal** | ✅ Text + Images | ❌ Text only |
| **Cost** | 💰 $0.50-2/project | 💚 Free |
| **Availability** | ☁️ Cloud only | 💻 Offline capable |
| **Concurrency** | 🚀 High | 🔄 Limited |

### **When to Use Each**

**Use Gemini when:**
- 🎯 You need the best quality code
- ⚡ Speed is important
- 📊 Working with large contexts
- 🖼️ Need image understanding (future)
- 💰 Budget allows ~$1-2 per project

**Use Ollama when:**
- 💚 Zero cost is priority
- 📡 Working offline
- 🔒 Data privacy is critical
- 🧪 Testing/experimentation

---

## 🔑 **Getting Your Gemini API Key**

### **Step 1: Access Google AI Studio**

Visit: https://makersuite.google.com/app/apikey

### **Step 2: Sign In**

- Use your Google account
- Accept terms of service
- Enable Gemini API access

### **Step 3: Create API Key**

1. Click **"Create API Key"**
2. Select existing project or create new one
3. Copy the generated key (starts with `AIza...`)
4. Store it securely (you won't be able to see it again)

**Important:** Keep your API key secret! Never commit it to git or share publicly.

---

## ⚙️ **Configuration**

### **Option 1: Environment Variable (Recommended)**

Edit your `.env` file:

```bash
cd ~/Zekka
nano .env
```

Add the following line:

```bash
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Specify model version
GEMINI_MODEL=gemini-pro
# or: gemini-pro-vision (for image support)

# Optional: Token limits
GEMINI_MAX_OUTPUT_TOKENS=8192
GEMINI_TEMPERATURE=0.7
```

### **Option 2: Docker Compose**

Your `docker-compose.yml` is already configured. Just ensure `.env` has the key:

```yaml
environment:
  - PRIMARY_LLM=gemini
  - GEMINI_API_KEY=${GEMINI_API_KEY}
  - FALLBACK_LLM=ollama
```

---

## 🔄 **Applying Configuration**

### **Restart Services**

```bash
cd ~/Zekka
docker-compose restart orchestrator arbitrator
```

### **Verify Configuration**

```bash
# Check environment variables
docker-compose exec orchestrator env | grep GEMINI

# Should show:
# PRIMARY_LLM=gemini
# GEMINI_API_KEY=AIza...
# FALLBACK_LLM=ollama
```

### **Test API Connection**

```bash
# Check health endpoint
curl http://localhost:3000/health

# Response should include:
{
  "status": "healthy",
  "services": {
    "gemini": "connected",  // ← Should show connected
    "ollama": "available"
  }
}
```

---

## 💰 **Cost Management**

### **Pricing (as of 2026)**

**Gemini Pro:**
- **Input:** $0.00025 per 1K tokens (~$0.25 per 1M)
- **Output:** $0.0005 per 1K tokens (~$0.50 per 1M)

**Typical Project Costs:**

| Project Size | Tokens Used | Estimated Cost |
|--------------|-------------|----------------|
| **Small (5 pts)** | ~50K | $0.05-0.25 |
| **Medium (8 pts)** | ~100K | $0.50-1.00 |
| **Large (13 pts)** | ~200K | $1.00-2.00 |
| **XL (21 pts)** | ~400K | $2.00-4.00 |

### **Budget Controls**

Zekka automatically manages costs:

```bash
# Set budget limits in .env
DAILY_BUDGET=50        # $50/day max
MONTHLY_BUDGET=1000    # $1000/month max

# When budget reaches 80%, system automatically switches to Ollama
```

### **Monitor Spending**

```bash
# View cost dashboard
open http://localhost:3000

# Check today's spending
curl http://localhost:3000/api/costs/today

# Check monthly spending
curl http://localhost:3000/api/costs/month
```

---

## 🔄 **Fallback Behavior**

### **Automatic Switching**

Zekka automatically uses Ollama when:
- 🚫 Gemini API key not configured
- 💰 Daily/monthly budget exceeded
- ⚠️ Gemini API returns errors
- 🌐 Network connectivity issues
- 📊 Rate limits reached

### **Manual Override**

Force use of specific model:

```bash
# Use only Gemini (no fallback)
PRIMARY_LLM=gemini
FALLBACK_LLM=none

# Use only Ollama (no Gemini)
PRIMARY_LLM=ollama
FALLBACK_LLM=none

# Default: Gemini with Ollama fallback
PRIMARY_LLM=gemini
FALLBACK_LLM=ollama
```

---

## 🎛️ **Advanced Configuration**

### **Model Selection**

```bash
# Default: gemini-pro
GEMINI_MODEL=gemini-pro

# For vision tasks (future support)
GEMINI_MODEL=gemini-pro-vision

# For faster responses (lower quality)
GEMINI_MODEL=gemini-pro-fast
```

### **Performance Tuning**

```bash
# Temperature (creativity)
# 0.0 = deterministic, 1.0 = creative
GEMINI_TEMPERATURE=0.7

# Max output tokens
GEMINI_MAX_OUTPUT_TOKENS=8192

# Top-p sampling
GEMINI_TOP_P=0.95

# Top-k sampling
GEMINI_TOP_K=40
```

### **Safety Settings**

```bash
# Block harmful content
GEMINI_SAFETY_HARASSMENT=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_HATE_SPEECH=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_SEXUALLY_EXPLICIT=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_DANGEROUS=BLOCK_MEDIUM_AND_ABOVE
```

---

## 🐛 **Troubleshooting**

### **Issue: API Key Not Working**

**Symptoms:**
```
Error: Gemini API authentication failed
```

**Solutions:**
1. Verify key is correct (starts with `AIza`)
2. Check key hasn't expired
3. Ensure billing is enabled on Google Cloud
4. Verify API is enabled in Google Cloud Console

```bash
# Test API key directly
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

### **Issue: Rate Limit Exceeded**

**Symptoms:**
```
Error: 429 Too Many Requests
```

**Solutions:**
1. System automatically switches to Ollama
2. Wait 60 seconds and retry
3. Increase quota in Google Cloud Console
4. Enable billing for higher limits

### **Issue: Slow Response Times**

**Symptoms:**
- Requests taking >10 seconds

**Solutions:**
1. Check network connectivity
2. Use `gemini-pro-fast` model
3. Reduce `MAX_OUTPUT_TOKENS`
4. Check Google Cloud status page

### **Issue: Fallback Not Working**

**Symptoms:**
```
Error: No available LLM
```

**Solutions:**
1. Ensure Ollama is running:
   ```bash
   docker-compose ps ollama
   ```
2. Check Ollama has models:
   ```bash
   docker-compose exec ollama ollama list
   ```
3. Pull models if missing:
   ```bash
   docker-compose exec ollama ollama pull llama3.1:8b
   ```

---

## 📊 **Monitoring**

### **Real-Time Metrics**

Access dashboard at: http://localhost:3000/metrics

**Key Metrics:**
- 📈 Requests per second
- ⏱️ Average latency
- 💰 Cost per request
- 🔄 Fallback rate
- ✅ Success rate

### **Logging**

View Gemini-specific logs:

```bash
# All logs
docker-compose logs -f orchestrator

# Filter Gemini logs
docker-compose logs -f orchestrator | grep gemini

# Recent errors
docker-compose logs --tail=100 orchestrator | grep -i error
```

---

## 🔒 **Security Best Practices**

### **Protect Your API Key**

✅ **DO:**
- Store in `.env` file (gitignored)
- Use environment variables
- Rotate keys regularly
- Monitor usage for anomalies

❌ **DON'T:**
- Commit to git
- Share publicly
- Hardcode in source
- Use in client-side code

### **Key Rotation**

```bash
# Generate new key in Google AI Studio
# Update .env
nano .env

# Restart services
docker-compose restart orchestrator arbitrator

# Revoke old key in Google Cloud Console
```

---

## 🎯 **Quick Start Checklist**

- [ ] Get Gemini API key from Google AI Studio
- [ ] Add `GEMINI_API_KEY` to `.env` file
- [ ] Verify `PRIMARY_LLM=gemini` in docker-compose.yml
- [ ] Restart services: `docker-compose restart`
- [ ] Test connection: `curl http://localhost:3000/health`
- [ ] Create first project and verify Gemini is used
- [ ] Monitor costs in dashboard

---

## 📚 **Additional Resources**

- **Google AI Studio:** https://makersuite.google.com/
- **Gemini API Docs:** https://ai.google.dev/docs
- **Pricing:** https://ai.google.dev/pricing
- **API Limits:** https://ai.google.dev/docs/api_limits
- **Support:** https://support.google.com/

---

## 💡 **Pro Tips**

1. **Start with free tier** - Google provides generous free quotas
2. **Monitor spending** - Check dashboard daily
3. **Use Ollama for testing** - Save Gemini for production
4. **Batch requests** - More efficient and cost-effective
5. **Enable billing alerts** - Get notified before budget exceeded
6. **Cache common responses** - Reduce API calls

---

## 🎉 **You're Ready!**

With Gemini configured, you'll get:
- ⚡ 2-3x faster project completion
- 🌟 Higher quality code
- 📊 Better context understanding
- 🔄 Automatic fallback to Ollama

**Happy building with Gemini! 🚀**

---

**Need help?** Check `TROUBLESHOOTING.md` or create an issue on GitHub.

**Version:** 2.0.0  
**Last Updated:** January 2026
