# 🔍 Zekka Framework - Monitoring & Health Checks Guide

## Overview

This guide provides comprehensive instructions for monitoring the Zekka Framework in production, including health check endpoints, monitoring strategies, and troubleshooting procedures.

**Last Updated:** January 15, 2026  
**Version:** 2.3.0 (Phase 6C Complete)  
**Status:** Production Ready

---

## 📊 Health Check Endpoints

### Global Health Check

**Endpoint:** `GET /api/health`

Returns overall system health status.

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "version": "2.3.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "external_apis": "healthy"
  }
}
```

**cURL Command:**
```bash
curl https://your-domain.com/api/health
```

---

### Phase 6A Health Check

**Endpoint:** `GET /api/integrations/phase6a/health`

Returns health status for all Phase 6A integrations (20 tools).

**Services Monitored:**
- TwinGate, Wazuh, SonarQube (Security)
- Perplexity AI, NotebookLM (Research)
- WhatsApp Business API, Telegram Bot API (Social Auth)
- Twilio, Slack webhooks (Communication)

**Response Example:**
```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "twingate": {
      "status": "healthy",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0,
        "successRate": 100
      }
    },
    "wazuh": {
      "status": "healthy",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0,
        "successRate": 100
      }
    }
    // ... 18 more services
  },
  "summary": {
    "total": 20,
    "healthy": 20,
    "unhealthy": 0,
    "notConfigured": 0
  }
}
```

**cURL Command:**
```bash
curl https://your-domain.com/api/integrations/phase6a/health
```

---

### Phase 6B Health Check

**Endpoint:** `GET /api/integrations/phase6b/health`

Returns health status for all Phase 6B integrations (25 tools).

**Services Monitored:**
- TempoLabs, Softgen AI, Bolt.diy, AugmentCode, Warp.dev, Windsurf, Qoder.com (Dev Agents)
- Cassidy AI, OpenCode, Emergent (AI Platforms)
- Gamma AI, Napkin, Opal (Content Tools)
- Harpa AI, Clay, Opus (SEO/Marketing)
- Neo4j, Graphiti (Knowledge Graphs)
- LangChain, LangGraph, Ragas, Playwright, Apify, n8n, Zapier (Additional)

**cURL Command:**
```bash
curl https://your-domain.com/api/integrations/phase6b/health
```

---

### Phase 6C Health Check

**Endpoint:** `GET /api/integrations/phase6c/health`

Returns health status for all Phase 6C integrations (25 tools).

**Services Monitored:**
- LlamaIndex, DSPy, AutoGen, CrewAI, LiteLLM, Haystack, Semantic Kernel, Guidance (Specialized AI)
- AWS Bedrock, Azure OpenAI, GCP Vertex AI, AWS SageMaker, Cloudflare AI, Replicate (Cloud Platforms)
- Mixpanel, Amplitude, PostHog, Segment, Heap (Advanced Analytics)
- Stripe, PayPal, Razorpay (Payment Gateways)
- Expo, React Native, Flutter (Mobile Development)

**Response Example:**
```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "llamaindex": {
      "status": "healthy",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0,
        "successRate": 100
      },
      "lastCheck": "2026-01-15T10:30:00Z"
    },
    "aws_bedrock": {
      "status": "not_configured",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0,
        "successRate": 100
      },
      "lastCheck": "2026-01-15T10:30:00Z"
    }
    // ... 23 more services
  },
  "summary": {
    "total": 25,
    "healthy": 20,
    "unhealthy": 0,
    "notConfigured": 5
  },
  "stats": {
    "services": {
      "llamaindex": {
        "circuitBreaker": {
          "state": "CLOSED",
          "failures": 0,
          "successes": 150
        },
        "usage": {
          "requests": 150,
          "errors": 0,
          "cacheHits": 135
        }
      }
      // ... stats for all services
    },
    "cache": {
      "hits": 1350,
      "misses": 150,
      "hitRate": 0.9,
      "size": 450
    }
  }
}
```

**cURL Command:**
```bash
curl https://your-domain.com/api/integrations/phase6c/health
```

---

## 📈 Monitoring Strategies

### 1. Automated Health Checks

**Setup Cron Job for Regular Monitoring:**

```bash
# Create monitoring script
cat > /usr/local/bin/zekka-health-check.sh << 'EOF'
#!/bin/bash

