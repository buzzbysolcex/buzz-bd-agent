/**
 * 3-Tier LLM Cascade — MiniMax → Bankr → Anthropic
 * Day 32B — LLM Provider Resilience
 *
 * PRIMARY:   MiniMax M2.5 (orchestrator)
 * FALLBACK1: Bankr gemini-3-flash (orchestrator) / gpt-5-nano (sub-agents)
 * FALLBACK2: Anthropic claude-haiku-4.5 (emergency only)
 *
 * Sub-agents always use bankr/gpt-5-nano (FREE).
 */

const https = require('https');

const PROVIDERS = {
  minimax: {
    name: 'minimax',
    model: 'MiniMax-M2.5',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    keyEnv: 'MINIMAX_API_KEY',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    priority: 1,
  },
  bankr: {
    name: 'bankr',
    model: 'gemini-3-flash',
    endpoint: 'https://api.bankr.chat/v1/chat/completions',
    keyEnv: 'BANKR_API_KEY',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    priority: 2,
  },
  anthropic: {
    name: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    headerKey: 'x-api-key',
    headerPrefix: '',
    priority: 3,
    isAnthropic: true,
  },
};

// Track failures: skip provider after 3 failures in 5 min for 30 min cooldown
const failureTracker = {};
const FAILURE_WINDOW_MS = 5 * 60 * 1000;
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 60 * 1000;

function trackFailure(providerName) {
  const now = Date.now();
  if (!failureTracker[providerName]) {
    failureTracker[providerName] = { failures: [], cooldownUntil: 0 };
  }
  const tracker = failureTracker[providerName];
  tracker.failures.push(now);
  // Keep only failures within window
  tracker.failures = tracker.failures.filter(t => now - t < FAILURE_WINDOW_MS);

  if (tracker.failures.length >= FAILURE_THRESHOLD) {
    tracker.cooldownUntil = now + COOLDOWN_MS;
    console.warn(`[LLM Cascade] ${providerName} hit ${FAILURE_THRESHOLD} failures — cooldown until ${new Date(tracker.cooldownUntil).toISOString()}`);
  }
}

function isInCooldown(providerName) {
  const tracker = failureTracker[providerName];
  if (!tracker) return false;
  if (Date.now() < tracker.cooldownUntil) return true;
  return false;
}

function getProviderCascade(agentName) {
  // Sub-agents always use Bankr (FREE)
  const subAgents = ['scanner-agent', 'safety-agent', 'wallet-agent', 'social-agent', 'scorer-agent'];
  if (subAgents.includes(agentName)) {
    return [{ ...PROVIDERS.bankr, model: 'gpt-5-nano' }];
  }

  // Orchestrator uses full cascade
  return [PROVIDERS.minimax, PROVIDERS.bankr, PROVIDERS.anthropic]
    .filter(p => !isInCooldown(p.name));
}

async function callProvider(provider, body, timeout = 120000) {
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) throw new Error(`${provider.keyEnv} not configured`);

  const { URL } = require('url');
  const url = new URL(provider.endpoint);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (provider.isAnthropic) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers[provider.headerKey] = `${provider.headerPrefix}${apiKey}`;
  }

  // Transform body for Anthropic format if needed
  let requestBody = { ...body, model: provider.model };
  if (provider.isAnthropic && body.messages) {
    // Convert OpenAI format to Anthropic format
    const systemMsg = body.messages.find(m => m.role === 'system');
    const nonSystemMsgs = body.messages.filter(m => m.role !== 'system');
    requestBody = {
      model: provider.model,
      max_tokens: body.max_tokens || 4096,
      system: systemMsg?.content || '',
      messages: nonSystemMsgs,
    };
  }

  const bodyStr = JSON.stringify(requestBody);
  headers['Content-Length'] = Buffer.byteLength(bodyStr);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers,
      timeout,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(raw); } catch { reject(new Error(`Parse error from ${provider.name}`)); return; }

        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || raw.slice(0, 200)}`));
          return;
        }

        // Normalize response
        let content, usage;
        if (provider.isAnthropic) {
          content = parsed.content?.[0]?.text || '';
          usage = { prompt_tokens: parsed.usage?.input_tokens || 0, completion_tokens: parsed.usage?.output_tokens || 0 };
        } else {
          content = parsed.choices?.[0]?.message?.content || '';
          usage = parsed.usage || {};
        }

        resolve({
          content,
          provider: provider.name,
          model: provider.model,
          usage,
          latency_ms: 0, // caller should measure
        });
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout from ${provider.name}`)); });
    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Main cascade function — tries each provider in order
 */
async function cascadeCall(body, options = {}) {
  const { agent = 'orchestrator', logFn = null } = options;
  const providers = getProviderCascade(agent);

  if (providers.length === 0) {
    throw new Error('All LLM providers in cooldown');
  }

  for (const provider of providers) {
    const startTime = Date.now();
    try {
      const result = await callProvider(provider, body);
      result.latency_ms = Date.now() - startTime;

      if (logFn) {
        logFn({
          provider: provider.name,
          model: provider.model,
          agent,
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          latency_ms: result.latency_ms,
          success: true,
        });
      }

      return result;
    } catch (err) {
      console.warn(`[LLM Cascade] ${provider.name}/${provider.model} failed: ${err.message}`);
      trackFailure(provider.name);

      if (logFn) {
        logFn({
          provider: provider.name,
          model: provider.model,
          agent,
          latency_ms: Date.now() - startTime,
          success: false,
          error_message: err.message,
        });
      }
      continue;
    }
  }

  throw new Error(`All LLM providers failed for agent=${agent}`);
}

function getCascadeStatus() {
  const status = {};
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const tracker = failureTracker[name] || { failures: [], cooldownUntil: 0 };
    const inCooldown = isInCooldown(name);
    status[name] = {
      model: provider.model,
      priority: provider.priority,
      configured: !!process.env[provider.keyEnv],
      in_cooldown: inCooldown,
      cooldown_until: inCooldown ? new Date(tracker.cooldownUntil).toISOString() : null,
      recent_failures: tracker.failures.length,
    };
  }
  return status;
}

module.exports = { cascadeCall, getCascadeStatus, getProviderCascade, PROVIDERS, trackFailure, isInCooldown };
