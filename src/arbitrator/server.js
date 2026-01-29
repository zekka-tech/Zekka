require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const ContextBus = require('../shared/context-bus');
const ModelClient = require('../services/model-client');

/**
 * Arbitrator Agent - AI-powered conflict resolution
 * Receives GitHub webhooks and resolves merge conflicts automatically
 *
 * The Arbitrator uses Claude Sonnet 4.5 as its primary model for:
 * - Advanced reasoning in conflict resolution
 * - Superior code understanding
 * - Critical decision-making
 *
 * Falls back to Ollama when Claude is unavailable or budget is exceeded.
 */

const app = express();
const PORT = process.env.PORT || 3001;

let contextBus;
let modelClient;

// Initialize Context Bus and Model Client
async function initialize() {
  contextBus = new ContextBus({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  });
  await contextBus.connect();

  // Initialize Model Client for AI-powered conflict resolution
  // Arbitrator uses Claude Sonnet 4.5 by default with automatic fallback to Ollama
  modelClient = new ModelClient({
    logger: console,
    contextBus
  });

  console.log('✅ Arbitrator Agent initialized with Claude Sonnet 4.5');
}

// Middleware
app.use(express.json());

// Verify GitHub webhook signature
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('❌ WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'arbitrator',
    contextBus: contextBus?.isConnected() || false
  });
});

// GitHub webhook endpoint
app.post('/webhook/github', verifyWebhookSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`📨 Received GitHub event: ${event}`);

  try {
    if (event === 'pull_request') {
      await handlePullRequest(payload);
    } else if (event === 'push') {
      await handlePush(payload);
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handlePullRequest(payload) {
  const { action, pull_request } = payload;

  if (action !== 'opened' && action !== 'synchronize') {
    return; // Only process new PRs or updates
  }

  console.log(`🔍 Analyzing PR #${pull_request.number}: ${pull_request.title}`);

  // Check if PR has conflicts
  if (pull_request.mergeable === false) {
    console.log(`⚠️  Conflict detected in PR #${pull_request.number}`);

    // Record conflict in Context Bus
    const conflictId = await contextBus.recordConflict({
      taskId: `pr-${pull_request.number}`,
      prNumber: pull_request.number,
      prTitle: pull_request.title,
      repo: payload.repository.full_name,
      branch: pull_request.head.ref,
      baseBranch: pull_request.base.ref,
      files: pull_request.changed_files,
      url: pull_request.html_url
    });

    // Attempt automatic resolution
    const resolution = await resolveConflict(conflictId, pull_request);

    if (resolution.success) {
      console.log('✅ Conflict resolved automatically');
      await postComment(
        pull_request,
        `🤖 **Arbitrator Agent**: Conflict resolved automatically\n\n${resolution.explanation}`
      );
    } else {
      console.log('❌ Could not auto-resolve, manual intervention required');
      await postComment(
        pull_request,
        `🤖 **Arbitrator Agent**: Unable to automatically resolve conflict. Manual review required.\n\n**Reason**: ${resolution.reason}`
      );
    }
  } else {
    console.log(`✅ No conflicts in PR #${pull_request.number}`);
  }
}

async function handlePush(payload) {
  const { ref, commits, repository } = payload;
  console.log(
    `📦 Push to ${ref} in ${repository.full_name}: ${commits.length} commits`
  );

  // Could track agent commits here
}

async function resolveConflict(conflictId, pullRequest) {
  try {
    // Get conflict details
    const conflict = await contextBus.getConflict(conflictId);

    // Build detailed prompt for the Arbitrator AI
    // The Arbitrator uses Claude Sonnet 4.5 for advanced reasoning
    const prompt = `You are the Zekka Arbitrator, an expert code conflict resolver.

Analyze this merge conflict and provide a resolution:

Pull Request: #${pullRequest.number} - ${pullRequest.title}
Repository: ${pullRequest.base.repo.full_name}
Branch: ${pullRequest.head.ref} → ${pullRequest.base.ref}
Files Changed: ${pullRequest.changed_files}

Conflict Details:
${JSON.stringify(conflict, null, 2)}

Your task:
1. Analyze the conflicting changes
2. Understand the intent of both changes
3. Propose a resolution that preserves both intents if possible
4. Explain your reasoning

Respond with a JSON object containing:
- resolution: "merge" | "reject" | "manual"
- explanation: detailed explanation of your decision
- suggestedChanges: specific code changes if resolution is "merge"
- reasoning: step-by-step reasoning process`;

    // Use the Model Client to generate resolution
    // This automatically uses Claude Sonnet 4.5 with fallback to Ollama
    const response = await modelClient.generateArbitratorResponse(prompt, {
      taskId: conflictId,
      maxTokens: 4000,
      temperature: 0.3 // Lower temperature for deterministic decisions
    });

    // Parse the AI response (attempt JSON parse, fallback to raw text)
    let resolutionData;
    try {
      resolutionData = JSON.parse(response.text);
    } catch {
      resolutionData = {
        resolution: 'manual',
        explanation: response.text,
        reasoning: 'AI provided non-JSON response'
      };
    }

    // Update conflict status
    await contextBus.updateConflictStatus(conflictId, 'resolved', {
      ...resolutionData,
      modelUsed: response.model,
      fallbackUsed: response.fallbackUsed
    });

    console.log(
      `✅ Conflict ${conflictId} resolved using ${response.model}${response.fallbackUsed ? ' (fallback)' : ''}`
    );

    return {
      success: true,
      explanation: resolutionData.explanation,
      resolution: resolutionData.resolution,
      resolvedBy: response.model,
      fallbackUsed: response.fallbackUsed
    };
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

// NOTE: The queryAI function has been replaced by the ModelClient
// All AI calls now go through modelClient.generateArbitratorResponse()
// which handles:
// - Primary model selection (Claude Sonnet 4.5)
// - Automatic fallback to Ollama
// - Error handling and retry logic
// - Cost tracking
// - Logging and monitoring

async function postComment(pullRequest, comment) {
  if (!process.env.GITHUB_TOKEN) {
    console.log('⚠️  No GitHub token, skipping comment');
    return;
  }

  try {
    await axios.post(
      pullRequest.comments_url,
      { body: comment },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    console.log('✅ Posted comment to PR');
  } catch (error) {
    console.error('Error posting comment:', error.message);
  }
}

// Manual conflict resolution endpoint
app.post('/api/resolve/:conflictId', async (req, res) => {
  try {
    const { conflictId } = req.params;
    const conflict = await contextBus.getConflict(conflictId);

    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    const resolution = await resolveConflict(conflictId, conflict);
    res.json(resolution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List pending conflicts
app.get('/api/conflicts', async (req, res) => {
  try {
    const conflicts = await contextBus.getPendingConflicts();
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initialize().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Arbitrator Agent listening on http://0.0.0.0:${PORT}`);
    console.log(`📥 Webhook endpoint: http://localhost:${PORT}/webhook/github`);
  });
});
