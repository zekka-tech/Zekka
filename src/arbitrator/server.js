require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const ContextBus = require('../shared/context-bus');

/**
 * Arbitrator Agent - AI-powered conflict resolution
 * Receives GitHub webhooks and resolves merge conflicts automatically
 */

const app = express();
const PORT = process.env.PORT || 3001;

let contextBus;

// Initialize Context Bus
async function initialize() {
  contextBus = new ContextBus({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  });
  await contextBus.connect();
  console.log('✅ Arbitrator Agent initialized');
}

// Middleware
app.use(express.json());

// Verify GitHub webhook signature
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.WEBHOOK_SECRET || 'default-secret-change-me';
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

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
      console.log(`✅ Conflict resolved automatically`);
      await postComment(pull_request, `🤖 **Arbitrator Agent**: Conflict resolved automatically\n\n${resolution.explanation}`);
    } else {
      console.log(`❌ Could not auto-resolve, manual intervention required`);
      await postComment(pull_request, `🤖 **Arbitrator Agent**: Unable to automatically resolve conflict. Manual review required.\n\n**Reason**: ${resolution.reason}`);
    }
  } else {
    console.log(`✅ No conflicts in PR #${pull_request.number}`);
  }
}

async function handlePush(payload) {
  const { ref, commits, repository } = payload;
  console.log(`📦 Push to ${ref} in ${repository.full_name}: ${commits.length} commits`);
  
  // Could track agent commits here
}

async function resolveConflict(conflictId, pullRequest) {
  try {
    // Get conflict details
    const conflict = await contextBus.getConflict(conflictId);
    
    // Use AI to resolve (Ollama or Claude)
    const model = process.env.ANTHROPIC_API_KEY ? 'claude' : 'ollama';
    const resolution = await queryAI(model, {
      task: 'resolve_conflict',
      conflict,
      pullRequest
    });

    // Update conflict status
    await contextBus.updateConflictStatus(conflictId, 'resolved', resolution);

    return {
      success: true,
      explanation: resolution.explanation,
      resolvedBy: model
    };
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

async function queryAI(model, data) {
  if (model === 'claude' && process.env.ANTHROPIC_API_KEY) {
    // Use Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert code arbitrator. Analyze this merge conflict and provide a resolution:\n\n${JSON.stringify(data, null, 2)}`
        }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    return {
      explanation: response.data.content[0].text,
      model: 'claude-3-5-sonnet'
    };
  } else {
    // Use local Ollama
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const response = await axios.post(`${ollamaHost}/api/generate`, {
      model: 'llama3.1:8b',
      prompt: `You are an expert code arbitrator. Analyze this merge conflict and provide a resolution:\n\n${JSON.stringify(data, null, 2)}`,
      stream: false
    });

    return {
      explanation: response.data.response,
      model: 'llama3.1:8b'
    };
  }
}

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
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
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
