# Zekka Framework - Model Architecture

## Overview

The Zekka Framework uses a sophisticated multi-model architecture where different AI models are assigned to different components based on their strengths and use cases. This document explains the model selection strategy, fallback mechanisms, and configuration options.

## Model Hierarchy

### Component Assignments

| Component | Primary Model | Fallback Model | Rationale |
|-----------|--------------|----------------|-----------|
| **Arbitrator** | Claude Sonnet 4.5 | Ollama (llama3.1:8b) | Superior reasoning for complex code conflicts |
| **Orchestrator** | Gemini Pro | Ollama (llama3.1:8b) | Cost-effective for high-volume coordination |
| **General Agents** | Dynamic (Token Economics) | Ollama (llama3.1:8b) | Selected based on task complexity and budget |

### Why These Models?

#### Arbitrator → Claude Sonnet 4.5

The Arbitrator handles conflict resolution, which requires:
- Advanced reasoning capabilities
- Deep code understanding
- Critical decision-making under ambiguity
- High-stakes merge conflict resolution

**Claude Sonnet 4.5** is chosen because:
- Superior reasoning for complex code conflicts
- Better at understanding developer intent
- More reliable for critical decisions
- Excellent at explaining its reasoning process

**Cost**: $3 per 1M input tokens, $15 per 1M output tokens

#### Orchestrator → Gemini Pro

The Orchestrator handles workflow coordination, which requires:
- Project planning and task breakdown
- Agent coordination and scheduling
- Resource allocation
- High-volume API calls

**Gemini Pro** is chosen because:
- Extremely cost-effective ($0.125 per 1M input tokens)
- Fast response times (important for workflow decisions)
- Good balance of quality and cost
- Excellent at structured output (JSON, lists, etc.)
- High rate limits on free tier

**Cost**: $0.125 per 1M input tokens, $0.375 per 1M output tokens

#### Universal Fallback → Ollama

**Ollama (llama3.1:8b)** is the universal fallback because:
- Always available (runs locally)
- Zero API costs
- No rate limits
- Works offline
- Suitable for development/testing
- Good performance for simpler tasks

**Cost**: Minimal computational cost only

## Fallback Strategy

### When Fallback Occurs

Automatic fallback to Ollama happens when:

1. **API Unavailable**: Primary model API is down or unreachable
2. **Budget Exceeded**: Daily or monthly budget limits reached
3. **Rate Limits**: API rate limits exceeded
4. **Network Issues**: Network connectivity problems
5. **API Key Missing**: Required API key not configured
6. **Circuit Breaker Open**: Too many failures detected

### Fallback Chain

```
Primary Model (Claude/Gemini)
         ↓ (on failure)
    Ollama (Local)
         ↓ (on failure)
    Error (All systems failed)
```

### Fallback Logging

All fallback events are logged with:
- Timestamp
- Component name (arbitrator/orchestrator)
- Reason for fallback
- Model used
- Performance metrics

Access fallback statistics via:
```javascript
const stats = modelClient.getStats();
console.log(stats.fallbackCount);
// { arbitrator: 5, orchestrator: 12 }
```

## Configuration

### Environment Variables

#### Model Assignment

```bash
# Arbitrator Model (Conflict Resolution)
ARBITRATOR_MODEL=claude-sonnet-4-5

# Orchestrator Model (Workflow Coordination)
ORCHESTRATOR_MODEL=gemini-pro

# Fallback Model (Universal)
FALLBACK_MODEL=llama3.1:8b
```

#### API Keys

```bash
# Anthropic Claude API (Required for Arbitrator)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Google Gemini API (Required for Orchestrator)
GEMINI_API_KEY=AIzaSy-your-key-here

# Ollama (No API key needed)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

#### Gemini Configuration

```bash
# Model Selection
GEMINI_MODEL=gemini-pro

# Performance Tuning
GEMINI_TEMPERATURE=0.7              # 0.0-1.0
GEMINI_MAX_OUTPUT_TOKENS=8192       # Max response length
GEMINI_TOP_P=0.95                   # Nucleus sampling
GEMINI_TOP_K=40                     # Top-k sampling