API_URL="https://your-domain.com"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Running Zekka health checks..."

# Global health check
echo "Checking global health..."
curl -s "$API_URL/api/health" | jq '.'

# Phase 6A health check
echo "Checking Phase 6A integrations..."
curl -s "$API_URL/api/integrations/phase6a/health" | jq '.summary'

# Phase 6B health check
echo "Checking Phase 6B integrations..."
curl -s "$API_URL/api/integrations/phase6b/health" | jq '.summary'

# Phase 6C health check
echo "Checking Phase 6C integrations..."
curl -s "$API_URL/api/integrations/phase6c/health" | jq '.summary'

echo "[$TIMESTAMP] Health checks complete"
EOF

chmod +x /usr/local/bin/zekka-health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add line:
*/5 * * * * /usr/local/bin/zekka-health-check.sh >> /var/log/zekka-health.log 2>&1
```

---

### 2. Circuit Breaker Monitoring

**Monitor Circuit Breaker States:**

All 82 circuit breakers should remain in **CLOSED** state during normal operations.

**States:**
- **CLOSED** ✅ - Normal operation, requests flowing
- **OPEN** ⚠️ - Service failing, requests blocked
- **HALF_OPEN** 🔄 - Testing recovery, limited requests

**Alert Triggers:**
- Any circuit breaker transitions to OPEN state
- Circuit breaker failure rate > 10%
- Circuit breaker success rate < 90%

**Monitoring Script:**
```bash
#!/bin/bash

# Check for open circuit breakers
curl -s https://your-domain.com/api/integrations/phase6c/health | \
  jq '.services | to_entries | map(select(.value.circuitBreaker.state == "OPEN")) | .[]'

# This will output any services with open circuit breakers
```

---

### 3. Cache Performance Monitoring

**Monitor Cache Hit Rates:**

Target: **~90% cache hit rate**

**Key Metrics:**
- Cache hits
- Cache misses
- Hit rate percentage
- Cache size

**Monitoring Script:**
```bash
#!/bin/bash

# Get cache stats
curl -s https://your-domain.com/api/integrations/phase6c/health | \
  jq '.stats.cache'

# Output example:
# {
#   "hits": 1350,
#   "misses": 150,
#   "hitRate": 0.9,
#   "size": 450
# }
```

**Alert Triggers:**
- Cache hit rate < 80%
- Cache size > 90% of max capacity
- Sudden drop in hit rate (> 20% decrease)

---

### 4. Service Performance Monitoring

**Monitor Response Times and Error Rates:**

**Key Metrics:**
- Average response time
- p95 response time
- p99 response time
- Error rate
- Request volume

**Monitoring Queries:**
```bash
# Get service stats
curl -s https://your-domain.com/api/integrations/phase6c/health | \
  jq '.stats.services'

# Check for services with errors
curl -s https://your-domain.com/api/integrations/phase6c/health | \
  jq '.stats.services | to_entries | map(select(.value.usage.errors > 0)) | .[]'
```

**Alert Triggers:**
- Error rate > 1%
- Average response time > 5 seconds
- p99 response time > 15 seconds
- Request volume drops > 50%

---

## 🚨 Alerting Configuration

### Recommended Alert Rules

#### 1. **Critical Alerts (Immediate Response)**

```yaml
alerts:
  - name: "Service Down"
    condition: health_check_failed
    threshold: 3 consecutive failures
    severity: critical
    notify: pager, email, slack
    
  - name: "Circuit Breaker Open"
    condition: circuit_breaker_state == OPEN
    threshold: any service
    severity: critical
    notify: pager, email, slack
    
  - name: "High Error Rate"
    condition: error_rate > 5%
    threshold: sustained for 5 minutes
    severity: critical
    notify: pager, email, slack
    
  - name: "Payment Gateway Down"
    condition: stripe|paypal|razorpay unhealthy
    threshold: any payment service
    severity: critical
    notify: pager, email, slack
