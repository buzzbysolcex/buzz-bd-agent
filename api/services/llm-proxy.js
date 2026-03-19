/**
 * Buzz BD Agent — LLM Cost Logger Proxy
 * v7.5.5 | Transparent proxy to MiniMax with per-call cost logging
 *
 * - Forwards requests to MiniMax API
 * - Logs every call to llm_costs SQLite table (fire-and-forget)
 * - Uses native https module (no new dependencies)
 * - 120s timeout on MiniMax calls
 */

const https = require('https');
const { URL } = require('url');

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_ANTHROPIC_BASE = 'https://api.minimax.io/anthropic';

const PRICING = {
  'MiniMax-Text-02': { input: 0.55, output: 2.19 },
  'MiniMax-M2.5':    { input: 0.55, output: 2.19 },
  'bankr/gpt-5-nano':        { input: 0, output: 0 },
  'bankr/claude-haiku-4.5':  { input: 0, output: 0 },
};

const DEFAULT_PRICING = { input: 0.55, output: 2.19 };

class LLMProxy {
  constructor(db) {
    this.db = db;
    this.ensureTable();
  }

  ensureTable() {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS llm_costs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT (datetime('now')),
          model TEXT NOT NULL,
          caller TEXT DEFAULT 'unknown',
          prompt_tokens INTEGER DEFAULT 0,
          completion_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0.0,
          latency_ms INTEGER DEFAULT 0,
          status TEXT DEFAULT 'success',
          error_message TEXT,
          endpoint TEXT DEFAULT '/v1/chat/completions',
          cached_tokens INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_llm_costs_timestamp ON llm_costs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_llm_costs_model ON llm_costs(model);
        CREATE INDEX IF NOT EXISTS idx_llm_costs_caller ON llm_costs(caller);
      `);
    } catch (e) {
      // Table/indexes may already exist
    }
  }

  /**
   * Calculate cost in USD from token counts and model
   */
  calculateCost(model, promptTokens, completionTokens, cachedTokens) {
    const pricing = PRICING[model] || DEFAULT_PRICING;
    const inputCost = ((promptTokens - (cachedTokens || 0)) * pricing.input) / 1_000_000;
    const cachedCost = ((cachedTokens || 0) * pricing.input * 0.1) / 1_000_000; // cached tokens ~10% cost
    const outputCost = (completionTokens * pricing.output) / 1_000_000;
    return Math.max(0, inputCost + cachedCost + outputCost);
  }

  /**
   * Fire-and-forget DB logging — never blocks response
   */
  logCost(data) {
    try {
      const promptTok = Number(data.prompt_tokens) || 0;
      const completionTok = Number(data.completion_tokens) || 0;
      const cachedTok = Number(data.cached_tokens) || 0;
      // Recalculate cost to guarantee accuracy — don't trust caller's value alone
      let costValue = Number(data.cost_usd) || 0;
      if (costValue === 0 && promptTok + completionTok > 0) {
        costValue = this.calculateCost(data.model || 'unknown', promptTok, completionTok, cachedTok);
      }
      this.db.prepare(`
        INSERT INTO llm_costs (model, caller, prompt_tokens, completion_tokens, total_tokens, cost_usd, latency_ms, status, error_message, endpoint, cached_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.model || 'unknown',
        data.caller || 'unknown',
        promptTok,
        completionTok,
        Number(data.total_tokens) || 0,
        costValue,
        Number(data.latency_ms) || 0,
        data.status || 'success',
        data.error_message || null,
        data.endpoint || '/v1/chat/completions',
        cachedTok
      );
    } catch (e) {
      console.error('[LLM Proxy] DB log error:', e.message);
    }
  }

  /**
   * Proxy request to MiniMax API, log cost, return response
   */
  proxyRequest(requestBody, caller) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const apiKey = process.env.MINIMAX_API_KEY;

      if (!apiKey) {
        return reject(new Error('MINIMAX_API_KEY not configured'));
      }

      const model = requestBody.model || 'MiniMax-Text-02';
      const bodyStr = JSON.stringify(requestBody);
      const url = new URL(MINIMAX_ENDPOINT);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 120000,
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const latencyMs = Date.now() - startTime;
          const raw = Buffer.concat(chunks).toString('utf8');

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            // Fire-and-forget log
            this.logCost({
              model,
              caller,
              latency_ms: latencyMs,
              status: 'error',
              error_message: `Parse error: ${e.message}`,
            });
            return reject(new Error(`MiniMax response parse error: ${e.message}`));
          }

          // Extract token usage
          const usage = parsed.usage || {};
          const promptTokens = usage.prompt_tokens || 0;
          const completionTokens = usage.completion_tokens || 0;
          const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
          const cachedTokens = usage.cached_tokens || usage.prompt_tokens_details?.cached_tokens || 0;

          const costUsd = this.calculateCost(model, promptTokens, completionTokens, cachedTokens);

          // Fire-and-forget log
          this.logCost({
            model,
            caller,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            cost_usd: costUsd,
            latency_ms: latencyMs,
            status: res.statusCode >= 400 ? 'error' : 'success',
            error_message: res.statusCode >= 400 ? (parsed.error?.message || raw.slice(0, 500)) : null,
            cached_tokens: cachedTokens,
          });

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            _meta: {
              latency_ms: latencyMs,
              cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
              tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens, cached: cachedTokens },
            },
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const latencyMs = Date.now() - startTime;
        this.logCost({
          model,
          caller,
          latency_ms: latencyMs,
          status: 'error',
          error_message: 'Request timeout (120s)',
        });
        reject(new Error('MiniMax request timeout (120s)'));
      });

      req.on('error', (err) => {
        const latencyMs = Date.now() - startTime;
        this.logCost({
          model,
          caller,
          latency_ms: latencyMs,
          status: 'error',
          error_message: err.message,
        });
        reject(err);
      });

      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Transparent Anthropic-format proxy for OpenClaw gateway.
   * Forwards to api.minimax.io/anthropic{subPath}, logs cost from response.
   * Accepts any sub-path (e.g. /v1/messages).
   */
  proxyAnthropicRequest(subPath, requestBody, caller) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const apiKey = process.env.MINIMAX_API_KEY;

      if (!apiKey) {
        return reject(new Error('MINIMAX_API_KEY not configured'));
      }

      const model = requestBody.model || 'MiniMax-M2.5';
      // Force non-streaming — MiniMax Anthropic endpoint defaults to SSE
      const bodyStr = JSON.stringify({ ...requestBody, stream: false });
      const targetPath = `/anthropic${subPath}`;

      const options = {
        hostname: 'api.minimax.io',
        port: 443,
        path: targetPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 120000,
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const latencyMs = Date.now() - startTime;
          const raw = Buffer.concat(chunks).toString('utf8');

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            this.logCost({ model, caller, latency_ms: latencyMs, status: 'error', error_message: `Parse error: ${e.message}`, endpoint: targetPath });
            return reject(new Error(`Anthropic proxy parse error: ${e.message}`));
          }

          // Anthropic format: usage.input_tokens, usage.output_tokens
          const usage = parsed.usage || {};
          const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
          const completionTokens = usage.output_tokens || usage.completion_tokens || 0;
          const totalTokens = promptTokens + completionTokens;
          const cachedTokens = usage.cache_read_input_tokens || usage.cache_creation_input_tokens || 0;

          const costUsd = this.calculateCost(model, promptTokens, completionTokens, cachedTokens);

          this.logCost({
            model,
            caller,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            cost_usd: costUsd,
            latency_ms: latencyMs,
            status: res.statusCode >= 400 ? 'error' : 'success',
            error_message: res.statusCode >= 400 ? (parsed.error?.message || raw.slice(0, 500)) : null,
            endpoint: targetPath,
            cached_tokens: cachedTokens,
          });

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            _meta: {
              latency_ms: latencyMs,
              cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
              tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens, cached: cachedTokens },
            },
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        this.logCost({ model, caller, latency_ms: Date.now() - startTime, status: 'error', error_message: 'Anthropic proxy timeout (120s)', endpoint: targetPath });
        reject(new Error('Anthropic proxy timeout (120s)'));
      });

      req.on('error', (err) => {
        this.logCost({ model, caller, latency_ms: Date.now() - startTime, status: 'error', error_message: err.message, endpoint: targetPath });
        reject(err);
      });

      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Today's breakdown by caller + model
   */
  getCostsToday() {
    const rows = this.db.prepare(`
      SELECT
        caller,
        model,
        COUNT(*) as calls,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(total_tokens) as total_tokens,
        ROUND(SUM(cost_usd), 6) as cost_usd,
        ROUND(AVG(latency_ms), 0) as avg_latency_ms,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM llm_costs
      WHERE date(timestamp) = date('now')
      GROUP BY caller, model
      ORDER BY cost_usd DESC
    `).all();

    const totalRow = this.db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt,
        COALESCE(SUM(completion_tokens), 0) as total_completion
      FROM llm_costs
      WHERE date(timestamp) = date('now')
    `).get();

    return {
      date: new Date().toISOString().slice(0, 10),
      total_calls: totalRow.total_calls,
      total_cost_usd: Math.round(totalRow.total_cost * 1_000_000) / 1_000_000,
      total_prompt_tokens: totalRow.total_prompt,
      total_completion_tokens: totalRow.total_completion,
      breakdown: rows,
    };
  }

  /**
   * Daily totals for the last N days
   */
  getCostsSummary(days = 7) {
    return this.db.prepare(`
      SELECT
        date(timestamp) as date,
        COUNT(*) as calls,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        ROUND(SUM(cost_usd), 6) as cost_usd,
        ROUND(AVG(latency_ms), 0) as avg_latency_ms,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM llm_costs
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `).all(days);
  }

  /**
   * Costs grouped by caller identity
   */
  getCostsByCaller(days = 7) {
    return this.db.prepare(`
      SELECT
        caller,
        COUNT(*) as calls,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        ROUND(SUM(cost_usd), 6) as cost_usd,
        ROUND(AVG(latency_ms), 0) as avg_latency_ms,
        MAX(timestamp) as last_call
      FROM llm_costs
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY caller
      ORDER BY cost_usd DESC
    `).all(days);
  }

  /**
   * Hourly cost pattern for a given date
   */
  getHourlyCosts(date) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.db.prepare(`
      SELECT
        strftime('%H', timestamp) as hour,
        COUNT(*) as calls,
        ROUND(SUM(cost_usd), 6) as cost_usd,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens
      FROM llm_costs
      WHERE date(timestamp) = ?
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour ASC
    `).all(targetDate);
  }

  /**
   * Estimate runway days from a given balance
   */
  getRunwayEstimate(balance) {
    const dailyCosts = this.db.prepare(`
      SELECT
        date(timestamp) as date,
        ROUND(SUM(cost_usd), 6) as daily_cost
      FROM llm_costs
      WHERE timestamp >= datetime('now', '-14 days')
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `).all();

    if (dailyCosts.length === 0) {
      return {
        balance,
        avg_daily_cost: 0,
        runway_days: null,
        estimated_depletion: null,
        message: 'No cost data available',
        data_points: 0,
      };
    }

    const totalCost = dailyCosts.reduce((sum, r) => sum + r.daily_cost, 0);
    const avgDailyCost = totalCost / dailyCosts.length;
    const runwayDays = avgDailyCost > 0 ? Math.floor(balance / avgDailyCost) : null;

    let estimatedDepletion = null;
    if (runwayDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + runwayDays);
      estimatedDepletion = d.toISOString().slice(0, 10);
    }

    return {
      balance,
      avg_daily_cost: Math.round(avgDailyCost * 1_000_000) / 1_000_000,
      runway_days: runwayDays,
      estimated_depletion: estimatedDepletion,
      daily_costs: dailyCosts.slice(0, 7),
      data_points: dailyCosts.length,
    };
  }
}

module.exports = LLMProxy;
