/**
 * /api/v1/score-token — THE MONEY ENDPOINT
 * 
 * Single POST triggers all 5 parallel sub-agents, returns 100-point score breakdown.
 * Auth: x402 USDC payment ($0.05) OR API key
 * 
 * Also serves as backend for ACP token_intelligence_score offering ($0.50)
 * Same code, two revenue channels.
 * 
 * Buzz BD Agent v6.1.1 | SolCex Exchange
 * Sprint Day 9 — March 3, 2026
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { orchestrateScore } = require('../services/orchestrator');
const { validateScoreRequest } = require('../middleware/validate');
const { trackCost } = require('../services/costTracker');
const { reportToAgentProof } = require('../services/agentproof');

// ═══════════════════════════════════════════════════
// POST /api/v1/score-token
// ═══════════════════════════════════════════════════
router.post('/score-token', validateScoreRequest, async (req, res) => {
  const startTime = Date.now();
  const requestId = `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  const {
    address,           // Contract address (required)
    chain = 'solana',  // Chain: solana, base, ethereum, etc.
    depth = 'standard' // standard (5 agents) or deep (5 agents + L5 Nansen)
  } = req.body;

  console.log(`[${requestId}] 🎯 /score-token START | ${address} on ${chain} | depth=${depth}`);

  try {
    // ─── Step 1: Check if we have a recent cached score ───
    const db = getDB();
    const cached = db.prepare(`
      SELECT * FROM token_scores 
      WHERE contract_address = ? AND chain = ? 
      AND created_at > datetime('now', '-30 minutes')
      ORDER BY created_at DESC LIMIT 1
    `).get(address.toLowerCase(), chain.toLowerCase());

    if (cached && depth !== 'deep') {
      console.log(`[${requestId}] ♻️ Cache hit (${cached.id}) — returning cached score`);
      const cachedResult = JSON.parse(cached.result_json);
      return res.json({
        success: true,
        cached: true,
        cached_at: cached.created_at,
        ...cachedResult,
        meta: {
          request_id: requestId,
          duration_ms: Date.now() - startTime,
          source: 'cache'
        }
      });
    }

    // ─── Step 2: Orchestrate 5 parallel sub-agents ───
    console.log(`[${requestId}] 🚀 Dispatching 5 parallel sub-agents...`);
    
    const orchestrationResult = await orchestrateScore({
      address,
      chain,
      depth,
      requestId
    });

    const {
      score,
      verdict,
      breakdown,
      subAgentResults,
      agentTimings,
      errors
    } = orchestrationResult;

    // ─── Step 3: Build response ───
    const response = {
      success: true,
      cached: false,
      token: {
        address: address,
        chain: chain,
        name: subAgentResults.scanner?.tokenName || null,
        symbol: subAgentResults.scanner?.tokenSymbol || null,
        market_cap: subAgentResults.scanner?.marketCap || null,
        liquidity: subAgentResults.scanner?.liquidity || null,
        price_usd: subAgentResults.scanner?.priceUsd || null,
        dexscreener_url: subAgentResults.scanner?.dexscreenerUrl || null
      },
      score: {
        total: score,
        verdict: verdict, // HOT / QUALIFIED / WATCH / SKIP
        verdict_emoji: getVerdictEmoji(verdict),
        breakdown: breakdown
      },
      sub_agents: {
        scanner: {
          status: subAgentResults.scanner?.status || 'error',
          duration_ms: agentTimings.scanner || 0,
          data: subAgentResults.scanner?.data || null
        },
        safety: {
          status: subAgentResults.safety?.status || 'error',
          score: subAgentResults.safety?.score || 0,
          weight: 0.30,
          weighted_score: (subAgentResults.safety?.score || 0) * 0.30,
          duration_ms: agentTimings.safety || 0,
          data: subAgentResults.safety?.data || null
        },
        wallet: {
          status: subAgentResults.wallet?.status || 'error',
          score: subAgentResults.wallet?.score || 0,
          weight: 0.30,
          weighted_score: (subAgentResults.wallet?.score || 0) * 0.30,
          duration_ms: agentTimings.wallet || 0,
          data: subAgentResults.wallet?.data || null
        },
        social: {
          status: subAgentResults.social?.status || 'error',
          score: subAgentResults.social?.score || 0,
          weight: 0.20,
          weighted_score: (subAgentResults.social?.score || 0) * 0.20,
          duration_ms: agentTimings.social || 0,
          data: subAgentResults.social?.data || null
        },
        scorer: {
          status: subAgentResults.scorer?.status || 'error',
          score: subAgentResults.scorer?.score || 0,
          weight: 0.20,
          weighted_score: (subAgentResults.scorer?.score || 0) * 0.20,
          duration_ms: agentTimings.scorer || 0,
          data: subAgentResults.scorer?.data || null
        }
      },
      agents_completed: Object.values(subAgentResults).filter(a => a?.status === 'completed').length,
      agents_total: 5,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        request_id: requestId,
        duration_ms: Date.now() - startTime,
        depth: depth,
        source: 'live',
        api_version: 'v1',
        buzz_version: '6.1.1',
        engine: '5-parallel-sub-agents'
      }
    };

    // ─── Step 4: Persist score to DB ───
    try {
      db.prepare(`
        INSERT INTO token_scores 
        (request_id, contract_address, chain, depth, score, verdict, result_json, 
         duration_ms, agents_completed, agents_total, auth_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        requestId,
        address.toLowerCase(),
        chain.toLowerCase(),
        depth,
        score,
        verdict,
        JSON.stringify(response),
        Date.now() - startTime,
        response.agents_completed,
        5,
        req.authMethod || 'api_key' // set by auth middleware
      );
    } catch (dbErr) {
      console.error(`[${requestId}] ⚠️ DB insert failed:`, dbErr.message);
      // Non-fatal — still return score
    }

    // ─── Step 5: Track cost ───
    trackCost({
      requestId,
      endpoint: '/score-token',
      chain,
      depth,
      agentTimings,
      authMethod: req.authMethod || 'api_key'
    });

    // ─── Step 6: Report to AgentProof (async, non-blocking) ───
    reportToAgentProof({
      taskType: 'score_token',
      requestId,
      success: true,
      duration_ms: Date.now() - startTime,
      agentsCompleted: response.agents_completed,
      score
    }).catch(err => console.error(`[${requestId}] AgentProof report failed:`, err.message));

    // ─── Step 7: Return ───
    console.log(`[${requestId}] ✅ Score: ${score}/100 (${verdict}) | ${Date.now() - startTime}ms | ${response.agents_completed}/5 agents`);
    return res.json(response);

  } catch (err) {
    console.error(`[${requestId}] ❌ /score-token FAILED:`, err.message);
    
    // Report failure to AgentProof
    reportToAgentProof({
      taskType: 'score_token',
      requestId,
      success: false,
      duration_ms: Date.now() - startTime,
      error: err.message
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      error: 'Score computation failed',
      message: err.message,
      meta: {
        request_id: requestId,
        duration_ms: Date.now() - startTime
      }
    });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/:address
// Quick lookup of most recent score for a token
// ═══════════════════════════════════════════════════
router.get('/score-token/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || 'solana';
  
  try {
    const db = getDB();
    const latest = db.prepare(`
      SELECT * FROM token_scores 
      WHERE contract_address = ? AND chain = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(address.toLowerCase(), chain.toLowerCase());

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No score found for this token',
        hint: 'POST /api/v1/score-token to generate a score'
      });
    }

    const result = JSON.parse(latest.result_json);
    return res.json({
      success: true,
      cached: true,
      cached_at: latest.created_at,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/history/:address
// Score history for a token over time
// ═══════════════════════════════════════════════════
router.get('/score-token/history/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || 'solana';
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const db = getDB();
    const history = db.prepare(`
      SELECT request_id, score, verdict, depth, duration_ms, 
             agents_completed, agents_total, auth_method, created_at
      FROM token_scores 
      WHERE contract_address = ? AND chain = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(address.toLowerCase(), chain.toLowerCase(), limit);

    return res.json({
      success: true,
      address: address,
      chain: chain,
      total_scores: history.length,
      history: history
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/leaderboard
// Top scored tokens across all scans
// ═══════════════════════════════════════════════════
router.get('/score-token/leaderboard', async (req, res) => {
  const chain = req.query.chain || null;
  const verdict = req.query.verdict || null;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const since = req.query.since || '24h';

  // Convert since to SQLite interval
  const sinceMap = {
    '1h': '-1 hours',
    '6h': '-6 hours',
    '24h': '-24 hours',
    '7d': '-7 days',
    '30d': '-30 days'
  };
  const interval = sinceMap[since] || '-24 hours';

  try {
    const db = getDB();
    let query = `
      SELECT contract_address, chain, MAX(score) as best_score, 
             verdict, COUNT(*) as scan_count,
             MAX(created_at) as last_scanned
      FROM token_scores 
      WHERE created_at > datetime('now', ?)
    `;
    const params = [interval];

    if (chain) {
      query += ` AND chain = ?`;
      params.push(chain.toLowerCase());
    }
    if (verdict) {
      query += ` AND verdict = ?`;
      params.push(verdict.toUpperCase());
    }

    query += ` GROUP BY contract_address, chain ORDER BY best_score DESC LIMIT ?`;
    params.push(limit);

    const leaderboard = db.prepare(query).all(...params);

    return res.json({
      success: true,
      since: since,
      chain: chain || 'all',
      total: leaderboard.length,
      leaderboard: leaderboard
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Helper: verdict emoji
function getVerdictEmoji(verdict) {
  const map = {
    'HOT': '🔥',
    'QUALIFIED': '✅',
    'WATCH': '👀',
    'SKIP': '❌'
  };
  return map[verdict] || '❓';
}

module.exports = router;
