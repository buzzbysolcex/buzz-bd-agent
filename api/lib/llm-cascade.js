/**
 * 3-Tier LLM Cascade — MiniMax → Bankr → Anthropic
 * Day 32B — LLM Provider Resilience
 *
 * PRIMARY:   MiniMax M2.7 (orchestrator)
 * FALLBACK1: Bankr gemini-3-flash (orchestrator) / gpt-5-nano (sub-agents)
 * FALLBACK2: Anthropic claude-haiku-4.5 (emergency only)
 *
 * Sub-agents always use bankr/gpt-5-nano (FREE).
 */

const https = require('https');
const { getDB } = require('../db');

const PROVIDERS = {
  minimax: {
    name: 'minimax',
    model: 'MiniMax-M2.7',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    keyEnv: 'MINIMAX_API_KEY',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    priority: 1,
  },
  bankr: {
    name: 'bankr',
    model: 'gemini-3-flash',
    endpoint: 'https://llm.bankr.bot/v1/chat/completions',
    keyEnv: 'BANKR_LLM_KEY',
    keyEnvFallback: 'BANKR_API_KEY',
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

// Adaptive cascade: track timeouts per provider per hour
const timeoutTracker = {}; // { provider: { hour: count } }
const TIMEOUT_THRESHOLD_PCT = 30; // if >30% of calls timeout, auto-switch
const ADAPTIVE_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
let adaptiveOverride = null; // { provider: 'bankr', until: timestamp }

// Timeout settings (Fix 1)
const ORCHESTRATOR_TIMEOUT_MS = 30000; // 30s for first attempt (M2.7 avg 12.9s)
const RETRY_TIMEOUT_MS = 20000;        // 20s for retry attempt
const FALLBACK_TIMEOUT_MS = 30000;     // 30s for fallback providers

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

function trackTimeout(providerName) {
  const hour = new Date().toISOString().slice(0, 13); // "2026-03-20T01"
  if (!timeoutTracker[providerName]) timeoutTracker[providerName] = {};
  timeoutTracker[providerName][hour] = (timeoutTracker[providerName][hour] || 0) + 1;

  // Clean old hours
  const keys = Object.keys(timeoutTracker[providerName]);
  if (keys.length > 6) {
    keys.slice(0, keys.length - 6).forEach(k => delete timeoutTracker[providerName][k]);
  }
}

function getTimeoutStats() {
  const stats = {};
  for (const [provider, hours] of Object.entries(timeoutTracker)) {
    stats[provider] = { ...hours };
  }
  return { timeouts: stats, adaptiveOverride };
}

function checkAdaptiveCascade(providerName) {
  // Check if provider's timeout rate exceeds threshold this hour
  const hour = new Date().toISOString().slice(0, 13);
  const timeouts = timeoutTracker[providerName]?.[hour] || 0;
  const tracker = failureTracker[providerName];
  const totalAttempts = (tracker?.failures?.length || 0) + timeouts + 5; // +5 baseline to avoid div/0 on few calls

  if (timeouts > 3 && (timeouts / totalAttempts) * 100 > TIMEOUT_THRESHOLD_PCT) {
    adaptiveOverride = { provider: 'bankr', until: Date.now() + ADAPTIVE_COOLDOWN_MS };
    console.warn(`[LLM Cascade] ADAPTIVE: ${providerName} timeout rate ${Math.round(timeouts/totalAttempts*100)}% > ${TIMEOUT_THRESHOLD_PCT}% — switching to Bankr for 2h`);
  }
}

function getProviderCascade(agentName) {
  // Sub-agents and sim agents always use Bankr (FREE) — NEVER cascade to paid
  const subAgents = ['scanner-agent', 'safety-agent', 'wallet-agent', 'social-agent', 'scorer-agent'];
  if (subAgents.includes(agentName) || agentName?.startsWith('sim-') || agentName?.startsWith('interview-') || agentName === 'debate-analyst') {
    return [{ ...PROVIDERS.bankr, model: 'gpt-5-nano' }];
  }

  // Check adaptive override: if M2.7 is timing out too much, lead with Bankr
  if (adaptiveOverride && Date.now() < adaptiveOverride.until) {
    console.log(`[LLM Cascade] Adaptive override active — Bankr primary until ${new Date(adaptiveOverride.until).toISOString()}`);
    return [PROVIDERS.bankr, PROVIDERS.minimax, PROVIDERS.anthropic]
      .filter(p => !isInCooldown(p.name));
  }
  if (adaptiveOverride && Date.now() >= adaptiveOverride.until) {
    console.log('[LLM Cascade] Adaptive override expired — M2.7 primary restored');
    adaptiveOverride = null;
  }

  // Normal cascade
  return [PROVIDERS.minimax, PROVIDERS.bankr, PROVIDERS.anthropic]
    .filter(p => !isInCooldown(p.name));
}

async function callProvider(provider, body, timeout = 120000) {
  const apiKey = process.env[provider.keyEnv] || (provider.keyEnvFallback && process.env[provider.keyEnvFallback]);
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
 * Log a provider call attempt to llm_provider_log table.
 * Wrapped in try/catch so logging failures never break LLM calls.
 */
function logProviderCall({ provider, model, agent, tokens_in, tokens_out, latency_ms, success, error_message }) {
  try {
    const db = getDB();
    db.prepare(`
      INSERT INTO llm_provider_log (provider, model, agent, tokens_in, tokens_out, latency_ms, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      provider,
      model,
      agent || 'orchestrator',
      tokens_in || 0,
      tokens_out || 0,
      latency_ms || 0,
      success ? 1 : 0,
      error_message || null
    );
  } catch (e) {
    // Never let logging break the LLM call
    console.warn(`[LLM Cascade] Provider log write failed: ${e.message}`);
  }
}

/**
 * Main cascade function — tries each provider in order
 */
async function cascadeCall(body, options = {}) {
  const { agent = 'orchestrator', logFn = null } = options;
  const providers = getProviderCascade(agent);

  // Verbosity guard: M2.7 uses <thinking> blocks that burn tokens.
  // Default max_tokens to 2000 unless caller explicitly sets it.
  if (!body.max_tokens) {
    body = { ...body, max_tokens: 2000 };
  }

  if (providers.length === 0) {
    throw new Error('All LLM providers in cooldown');
  }

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const isPrimary = i === 0 && provider.name === 'minimax';

    // Fix 1: Use shorter timeouts — 15s for M2.7 primary, 30s for fallbacks
    const timeout = isPrimary ? ORCHESTRATOR_TIMEOUT_MS : FALLBACK_TIMEOUT_MS;

    const startTime = Date.now();
    try {
      const result = await callProvider(provider, body, timeout);
      result.latency_ms = Date.now() - startTime;

      logProviderCall({
        provider: provider.name, model: provider.model, agent,
        tokens_in: result.usage?.prompt_tokens || 0,
        tokens_out: result.usage?.completion_tokens || 0,
        latency_ms: result.latency_ms, success: true,
      });
      if (logFn) logFn({ provider: provider.name, model: provider.model, agent, prompt_tokens: result.usage?.prompt_tokens || 0, completion_tokens: result.usage?.completion_tokens || 0, latency_ms: result.latency_ms, success: true });

      return result;
    } catch (err) {
      const latency = Date.now() - startTime;
      const isTimeout = err.message?.includes('Timeout') || err.message?.includes('timeout');

      // Fix 2: If M2.7 timed out, retry ONCE with shorter timeout before falling to Bankr
      if (isPrimary && isTimeout) {
        console.warn(`[LLM Cascade] ${provider.name} timeout (${latency}ms) — retrying with ${RETRY_TIMEOUT_MS}ms...`);
        trackTimeout(provider.name);

        logProviderCall({
          provider: provider.name, model: provider.model, agent,
          latency_ms: latency, success: false, error_message: `timeout_attempt_1 (${latency}ms)`,
        });

        const retryStart = Date.now();
        try {
          const retryResult = await callProvider(provider, body, RETRY_TIMEOUT_MS);
          retryResult.latency_ms = Date.now() - retryStart;

          logProviderCall({
            provider: provider.name, model: provider.model, agent,
            tokens_in: retryResult.usage?.prompt_tokens || 0,
            tokens_out: retryResult.usage?.completion_tokens || 0,
            latency_ms: retryResult.latency_ms, success: true,
          });
          console.log(`[LLM Cascade] ${provider.name} retry succeeded (${retryResult.latency_ms}ms)`);
          return retryResult;
        } catch (retryErr) {
          const retryLatency = Date.now() - retryStart;
          console.warn(`[LLM Cascade] ${provider.name} retry also failed (${retryLatency}ms) — falling to next provider`);
          trackTimeout(provider.name);
          trackFailure(provider.name);

          logProviderCall({
            provider: provider.name, model: provider.model, agent,
            latency_ms: retryLatency, success: false, error_message: `timeout_attempt_2 (${retryLatency}ms)`,
          });

          // Fix 3: Check if we should adaptively switch
          checkAdaptiveCascade(provider.name);
          continue;
        }
      }

      // Non-timeout failure or non-primary — standard cascade
      console.warn(`[LLM Cascade] ${provider.name}/${provider.model} failed: ${err.message}`);
      trackFailure(provider.name);
      if (isTimeout) trackTimeout(provider.name);

      logProviderCall({
        provider: provider.name, model: provider.model, agent,
        latency_ms: latency, success: false, error_message: err.message,
      });
      if (logFn) logFn({ provider: provider.name, model: provider.model, agent, latency_ms: latency, success: false, error_message: err.message });
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

module.exports = { cascadeCall, getCascadeStatus, getProviderCascade, getTimeoutStats, PROVIDERS, trackFailure, isInCooldown };
