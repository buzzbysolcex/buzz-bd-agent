/**
 * Simulate Listing — MiroFish Stage 1 (20-Agent EV Simulation)
 * POST /api/v1/simulate/simulate-listing
 * GET  /api/v1/simulate/history
 * GET  /api/v1/simulate/simulations
 *
 * Dispatches 4 persona types x 5 weight variations = 20 agent verdicts.
 * Calculates probability, confidence, EV, clusters, and recommendation.
 *
 * Buzz BD Agent | MiroFish MVP
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { getDB } = require('../db');
const {
  calculateEV,
  calculateConfidence,
  calculateProbability,
  buildClusterBreakdown,
  identifySignals
} = require('../services/ev-calculator');

// Persona agent paths — use relative require so it works both locally and in Docker
const PERSONA_DIR = path.resolve(__dirname, '../services/agents/personas');

const PERSONA_CONFIGS = [
  { name: 'degen-agent', file: 'degen-agent', baseWeight: 0.15 },
  { name: 'whale-agent', file: 'whale-agent', baseWeight: 0.25 },
  { name: 'institutional-agent', file: 'institutional-agent', baseWeight: 0.35 },
  { name: 'community-agent', file: 'community-agent', baseWeight: 0.25 },
];

// 5 weight offsets per persona to create 20 distinct evaluations
const WEIGHT_OFFSETS = [-0.04, -0.02, 0, 0.02, 0.04];

/**
 * Look up token by address OR ticker from pipeline_tokens + token_scores
 */
function lookupToken(db, tokenAddress, ticker, chain) {
  let token = null;

  if (tokenAddress) {
    try {
      token = db.prepare('SELECT * FROM pipeline_tokens WHERE address = ?').get(tokenAddress);
    } catch (e) { /* table may not exist */ }
  }

  if (!token && ticker) {
    try {
      token = db.prepare('SELECT * FROM pipeline_tokens WHERE UPPER(ticker) = UPPER(?)').get(ticker);
    } catch (e) { /* table may not exist */ }
  }

  // Also pull token_scores if available
  let scores = null;
  const addr = token?.address || tokenAddress;
  if (addr) {
    try {
      scores = db.prepare('SELECT * FROM token_scores WHERE address = ?').get(addr);
    } catch (e) { /* table may not exist */ }
  }

  return { token, scores };
}

/**
 * Build context for persona agents from pipeline_tokens + token_scores
 * token_scores stores rich data as JSON strings in scanner_data, safety_data, etc.
 */
