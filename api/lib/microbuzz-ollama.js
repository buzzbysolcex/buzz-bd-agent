/**
 * MicroBuzz v2 — Ollama Client + Prompt Builder
 * ADR-010 | qwen3:14b | localhost:11434 ONLY
 *
 * Each LLM agent gets a unique Ollama call with full context.
 * No caching between agents. Temperature 0.7 for diversity.
 */

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen3:14b';
const TEMPERATURE = 0.7;
const TIMEOUT_MS = 120000; // 2 min per agent (generous for CPU inference)

/**
 * Check if Ollama is running and model is loaded
 * @returns {Object} health status
 */
async function checkOllamaHealth() {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!resp.ok) return { healthy: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    const hasModel = models.some(m => m.includes('qwen3'));
    return {
      healthy: true,
      models,
      has_qwen3: hasModel,
      ready: hasModel
    };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

/**
 * Query a single LLM agent via Ollama
 * @param {Object} agentProfile - from microbuzz-agents.js
 * @param {string} userPrompt - built by buildUserPrompt
 * @returns {Object} parsed decision { direction, conviction, amount, reasoning }
 */
async function queryAgent(agentProfile, userPrompt) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: agentProfile.system_prompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        think: false, // qwen3 thinking mode OFF — direct JSON output
        options: {
          temperature: TEMPERATURE,
          num_predict: 200
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      return { success: false, error: `Ollama HTTP ${resp.status}`, direction: 'NOTHING', amount: 0 };
    }

    const data = await resp.json();
    const raw = data.message?.content || '';
    const parsed = parseResponse(raw, agentProfile);

    return {
      success: true,
      ...parsed,
      raw_response: raw.slice(0, 500),
      eval_count: data.eval_count || 0,
      duration_ms: Math.round((data.total_duration || 0) / 1e6)
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      direction: 'NOTHING',
      conviction: 0,
      amount: 0,
      reasoning: `Agent ${agentProfile.id} failed: ${e.message}`
    };
  }
}

/**
 * Parse raw Ollama response into structured decision
 * Handles JSON extraction from potentially messy LLM output
 */
function parseResponse(raw, agentProfile) {
  // Try to extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    return {
      direction: 'NOTHING',
      conviction: 0,
      amount: 0,
      reasoning: 'Failed to parse JSON from response'
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate direction
    let direction = (parsed.direction || '').toUpperCase();
    if (!['YES', 'NO', 'NOTHING'].includes(direction)) {
      direction = 'NOTHING';
    }

    // Validate conviction
    let conviction = parseFloat(parsed.conviction) || 0.5;
    conviction = Math.max(0, Math.min(1, conviction));

    // Validate amount within agent's risk range
    let amount = parseFloat(parsed.amount) || 0;
    if (direction !== 'NOTHING') {
      amount = Math.max(agentProfile.trade_min, Math.min(agentProfile.trade_max, amount));

      // Check if edge meets minimum threshold
      const edge = Math.abs(conviction - 0.5);
      if (edge < agentProfile.min_edge) {
        direction = 'NOTHING';
        amount = 0;
      }
    } else {
      amount = 0;
    }

    return {
      direction,
      conviction,
      amount,
      reasoning: (parsed.reasoning || '').slice(0, 300)
    };
  } catch {
    return {
      direction: 'NOTHING',
      conviction: 0,
      amount: 0,
      reasoning: 'JSON parse error'
    };
  }
}

/**
 * Stop the model to release RAM
 */
async function stopModel() {
  try {
    // Ollama keeps model in memory. Send a generate with keep_alive=0 to unload.
    await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: '',
        keep_alive: 0
      }),
      signal: AbortSignal.timeout(10000)
    });
    return { success: true, message: 'Model unloaded' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  checkOllamaHealth,
  queryAgent,
  parseResponse,
  stopModel,
  MODEL,
  OLLAMA_URL
};
