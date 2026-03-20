/**
 * Premium x402 Endpoints — Paywalled token intelligence
 * These endpoints require x402 USDC micropayment on Base.
 * Admin key holders bypass the paywall.
 *
 * GET /api/v1/premium/pipeline     — Hot token pipeline ($0.01)
 * GET /api/v1/premium/score/:addr  — Token score ($0.005)
 * GET /api/v1/premium/sim/:addr    — Simulation result ($0.02)
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
    price: '5000', // $0.005
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
    price: '20000', // $0.02
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

module.exports = router;