```

#### 2. **Warning Alerts (Monitor and Investigate)**

```yaml
alerts:
  - name: "Degraded Performance"
    condition: avg_response_time > 3s
    threshold: sustained for 10 minutes
    severity: warning
    notify: email, slack
    
  - name: "Low Cache Hit Rate"
    condition: cache_hit_rate < 80%
    threshold: sustained for 15 minutes
    severity: warning
    notify: email, slack
    
  - name: "Service Not Configured"
    condition: service_status == not_configured
    threshold: expected service
    severity: warning
    notify: email
    
  - name: "Elevated Error Rate"
    condition: error_rate > 1%
    threshold: sustained for 10 minutes
    severity: warning
    notify: email, slack
```

#### 3. **Info Alerts (Track and Optimize)**

```yaml
alerts:
  - name: "High Request Volume"
    condition: requests_per_minute > 1000
    threshold: sustained for 5 minutes
    severity: info
    notify: slack
    
  - name: "Cache Near Capacity"
    condition: cache_size > 80% max
    threshold: sustained for 30 minutes
    severity: info
    notify: slack
    
  - name: "Circuit Breaker Half-Open"
    condition: circuit_breaker_state == HALF_OPEN
    threshold: any service
    severity: info
    notify: slack
```

---

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### 1. **Circuit Breaker is OPEN**

**Symptoms:**
- Service health check shows `circuitBreaker.state: "OPEN"`
- Requests to service are failing

**Root Causes:**
- External service is down
- Network connectivity issues
- API rate limit exceeded
- Invalid API credentials

**Resolution Steps:**
```bash
# 1. Check service health
curl https://your-domain.com/api/integrations/phase6c/health | jq '.services.servicename'

# 2. Verify external service status
# Visit service status page or use their health check

# 3. Check API credentials
# Review .env file for correct API keys

# 4. Wait for circuit breaker reset (30-60 seconds)
# Circuit breaker will automatically attempt recovery

# 5. Manual reset (if needed)
# Restart the application
pm2 restart zekka
```

**Prevention:**
- Monitor external service status pages
- Set up service status webhooks
- Implement retry logic with exponential backoff
- Use multiple fallback providers

---

#### 2. **Low Cache Hit Rate (<80%)**

**Symptoms:**
- `cache.hitRate < 0.8`
- Slow response times
- High external API costs

**Root Causes:**
- Cache TTL too short
- High volume of unique requests
- Cache eviction due to size limits

**Resolution Steps:**
```bash
# 1. Check current cache stats
curl https://your-domain.com/api/integrations/phase6c/health | jq '.stats.cache'

# 2. Analyze cache eviction patterns
# Review logs for cache miss patterns

# 3. Adjust cache configuration
# Edit integration manager options:
# - Increase cache TTL (default: 600s)
# - Increase cache size (default: 500 entries)

# 4. Restart service
pm2 restart zekka
```

**Prevention:**
- Monitor cache metrics regularly
- Adjust TTL based on data freshness requirements
- Implement tiered caching strategy
- Use cache warming for common requests

---

#### 3. **High Error Rate (>1%)**

**Symptoms:**
- `service.usage.errors / service.usage.requests > 0.01`
- Increased circuit breaker failures

**Root Causes:**
- Invalid request parameters
- API quota exceeded
- Authentication failures
- Network timeouts

**Resolution Steps:**
```bash
# 1. Identify services with errors
curl https://your-domain.com/api/integrations/phase6c/health | \
  jq '.stats.services | to_entries | map(select(.value.usage.errors > 0))'

# 2. Review application logs
pm2 logs zekka --nostream | grep "error"

# 3. Check API quotas
# Review API provider dashboards

# 4. Verify credentials
# Ensure API keys in .env are valid

