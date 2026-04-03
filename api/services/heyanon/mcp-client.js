/**
 * HeyAnon MCP Client — Brain #2
 * Conversational MCP: 22 tools, 51 protocols, 18 chains
 * One `ask` tool routes to all protocols internally.
 * Buzz decides WHAT. HeyAnon decides HOW.
 */

const { feature } = require('../../lib/feature-flags');

let connected = false;
let cachedProjects = null;

/**
 * Parse SSE response text — extract result.content[0].text from `data: {...}` lines
 */
function parseSSE(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.result && payload.result.content && payload.result.content[0]) {
          return payload.result.content[0].text;
        }
      } catch (_) {
        // skip non-JSON data lines
      }
    }
  }
  return null;
}

/**
 * Send a tools/call request to HeyAnon MCP
 */
async function mcpCall(toolName, args = {}) {
  const endpoint = process.env.HEYANON_ENDPOINT;
  const apiKey = process.env.HEYANON_API_KEY;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  const text = await res.text();
  return parseSSE(text);
}

/**
 * Initialize HeyAnon MCP connection.
 * Checks env var, pings endpoint, caches protocol list, logs status.
 * Returns boolean. Fails gracefully (warn, don't crash).
 */
async function initHeyAnon() {
  try {
    if (!process.env.HEYANON_API_KEY) {
      console.warn('[HeyAnon] ⚠️ HEYANON_API_KEY not set — skipping init');
      return false;
    }
    if (!process.env.HEYANON_ENDPOINT) {
      console.warn('[HeyAnon] ⚠️ HEYANON_ENDPOINT not set — skipping init');
      return false;
    }

    // Ping endpoint
    const pong = await pingHeyAnon();
    if (!pong) {
      console.warn('[HeyAnon] ⚠️ Ping failed — endpoint unreachable');
      return false;
    }

    // Cache protocol list
    try {
      const projectsResult = await mcpCall('projects');
      if (projectsResult) {
        cachedProjects = projectsResult;
      }
    } catch (e) {
      console.warn('[HeyAnon] ⚠️ Failed to cache projects:', e.message);
    }

    connected = true;
    console.log('[HeyAnon] ✓ MCP connected — 51 protocols available');
    return true;
  } catch (e) {
    console.warn('[HeyAnon] ⚠️ Init failed:', e.message);
    connected = false;
    return false;
  }
}

/**
 * Ask HeyAnon a question via the "ask" tool.
 * Feature-gated behind HEYANON_MCP.
 */
async function askHeyAnon(message) {
  if (!feature('HEYANON_MCP')) {
    throw new Error('HEYANON_MCP feature flag is disabled');
  }
  if (!message || typeof message !== 'string') {
    throw new Error('message must be a non-empty string');
  }

  const result = await mcpCall('ask', { text: message });
  if (result) {
    connected = true;
  }
  return result;
}

/**
 * Get cached list of 51 protocols.
 * Calls "projects" tool once on init, returns cache on subsequent calls.
 */
async function getProjects() {
  if (cachedProjects) return cachedProjects;

  const result = await mcpCall('projects');
  if (result) {
    cachedProjects = result;
  }
  return cachedProjects;
}

/**
 * Ping HeyAnon MCP. Returns boolean.
 */
async function pingHeyAnon() {
  try {
    const result = await mcpCall('ping');
    const ok = result !== null;
    connected = ok;
    return ok;
  } catch (e) {
    connected = false;
    return false;
  }
}

/**
 * Check if HeyAnon MCP is connected (based on last successful ping).
 */
function isConnected() {
  return connected;
}

module.exports = { initHeyAnon, askHeyAnon, getProjects, pingHeyAnon, isConnected };
