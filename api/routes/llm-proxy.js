/**
 * Buzz BD Agent — LLM Cost Proxy Routes
 * v7.5.5 | 6 endpoints under /api/v1/llm
 *
 * POST /completions         — Transparent proxy to MiniMax
 * GET  /costs/today         — Today's breakdown with alert status
 * GET  /costs/summary       — Daily totals (default 7 days)
 * GET  /costs/callers       — By caller identity
 * GET  /costs/hourly        — Hourly breakdown for a date
 * GET  /costs/runway        — Runway estimate from balance
 */

const express = require('express');
const LLMProxy = require('../services/llm-proxy');

module.exports = function (db) {
  const router = express.Router();
  const proxy = new LLMProxy(db);

  // ─── Auth Middleware ────────────────────────────────
  function authMiddleware(req, res, next) {
    // Skip auth for localhost (OpenClaw, crons, internal services)
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      return next();
    }

    const adminKey = process.env.BUZZ_API_ADMIN_KEY;
    if (!adminKey) {
      return res.status(500).json({ error: 'server_config', message: 'BUZZ_API_ADMIN_KEY not configured' });
    }

    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const xApiKey = req.headers['x-api-key'];
    const provided = bearer || xApiKey;

    if (!provided || provided !== adminKey) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing API key' });
    }

    next();
  }

  router.use(authMiddleware);

  // ─── Caller Inference from Message Content ─────────
  // Infer caller from system prompt keywords. Searches ENTIRE text
  // (credential guards push keywords further into the prompt).
  // Order matters: more specific patterns first.
  const CALLER_PATTERNS = [
    // Specific crons (check before generic patterns)
    [['bd scan'], 'bd-scan'],
    [['twitter brain', 'twitter brain scan'], 'twitter-brain'],
    [['nansen', 'smart money check', 'smart money scan'], 'nansen'],
    [['atv', 'identity batch', 'web3 identity'], 'atv'],
    [['daily morning summary'], 'daily-summary'],
    [['end of day', 'eod report', 'buzz eod'], 'eod-report'],
    [['morning pipeline review', 'morning review'], 'morning-review'],
    [['evening pipeline review', 'evening review'], 'evening-review'],
    [['pipeline review', 're-score existing'], 'pipeline-review'],
    [['weekly pipeline digest'], 'weekly-digest'],
    [['moltbook', 'content calendar heartbeat'], 'moltbook'],
    [['molten heartbeat', 'molten.gg'], 'molten'],
    [['geckoterminal'], 'gecko-scan'],
    [['dexscreener boost', 'boost scan'], 'dex-boost'],
    [['prayer', 'salat', 'sholat', 'fajr', 'dhuhr', 'maghrib', 'isha'], 'prayer'],
    [['simulat', 'mirofish', 'microbuzz'], 'simulation'],
    [['bankr', 'deploy stats', 'credit check'], 'bankr'],
    [['bitget', 'listing intel'], 'bitget-intel'],
    [['firecrawl', 'deep research'], 'firecrawl'],
    [['acp marketplace', 'acp monitor'], 'acp'],
    [['agentproof', 'telemetry'], 'agentproof'],
    [['skill reflect', 'learning loop'], 'skill-reflect'],
    [['backtest', 'hedge brain'], 'backtest'],
    [['health check', 'system health', 'cron health', 'api health'], 'health-check'],
    [['alpha alert'], 'alpha-alert'],
    [['build update'], 'build-update'],
    [['intelligence', 'intel report'], 'intel-report'],
    [['orchestrat'], 'orchestrator'],
    [['bsc scan', 'bnb chain scan'], 'bsc-scan'],
    [['bags.fm', 'bags scan', 'scan bags'], 'bags-scan'],
    // Generic fallbacks (after specific)
    [['twitter', 'tweet'], 'twitter'],
    [['scan', 'scanner', 'score-token'], 'scan'],
    [['pipeline'], 'pipeline'],
    [['summary', 'digest', 'report'], 'report'],
  ];

  function inferCaller(body) {
    const systemText = extractSystemText(body);
    if (!systemText) return 'openclaw-gateway';

    const lower = systemText.toLowerCase();
    for (const [keywords, caller] of CALLER_PATTERNS) {
      if (keywords.some(kw => lower.includes(kw))) return caller;
    }
    return 'openclaw-gateway';
  }

  function extractSystemText(body) {
    // Anthropic format: body.system (string)
    if (typeof body.system === 'string' && body.system.length > 0) return body.system;
    // OpenAI format: body.messages array — check system message
    const msgs = body.messages;
    if (Array.isArray(msgs)) {
      const sys = msgs.find(m => m.role === 'system');
      if (sys) return typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content);
      // OpenClaw puts cron task text in user messages — check those too
      // Concatenate all user message content for fingerprinting
      const userTexts = msgs
        .filter(m => m.role === 'user')
        .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
        .join(' ');
      if (userTexts.length > 0) return userTexts;
    }
    return null;
  }

  // ─── POST /completions — Transparent Proxy ─────────
  router.post('/completions', async (req, res) => {
    try {
      const caller = req.headers['x-buzz-caller'] || req.body._caller || inferCaller(req.body);

      // Remove _caller before forwarding
      const body = { ...req.body };
      delete body._caller;

      const result = await proxy.proxyRequest(body, caller);

      // Return the MiniMax response transparently, with cost metadata header
      res.set('X-Buzz-Cost-USD', String(result._meta.cost_usd));
      res.set('X-Buzz-Latency-MS', String(result._meta.latency_ms));
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      console.error('[LLM Proxy] Proxy error:', err.message);
      res.status(502).json({
        error: 'proxy_error',
        message: err.message,
      });
    }
  });

  // ─── POST /anthropic/* — Transparent Anthropic-format Proxy ──
  // OpenClaw sends Anthropic-format requests here (e.g. /anthropic/v1/messages)
  // Forwards to api.minimax.io/anthropic/*, logs cost
  router.post('/anthropic/*', async (req, res) => {
    try {
      // Auto-detect caller from request context
      let caller = req.headers['x-buzz-caller'] || inferCaller(req.body);
      // Extract sub-path: /anthropic/v1/messages → /v1/messages
      const subPath = req.path.replace(/^\/anthropic/, '') || '/v1/messages';

      const result = await proxy.proxyAnthropicRequest(subPath, req.body, caller);

      res.set('X-Buzz-Cost-USD', String(result._meta.cost_usd));
      res.set('X-Buzz-Latency-MS', String(result._meta.latency_ms));
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      console.error('[LLM Proxy] Anthropic proxy error:', err.message);
      res.status(502).json({ error: 'proxy_error', message: err.message });
    }
  });

  // ─── GET /costs/today — Today's Breakdown ──────────
  router.get('/costs/today', (req, res) => {
    try {
      const data = proxy.getCostsToday();

      // R007 alert thresholds
      let alert_status = 'OK';
      if (data.total_cost_usd >= 8) {
        alert_status = 'ALERT';
      } else if (data.total_cost_usd >= 5) {
        alert_status = 'WARNING';
      }

      res.json({
        ...data,
        alert_status,
        thresholds: { warning: 5, alert: 8 },
      });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /costs/summary — Daily Totals ─────────────
  router.get('/costs/summary', (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const data = proxy.getCostsSummary(days);
      res.json({ days, daily_totals: data });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /costs/callers — By Caller Identity ───────
  router.get('/costs/callers', (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const data = proxy.getCostsByCaller(days);
      res.json({ days, callers: data });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /costs/hourly — Hourly Breakdown ──────────
  router.get('/costs/hourly', (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().slice(0, 10);
      const data = proxy.getHourlyCosts(date);
      res.json({ date, hours: data });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /costs/runway — Runway Estimate ───────────
  router.get('/costs/runway', (req, res) => {
    try {
      const balance = parseFloat(req.query.balance);
      if (isNaN(balance) || balance < 0) {
        return res.status(400).json({ error: 'invalid_balance', message: 'Provide ?balance=<number>' });
      }
      const data = proxy.getRunwayEstimate(balance);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /costs-by-agent — Per-Agent Cost Tracking ───
  router.get('/costs-by-agent', (req, res) => {
    try {
      const agents = db.prepare(`
        SELECT agent,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as ok_calls,
          COUNT(*) as total_calls,
          provider,
          model
        FROM llm_provider_log
        GROUP BY agent, provider, model
        ORDER BY total_calls DESC
      `).all();

      res.json({ success: true, agents });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /stats — Provider Usage Stats (Day 32B) ───
  router.get('/stats', (req, res) => {
    try {
      const { getCascadeStatus } = require('../lib/llm-cascade');
      const cascadeStatus = getCascadeStatus();

      // Provider usage from llm_provider_log
      let providerStats = [];
      try {
        providerStats = db.prepare(`
          SELECT provider, model, agent,
            COUNT(*) as calls,
            SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
            SUM(tokens_in) as total_tokens_in,
            SUM(tokens_out) as total_tokens_out,
            ROUND(AVG(latency_ms), 0) as avg_latency_ms
          FROM llm_provider_log
          WHERE created_at >= datetime('now', '-24 hours')
          GROUP BY provider, model, agent
          ORDER BY calls DESC
        `).all();
      } catch { /* table may not exist yet */ }

      // Also pull from existing llm_costs table
      const costStats = proxy.getCostsToday();

      res.json({
        cascade: cascadeStatus,
        provider_usage_24h: providerStats,
        cost_today: costStats,
      });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  return router;
};
