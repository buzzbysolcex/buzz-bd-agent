/**
 * Premium x402 Endpoints — Paywalled token intelligence
 * These endpoints require x402 USDC micropayment on Base.
 * Admin key holders bypass the paywall.
 *
 * GET /api/v1/premium/pipeline     — Hot token pipeline ($0.01)
 * GET /api/v1/premium/score/:addr  — Token score ($0.01)
 * GET /api/v1/premium/sim/:addr    — Simulation result ($0.05)
 * GET /api/v1/premium/mining       — BTC mining pool intelligence ($0.01)
 *
 * Buzz BD Agent | 402 Index Registration
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { x402Paywall } = require('../middleware/x402-paywall');

// ─── GET /premium/pipeline — Hot token pipeline ─────────
router.get('/pipeline',
  x402Paywall({
    price: '10000', // $0.01
    resource: '/api/v1/premium/pipeline',
    description: 'Real-time hot token pipeline with scores, contracts, and chain data. 100-point composite scoring.',
  }),
  (req, res) => {
    try {
      const db = getDB();
      const tokens = db.prepare(
        `SELECT address, ticker, name, chain, score, stage, source, updated_at
         FROM pipeline_tokens WHERE score >= 85 ORDER BY score DESC`
      ).all();
      res.json({
        success: true,
        count: tokens.length,
        pipeline: tokens,
        scoring_dimensions: ['safety(25)', 'wallet(25)', 'social(15)', 'scorer(15)', 'technical(20)'],
        provider: 'Buzz BD Agent | SolCex Exchange',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── GET /premium/score/:address — Token score ──────────
router.get('/score/:address',
  x402Paywall({
    price: '10000', // $0.01
    resource: '/api/v1/premium/score',
    description: 'Individual token intelligence score with triple verification across 5 dimensions.',
  }),
  (req, res) => {
    try {
      const db = getDB();
      const address = req.params.address;

      let token = null;
      try { token = db.prepare('SELECT * FROM pipeline_tokens WHERE address = ?').get(address); } catch {}

      let scores = null;
      try { scores = db.prepare('SELECT * FROM token_scores WHERE address = ?').get(address); } catch {}

      if (!token) return res.status(404).json({ error: 'Token not found in pipeline' });

      res.json({
        success: true,
        address: token.address,
        ticker: token.ticker,
        chain: token.chain,
        score: token.score,
        stage: token.stage,
        score_breakdown: token.score_breakdown ? JSON.parse(token.score_breakdown) : null,
        token_scores: scores ? {
          total: scores.total_score || scores.score,
          safety: scores.safety_score,
          wallet: scores.wallet_score,
          social: scores.social_score,
        } : null,
        provider: 'Buzz BD Agent | SolCex Exchange',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── GET /premium/sim/:address — Simulation result ──────
router.get('/sim/:address',
  x402Paywall({
    price: '50000', // $0.05
    resource: '/api/v1/premium/sim',
    description: '20-agent MiroFish simulation with adversarial bull/bear debate. LIST or REJECT verdict.',
  }),
  (req, res) => {
    try {
      const db = getDB();
      const address = req.params.address;

      // Check simulation_results first, then listing_simulations
      let sim = null;
      try { sim = db.prepare('SELECT * FROM simulation_results WHERE token_address = ? ORDER BY created_at DESC LIMIT 1').get(address); } catch {}
      if (!sim) try { sim = db.prepare('SELECT * FROM listing_simulations WHERE token_address = ? ORDER BY id DESC LIMIT 1').get(address); } catch {}

      if (!sim) return res.status(404).json({ error: 'No simulation found for this token. Run POST /api/v1/simulate-listing first.' });

      // Parse JSON fields
      let verdicts = null, metrics = null, consensus = null;
      try { verdicts = JSON.parse(sim.verdicts_json || sim.raw_verdicts || '[]'); } catch {}
      try { metrics = JSON.parse(sim.metrics_json || '{}'); } catch {}
      try { consensus = typeof sim.consensus === 'string' && sim.consensus.startsWith('{') ? JSON.parse(sim.consensus) : sim.consensus; } catch { consensus = sim.consensus; }

      res.json({
        success: true,
        simulation_id: sim.simulation_id || sim.id,
        token_address: sim.token_address,
        chain: sim.chain,
        consensus,
        confidence: sim.confidence,
        recommendation: sim.recommendation,
        score: sim.score,
        verdicts_count: verdicts?.length || sim.agents_count || 20,
        verdicts: verdicts?.slice(0, 5), // Sample — full list behind higher tier
        metrics,
        duration_ms: sim.duration_ms,
        created_at: sim.created_at || sim.simulated_at,
        provider: 'Buzz BD Agent | SolCex Exchange',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── GET /premium/mining — BTC mining pool intelligence ──
router.get(
  '/mining',
  x402Paywall({
    price: '10000', // $0.01
    resource: '/api/v1/premium/mining',
    description:
      'BTC mining pool intelligence — 14 pools with share velocity, pool_health score, fee efficiency, empty-block rate. Refreshes every PULSE 6c tick.',
  }),
  (req, res) => {
    try {
      const db = getDB();

      const latestSnapshot = db
        .prepare(
          `SELECT timestamp, hashrate_eh, difficulty, block_height,
                  btc_price_usd, hashprice_usd, fee_rate_fast, fee_rate_medium, fee_rate_slow,
                  mempool_tx_count, mempool_vsize_mb, total_pools_tracked,
                  mining_sentiment_index, mining_sentiment_label,
                  hashrate_change_24h, blocks_since_retarget, next_retarget_change
             FROM mining_snapshots
            ORDER BY id DESC LIMIT 1`
        )
        .get();

      const latestPoolTs = db
        .prepare('SELECT MAX(timestamp) AS ts FROM mining_pools')
        .get();

      const pools = latestPoolTs?.ts
        ? db
            .prepare(
              `SELECT slug, name, link,
                      block_count_24h, block_count_1w,
                      block_share_24h, block_share_1w,
                      share_velocity, hashrate_share,
                      pool_health_score, pool_tier,
                      fee_efficiency, avg_fee_per_block, empty_block_rate,
                      sentiment, sentiment_reason,
                      timestamp AS snapshot_timestamp
                 FROM mining_pools
                WHERE timestamp = ?
                ORDER BY pool_health_score DESC, block_share_1w DESC`
            )
            .all(latestPoolTs.ts)
        : [];

      // Pool concentration: HHI on 1w shares (×10000 scale, ×100 for Herfindahl-normalized 0–1)
      const shares = pools.map((p) => p.block_share_1w || 0);
      const hhi =
        shares.reduce((acc, s) => acc + (s * 100) ** 2, 0); // shares are fractions 0–1; ×100 gives percentage points

      res.json({
        success: true,
        snapshot: latestSnapshot || null,
        pool_concentration_hhi: Number.isFinite(hhi) ? Math.round(hhi) : null,
        pools_count: pools.length,
        pools,
        scoring_notes: {
          pool_tier: 'APEX >= 85, STRONG 55–80, STABLE 40–50',
          share_velocity: '(share_24h - share_1w) — positive = pool gaining share this window',
          fee_efficiency: 'avg_fee_per_block normalized to network median',
          empty_block_rate: 'fraction of blocks with 1–2 tx (lower = healthier)',
        },
        provider: 'Buzz BD Agent | SolCex Exchange',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