# 5. Implement request throttling
# Adjust rate limits in configuration
```

**Prevention:**
- Implement request validation
- Monitor API quotas proactively
- Set up budget alerts
- Use queue-based processing for high volumes

---

#### 4. **Service Not Configured**

**Symptoms:**
- `service.status: "not_configured"`
- Service shows in health check but not operational

**Root Causes:**
- Missing environment variables
- Incomplete .env configuration
- Service not required for current deployment

**Resolution Steps:**
```bash
# 1. Check which services are not configured
curl https://your-domain.com/api/integrations/phase6c/health | \
  jq '.services | to_entries | map(select(.value.status == "not_configured"))'

# 2. Review required environment variables
# See PHASE6C_IMPLEMENTATION_COMPLETE.md for env var list

# 3. Add missing environment variables to .env
# Example:
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env

# 4. Restart service
pm2 restart zekka

# 5. Verify configuration
curl https://your-domain.com/api/integrations/phase6c/health | \
  jq '.services.stripe'
```

**Prevention:**
- Document all required services
- Use .env.example as template
- Validate environment variables on startup
- Provide clear configuration docs

---

## 📊 Monitoring Dashboards

### Recommended Metrics to Track

#### **System Health Dashboard**

```
┌─────────────────────────────────────────────┐
│ Zekka Framework - System Health            │
├─────────────────────────────────────────────┤
│                                             │
│ Overall Status:         ✅ Healthy         │
│ Tool Coverage:          95/95 (100%)       │
│ Uptime:                 99.95%             │
│                                             │
│ Services:                                   │
│ ├─ Phase 6A (20 tools):  ✅ 20 healthy     │
│ ├─ Phase 6B (25 tools):  ✅ 25 healthy     │
│ └─ Phase 6C (25 tools):  ✅ 25 healthy     │
│                                             │
│ Circuit Breakers:                           │
│ ├─ Total:                82                │
│ ├─ CLOSED:               82 ✅             │
│ ├─ OPEN:                 0                 │
│ └─ HALF_OPEN:            0                 │
│                                             │
│ Performance:                                │
│ ├─ Avg Response Time:    145ms             │
│ ├─ p95 Response Time:    1.2s              │
│ ├─ Cache Hit Rate:       92%               │
│ └─ Error Rate:           0.05%             │
│                                             │
│ Last Updated: 2026-01-15 10:30:00 UTC     │
└─────────────────────────────────────────────┘
```

#### **Integration Performance Dashboard**

```
┌─────────────────────────────────────────────┐
│ Integration Performance - Last 24 Hours    │
├─────────────────────────────────────────────┤
│                                             │
│ Top 10 Most Used Services:                 │
│ 1. Anthropic AI       15,234 requests      │
│ 2. OpenAI             12,456 requests      │
│ 3. GitHub API          8,901 requests      │
│ 4. LiteLLM             6,789 requests      │
│ 5. Azure OpenAI        5,432 requests      │
│ 6. Stripe              3,210 requests      │
│ 7. Mixpanel            2,987 requests      │
│ 8. LlamaIndex          2,543 requests      │
│ 9. PostHog             2,108 requests      │
│ 10. Segment            1,876 requests      │
│                                             │
│ Cache Performance:                          │
│ ├─ Hits:               45,678              │
│ ├─ Misses:             4,321               │
│ ├─ Hit Rate:           91.4% ✅            │
│ └─ Size:               456/500 entries     │
│                                             │
│ Error Summary:                              │
│ ├─ Total Errors:       12                  │
│ ├─ Error Rate:         0.02% ✅            │
│ └─ Services Affected:  2                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔍 Log Monitoring

### Important Log Patterns to Monitor

#### **Success Patterns (Normal Operations)**

```
[INFO] llamaindex-request - status: success - duration: 145ms
[INFO] cache-hit - service: llamaindex - key: llamaindex:query:...
[INFO] circuit-breaker - service: stripe - state: CLOSED - failures: 0
```

#### **Warning Patterns (Investigate)**