# Safety Settings
GEMINI_SAFETY_HARASSMENT=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_HATE_SPEECH=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_SEXUALLY_EXPLICIT=BLOCK_MEDIUM_AND_ABOVE
GEMINI_SAFETY_DANGEROUS=BLOCK_MEDIUM_AND_ABOVE
```

## Usage Examples

### Arbitrator (Conflict Resolution)

```javascript
const ModelClient = require('./src/services/model-client');

const modelClient = new ModelClient({
  logger: console,
  contextBus: contextBus
});

// Generate conflict resolution using Claude Sonnet 4.5
// Automatically falls back to Ollama if Claude is unavailable
const response = await modelClient.generateArbitratorResponse(
  `Analyze this merge conflict and provide resolution: ${conflictDetails}`,
  {
    taskId: 'conflict-123',
    maxTokens: 4000,
    temperature: 0.3  // Lower for deterministic decisions
  }
);

console.log(response.text);           // AI response
console.log(response.model);          // Model used (claude-sonnet-4-5 or llama3.1:8b)
console.log(response.fallbackUsed);   // true if fallback was used
```

### Orchestrator (Workflow Coordination)

```javascript
// Generate task execution plan using Gemini Pro
// Automatically falls back to Ollama if Gemini is unavailable
const response = await modelClient.generateOrchestratorResponse(
  `Create an execution plan for: ${taskDescription}`,
  {
    projectId: 'proj-456',
    taskId: 'task-789',
    maxTokens: 2000,
    temperature: 0.7  // Moderate for planning
  }
);

console.log(response.text);           // AI response
console.log(response.model);          // Model used (gemini-pro or llama3.1:8b)
console.log(response.fallbackUsed);   // true if fallback was used
console.log(response.usage);          // Token usage statistics
```

### Checking Model Availability

```javascript
const availability = await modelClient.checkModelAvailability();

console.log(availability);
// {
//   claude: { available: true, configured: true },
//   gemini: { available: true, configured: true },
//   ollama: { available: true, configured: true }
// }
```

## Cost Analysis

### Cost Comparison (per 1M tokens)

| Model | Input Cost | Output Cost | Total (1:1 ratio) | Use Case |
|-------|-----------|-------------|-------------------|----------|
| Claude Sonnet 4.5 | $3.00 | $15.00 | $18.00 | High-value decisions |
| Gemini Pro | $0.125 | $0.375 | $0.50 | High-volume operations |
| Ollama (llama3.1) | $0.00 | $0.00 | $0.00 | Fallback/Development |

### Example Project Cost

For a typical project with:
- 10 conflict resolutions (Arbitrator): ~40,000 tokens → **$0.72**
- 100 orchestration calls (Orchestrator): ~200,000 tokens → **$0.10**
- **Total: ~$0.82 per project**

With Ollama fallback:
- Same project with 50% fallback usage → **$0.41 per project**

### Budget-Driven Model Selection

The Token Economics module automatically selects models based on budget:

```javascript
// Normal budget (< 80% used)
// High complexity → claude-sonnet-4-5
// Medium complexity → gemini-pro
// Low complexity → ollama

// 80-95% budget used
// High complexity → gemini-pro
// Others → ollama

// 95%+ budget used
// All tasks → ollama
```

## Monitoring and Observability

### Fallback Events

Monitor fallback events to detect issues:

```javascript
const stats = modelClient.getStats();

// Check fallback frequency
if (stats.fallbackCount.arbitrator > 10) {
  console.warn('High fallback rate for Arbitrator - check Claude API');
}