function buildContext(token, scores, scenario) {
  // Parse JSON fields from token_scores
  let scannerData = {};
  let safetyData = {};
  let walletData = {};
  let socialData = {};
  let safetyScore = 50;
  let walletScore = 50;
  let socialScore = 50;

  if (scores) {
    try {
      const sd = JSON.parse(scores.scanner_data || '{}');
      scannerData = sd.data || sd;
      // Merge top-level scanner fields
      if (sd.tokenName) scannerData.name = sd.tokenName;
      if (sd.tokenSymbol) scannerData.symbol = sd.tokenSymbol;
      if (sd.marketCap) scannerData.market_cap = sd.marketCap;
      if (sd.liquidity) scannerData.liquidity_usd = sd.liquidity;
      if (sd.priceUsd) scannerData.price_usd = sd.priceUsd;
    } catch {}
    try { const s = JSON.parse(scores.safety_data || '{}'); safetyData = s.data || s; safetyScore = s.score || 50; } catch {}
    try { const w = JSON.parse(scores.wallet_data || '{}'); walletData = w.data || w; walletScore = w.score || 50; } catch {}
    try { const so = JSON.parse(scores.social_data || '{}'); socialData = so.data || so; socialScore = so.score || 50; } catch {}
  }

  // Fallback: generate synthetic data from pipeline_score when no token_scores exist
  if (!scores && token && token.score) {
    const pScore = token.score;
    scannerData = {
      name: token.name || token.ticker || 'Unknown',
      symbol: token.ticker,
      market_cap: pScore >= 85 ? 50000000 : pScore >= 70 ? 5000000 : 500000,
      liquidity_usd: pScore >= 85 ? 2000000 : pScore >= 70 ? 500000 : 50000,
      volume_24h: pScore >= 85 ? 5000000 : pScore >= 70 ? 1000000 : 100000,
      price_change_24h: pScore >= 85 ? 15 : pScore >= 70 ? 5 : -5,
      holders: pScore >= 85 ? 10000 : pScore >= 70 ? 3000 : 500,
      pair_age_hours: pScore >= 85 ? 2160 : pScore >= 70 ? 720 : 168,
      boosted: pScore >= 80,
      txns: { h24: { buys: pScore >= 70 ? 500 : 100, sells: pScore >= 70 ? 300 : 150 } }
    };
    safetyScore = pScore >= 85 ? 90 : pScore >= 70 ? 75 : 50;
    walletScore = pScore >= 85 ? 80 : pScore >= 70 ? 65 : 45;
    socialScore = pScore >= 85 ? 75 : pScore >= 70 ? 60 : 40;
    safetyData = {
      verdict: pScore >= 85 ? 'SAFE' : pScore >= 70 ? 'CAUTION' : 'RISKY',
      lp_locked: pScore >= 75,
      ownership_renounced: pScore >= 80,
      audited: pScore >= 85,
      instant_kills: [],
    };
    walletData = {
      unique_holders: scannerData.holders,
      top10_holder_pct: pScore >= 85 ? 15 : pScore >= 70 ? 35 : 55,
    };
    socialData = {
      twitter_followers: pScore >= 85 ? 25000 : pScore >= 70 ? 5000 : 500,
      engagement_rate: pScore >= 85 ? 4 : pScore >= 70 ? 2 : 0.5,
      sentiment: pScore >= 85 ? 'positive' : pScore >= 70 ? 'neutral' : 'negative',
      has_discord: pScore >= 70,
      has_telegram: pScore >= 70,
    };
  }

  // Fallback: use pipeline_tokens data if no token_scores
  if (!scannerData.name && token) {
    scannerData.name = token.name || token.ticker || token.address;
    scannerData.symbol = token.ticker;
  }

  // Use pipeline score if available and higher fidelity
  const pipelineScore = token?.score || 0;

  return {
    scannerData,
    safetyData,
    walletData,
    socialData,
    safetyScore,
    walletScore,
    socialScore,
    pipelineScore,
    scenario: scenario || 'listing_evaluation',
    timestamp: new Date().toISOString()
  };
}