```
[WARN] high-response-time - service: azure_openai - duration: 4500ms
[WARN] cache-miss - service: haystack - key: haystack:query:...
[WARN] circuit-breaker - service: replicate - state: HALF_OPEN
```

#### **Error Patterns (Immediate Action)**

```
[ERROR] llamaindex-request - status: error - error: API timeout
[ERROR] circuit-breaker - service: stripe - state: OPEN - failures: 5
[ERROR] payment-failed - service: paypal - error: Invalid credentials
```

### Log Monitoring Commands

```bash
# Monitor real-time logs
pm2 logs zekka

# Filter for errors only
pm2 logs zekka --err

# Filter for specific service
pm2 logs zekka | grep "llamaindex"

# Count errors in last hour
pm2 logs zekka --nostream | grep ERROR | grep "$(date '+%Y-%m-%d %H')" | wc -l

# Monitor circuit breaker state changes
pm2 logs zekka | grep "circuit-breaker" | grep "OPEN"
```

---

## 📈 Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **Avg Response Time** | <200ms | <1s | >3s |
| **p95 Response Time** | <2s | <5s | >10s |
| **p99 Response Time** | <5s | <10s | >15s |
| **Cache Hit Rate** | >90% | >80% | <70% |
| **Error Rate** | <0.1% | <1% | >5% |
| **Circuit Breaker Trips** | 0/hour | <1/hour | >5/hour |
| **Uptime** | 99.9% | 99.5% | <99% |

### Load Testing Results

```
Artillery Load Test Results (1000 RPS):
─────────────────────────────────────────
Scenarios launched:    60,000
Scenarios completed:   59,994 (99.99%)
Requests completed:    59,994
Mean response time:    187ms
p95 response time:     1.8s
p99 response time:     4.2s
Error rate:            0.01%

Status: ✅ PASSED
```

---

## 🔔 Notification Channels

### Recommended Setup

**Slack Integration:**
```bash
# Install webhook integration
# Configure webhook URL in .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Test notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Zekka Health Check: All systems operational ✅",
    "username": "Zekka Monitor",
    "icon_emoji": ":robot_face:"
  }'
```

**Email Alerts:**
```bash
# Configure SendGrid or SMTP
SENDGRID_API_KEY=SG.xxx
ALERT_EMAIL=ops@yourcompany.com

# Test email alert
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "ops@yourcompany.com"}]}],
    "from": {"email": "alerts@yourcompany.com"},
    "subject": "Zekka Alert: Circuit Breaker Open",
    "content": [{"type": "text/plain", "value": "Service: stripe - Status: OPEN"}]
  }'
```

---

## 📝 Checklist: Daily Monitoring Tasks

### Morning Check (Start of Day)

- [ ] Review overnight health check logs
- [ ] Check all 82 circuit breakers are CLOSED
- [ ] Verify cache hit rate is >85%
- [ ] Review error logs for patterns
- [ ] Check service availability (all services "healthy" or "not_configured")
- [ ] Review performance metrics against benchmarks
- [ ] Check for any open alerts

### Ongoing Monitoring (Throughout Day)

- [ ] Monitor real-time logs for errors
- [ ] Track response times and latency
- [ ] Watch for circuit breaker state changes
- [ ] Monitor external API quota usage
- [ ] Track cache performance
- [ ] Review request volume patterns

### Evening Check (End of Day)

- [ ] Generate daily health report
- [ ] Review error summary and resolution
- [ ] Check for any configuration drift
- [ ] Verify all critical services operational
- [ ] Plan maintenance windows if needed
- [ ] Document any incidents or anomalies

---

## 🎓 Next Steps

1. **Enable Health Checks** - Set up automated health check monitoring
2. **Configure Alerts** - Implement critical and warning alerts
3. **Create Dashboards** - Set up monitoring dashboards
4. **Train Team** - Ensure team understands monitoring procedures
5. **Test Alerts** - Verify alert notifications work correctly
6. **Document Runbooks** - Create incident response procedures

---

*Document Version: 1.0*  
*Last Updated: January 15, 2026*  
*Status: Production Ready*