// Check API client statistics
console.log(stats.apiClientStats);
// {
//   requestCount: { anthropic: 45, google: 123, ollama: 12 },
//   circuitBreakers: { ... }
// }
```

### Logging

All model calls are logged with:
- Component (arbitrator/orchestrator)
- Model used
- Token usage
- Cost
- Response time
- Fallback status

Example log:
```
🤖 Arbitrator generating response { primaryModel: 'claude-sonnet-4-5', promptLength: 1250 }
✅ Conflict conflict-123 resolved using claude-sonnet-4-5
```

Or with fallback:
```
🤖 Arbitrator generating response { primaryModel: 'claude-sonnet-4-5', promptLength: 1250 }
⚠️  Arbitrator primary model failed, falling back to Ollama { error: 'API rate limit exceeded' }
🔄 Using Ollama fallback for arbitrator
✅ Conflict conflict-123 resolved using llama3.1:8b (fallback)
```

## Performance Considerations

### Response Times (approximate)

| Model | Average Response Time | Use Case |
|-------|---------------------|----------|
| Claude Sonnet 4.5 | 2-5 seconds | Worth it for critical decisions |
| Gemini Pro | 1-3 seconds | Fast enough for coordination |
| Ollama (local) | 3-10 seconds | Depends on hardware |

### Optimization Tips

1. **Use appropriate token limits**: Don't request more tokens than needed
2. **Adjust temperature**: Lower for deterministic, higher for creative
3. **Cache when possible**: The API client caches GET requests
4. **Monitor fallback rate**: High fallback rate indicates issues
5. **Use Ollama for development**: Save API costs during testing

## Migration from Previous Architecture

### Before (Single Model)

```javascript
// Old approach - all components used same model
const model = 'ollama';
const response = await ollamaAPI.generate(prompt);
```

### After (Component-Specific Models)

```javascript
// New approach - each component has optimal model
const modelClient = new ModelClient({ /* config */ });

// Arbitrator uses Claude
const arbitratorResponse = await modelClient.generateArbitratorResponse(prompt);

// Orchestrator uses Gemini
const orchestratorResponse = await modelClient.generateOrchestratorResponse(prompt);
```

### Backward Compatibility

The old `tokenEconomics.selectModel()` method still works but now returns:
- `claude-sonnet-4-5` for high complexity (was `claude-sonnet-4`)
- `gemini-pro` for medium complexity (was `claude-haiku`)
- Ollama models for low complexity (unchanged)

## Troubleshooting

### Arbitrator Always Using Fallback

**Symptoms**: Arbitrator consistently uses Ollama instead of Claude

**Causes**:
1. ANTHROPIC_API_KEY not set
2. Invalid API key
3. Rate limit exceeded
4. Network issues

**Solution**:
```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'

# Check model client stats
node -e "const mc = require('./src/services/model-client'); mc.checkModelAvailability().then(console.log)"
```

### Orchestrator Always Using Fallback

**Symptoms**: Orchestrator consistently uses Ollama instead of Gemini

**Causes**:
1. GEMINI_API_KEY not set
2. Invalid API key
3. Safety settings blocking responses
4. Rate limit exceeded (unlikely with free tier)

**Solution**:
```bash
# Check API key is set
echo $GEMINI_API_KEY

# Test API key
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'

# Adjust safety settings if needed
GEMINI_SAFETY_HARASSMENT=BLOCK_ONLY_HIGH
```

### High Costs

**Symptoms**: Monthly costs exceeding budget

**Solutions**:
1. **Reduce DAILY_BUDGET** to force more Ollama usage
2. **Adjust FALLBACK_THRESHOLD** to switch earlier (default 80%)
3. **Use Ollama for development**: Set models to 'llama3.1:8b' in dev
4. **Review task complexity**: Ensure tasks aren't over-classified as 'high'

```bash
# Force aggressive cost optimization
DAILY_BUDGET=10
FALLBACK_THRESHOLD=50  # Switch to Ollama at 50% budget
```

## Future Enhancements

### Planned Features

1. **Dynamic Model Selection**: ML-based model selection based on task success rate
2. **Multi-Model Ensembling**: Use multiple models for critical decisions
3. **Custom Model Providers**: Support for custom OpenAI-compatible APIs
4. **Response Caching**: Cache identical prompts to reduce costs
5. **A/B Testing**: Compare model performance automatically

### Coming Soon

- **Gemini 1.5 Pro Support**: For very long contexts (1M tokens)
- **Claude Opus 4.5 Support**: For ultra-complex reasoning tasks
- **Local Model Training**: Fine-tune Ollama models on project data

## Support and Resources

### Documentation

- [Anthropic Claude API Docs](https://docs.anthropic.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Ollama Documentation](https://ollama.ai/docs)

### Getting API Keys

- **Anthropic**: https://console.anthropic.com/
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Ollama**: No API key needed (local installation)

### Contact

For issues or questions about the model architecture:
- GitHub Issues: https://github.com/zekka-tech/Zekka/issues
- Documentation: See README.md and .env.example

---

**Last Updated**: 2025-01-20
**Version**: 2.0.0