// POST /api/v1/simulate/simulate-listing
router.post('/simulate-listing', async (req, res) => {
  try {
    const { tokenAddress, address, ticker, chain, depth } = req.body;
    const resolvedAddress = tokenAddress || address;

    if (!resolvedAddress && !ticker) {
      return res.json({ success: false, error: 'tokenAddress or ticker required' });
    }

    const db = getDB();

    // 1. Look up token
    const { token, scores } = lookupToken(db, resolvedAddress, ticker, chain || 'solana');

    if (!token && !resolvedAddress) {
      return res.json({
        success: false,
        error: 'Token not found in pipeline — scan first'
      });
    }

    const tokenAddr = token?.address || resolvedAddress;
    const tokenTicker = token?.ticker || ticker || null;
    const tokenChain = token?.chain || chain || 'solana';
    const scenario = req.body.scenario || 'listing_evaluation';

    // 2. Build context
    const context = buildContext(token, scores, scenario);

    // 3. Load persona agents and dispatch 20 evaluations (4 personas x 5 weight variations)
    const agentPromises = [];

    for (const persona of PERSONA_CONFIGS) {
      let agentModule;
      try {
        agentModule = require(path.join(PERSONA_DIR, persona.file));
      } catch (e) {
        // Try Docker path as fallback
        try {
          agentModule = require(`/opt/buzz-api/services/agents/personas/${persona.file}`);
        } catch (e2) {
          console.error(`[simulate] Cannot load ${persona.name}: ${e.message}`);
          continue;
        }
      }

      for (const offset of WEIGHT_OFFSETS) {
        const adjustedWeight = Math.max(0.05, Math.min(0.50, persona.baseWeight + offset));
        agentPromises.push(
          agentModule.analyzeToken(context, null).then(result => ({
            ...result,
            persona: persona.name,
            weight: adjustedWeight,
            variation: offset
          }))
        );
      }
    }

    const results = await Promise.allSettled(agentPromises);

    // 4. Collect valid verdicts
    const verdicts = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    if (verdicts.length < 10) {
      return res.json({
        success: false,
        error: `Only ${verdicts.length} valid verdicts — need at least 10. Check persona agents.`
      });
    }

    const partialNote = verdicts.length < 15
      ? `Partial simulation: ${verdicts.length}/20 agents responded`
      : null;

    // 5. Calculate EV metrics
    const probability = calculateProbability(verdicts);
    const confidence = calculateConfidence(verdicts);
    const evResult = calculateEV(probability);
    const clusters = buildClusterBreakdown(verdicts);
    const { key_risk, key_signal } = identifySignals(clusters);

    // 6. Aggregate counts
    const bullish = verdicts.filter(v => v.signal === 'bullish').length;
    const neutral = verdicts.filter(v => v.signal === 'neutral').length;
    const bearish = verdicts.filter(v => v.signal === 'bearish').length;

    const consensus = {
      overall: bullish > bearish + neutral ? 'bullish' : bearish > bullish ? 'bearish' : 'mixed',
      bullish_count: bullish,
      neutral_count: neutral,
      bearish_count: bearish,
      total_agents: verdicts.length,
      expected_impact: bullish >= 14 ? '+15-25% in 24h' : bullish >= 8 ? '+5-15% in 24h' : 'minimal',
    };

    // 7. Store in DB
    const now = new Date().toISOString();
    try {
      db.prepare(`INSERT INTO listing_simulations
        (token_address, chain, scenario, persona_results, consensus,
         bullish_count, neutral_count, bearish_count, expected_impact,
         ticker, score, agents_count, probability, confidence, ev, recommendation,
         cluster_degen, cluster_whale, cluster_institutional, cluster_community,
         key_risk, key_signal, raw_verdicts, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tokenAddr, tokenChain, scenario,
        JSON.stringify(verdicts.map(v => ({ persona: v.persona, signal: v.signal, confidence: v.confidence, score: v.score, weight: v.weight }))),
        JSON.stringify(consensus),
        bullish, neutral, bearish,
        consensus.expected_impact,
        tokenTicker,
        token?.score || scores?.score_total || null,
        verdicts.length,
        probability,
        confidence,
        evResult.ev,
        evResult.decision,
        JSON.stringify(clusters.degen || null),
        JSON.stringify(clusters.whale || null),
        JSON.stringify(clusters.institutional || null),
        JSON.stringify(clusters.community || null),
        key_risk,
        key_signal,
        JSON.stringify(verdicts),
        now
      );
    } catch (e) {
      console.error('[simulate] DB insert error:', e.message);
    }

    // 8. Return response
    res.json({
      success: true,
      simulation: {
        token: tokenAddr,
        ticker: tokenTicker,
        chain: tokenChain,
        agents_count: verdicts.length,
        scenario,
        probability,
        confidence,
        ev: evResult,
        recommendation: evResult.decision,
        consensus,
        clusters,
        key_risk,
        key_signal,
        partial_note: partialNote,
        persona_results: verdicts,
        simulated_at: now
      }
    });
  } catch (err) {
    console.error('[simulate] Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// GET /api/v1/simulate/history — recent simulations
router.get('/history', (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = db.prepare('SELECT * FROM listing_simulations ORDER BY id DESC LIMIT ?').all(limit);
    res.json({ success: true, count: rows.length, simulations: rows });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/v1/simulate/simulations — alias for history
router.get('/simulations', (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = db.prepare('SELECT * FROM listing_simulations ORDER BY id DESC LIMIT ?').all(limit);
    res.json({ success: true, count: rows.length, simulations: rows });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
