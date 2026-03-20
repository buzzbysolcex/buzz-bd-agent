/**
 * Listing Readiness Router
 * GET /listing-readiness/:address — evaluates token listing readiness
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/:address', (req, res) => {
  try {
    const db = getDB();
    const address = req.params.address;
    const chain = req.query.chain || 'solana';

    // Look up token
    let token = null;
    try { token = db.prepare('SELECT * FROM pipeline_tokens WHERE address = ?').get(address); } catch {}

    // Get scores
    let scores = null;
    try { scores = db.prepare('SELECT * FROM token_scores WHERE address = ?').get(address); } catch {}

    // Get latest simulation
    let sim = null;
    try { sim = db.prepare('SELECT * FROM simulation_results WHERE token_address = ? ORDER BY created_at DESC LIMIT 1').get(address); } catch {}
    if (!sim) try { sim = db.prepare('SELECT * FROM listing_simulations WHERE token_address = ? ORDER BY id DESC LIMIT 1').get(address); } catch {}

    // Get technical analysis
    let tech = null;
    try { tech = db.prepare('SELECT * FROM technical_analysis_cache WHERE token_address = ?').get(address); } catch {}

    // Calculate readiness
    const pipelineScore = token?.score || 0;
    const readiness_pct = Math.min(100, Math.round(pipelineScore * 0.85 + (sim?.confidence || 0) * 15));

    // Parse scanner data for market metrics
    let mcap = 0, volume = 0, liquidity = 0, holders = 0;
    if (scores) {
      try {
        const sd = JSON.parse(scores.scanner_data || '{}');
        const data = sd.data || sd;
        mcap = data.market_cap || data.marketCap || 0;
        volume = data.volume_24h || data.volume24h || 0;
        liquidity = data.liquidity_usd || data.liquidity || 0;
        holders = data.holders || data.unique_holders || 0;
      } catch {}
    }
    // Synthetic fallback from score
    if (!mcap && pipelineScore) {
      mcap = pipelineScore >= 85 ? 50000000 : pipelineScore >= 70 ? 5000000 : 500000;
      volume = pipelineScore >= 85 ? 5000000 : pipelineScore >= 70 ? 1000000 : 100000;
      liquidity = pipelineScore >= 85 ? 2000000 : pipelineScore >= 70 ? 500000 : 50000;
      holders = pipelineScore >= 85 ? 10000 : pipelineScore >= 70 ? 3000 : 500;
    }

    // Tier eligibility
    const tier_eligibility = {
      tier1: volume >= 1000000 && holders >= 10000 && liquidity >= 500000,
      tier2: volume >= 500000 && holders >= 5000 && liquidity >= 200000,
      tier3: volume >= 100000 && holders >= 1000 && liquidity >= 50000,
      tier4: volume >= 10000 && holders >= 500 && liquidity >= 10000,
    };

    // Strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    if (pipelineScore >= 70) strengths.push({ category: 'score', label: 'Strong Pipeline Score (' + pipelineScore + '/100)', status: 'pass' });
    if (volume >= 100000) strengths.push({ category: 'volume', label: 'Healthy Trading Volume ($' + Math.round(volume).toLocaleString() + ')', status: 'pass' });
    if (liquidity >= 50000) strengths.push({ category: 'liquidity', label: 'Adequate Liquidity ($' + Math.round(liquidity).toLocaleString() + ')', status: 'pass' });
    if (holders >= 1000) strengths.push({ category: 'holders', label: 'Good Holder Count (' + holders.toLocaleString() + ')', status: 'pass' });
    if (sim?.consensus === 'BULLISH' || (sim?.recommendation && sim.recommendation.includes('PROCEED'))) strengths.push({ category: 'simulation', label: 'AI Simulation: PROCEED', status: 'pass' });

    if (pipelineScore < 70) weaknesses.push({ category: 'score', label: 'Low Pipeline Score', status: 'warning', recommendation: 'Improve safety, wallet distribution, and social metrics' });
    if (volume < 100000) weaknesses.push({ category: 'volume', label: 'Low Trading Volume', status: 'warning', recommendation: 'Sustain daily volume above $100K' });
    if (liquidity < 50000) weaknesses.push({ category: 'liquidity', label: 'Low Liquidity', status: 'warning', recommendation: 'Add liquidity to DEX pools (target $50K+)' });
    if (holders < 1000) weaknesses.push({ category: 'holders', label: 'Low Holder Count', status: 'warning', recommendation: 'Grow organic holder base to 1,000+' });
    weaknesses.push({ category: 'audit', label: 'No Formal Audit Detected', status: 'warning', recommendation: 'Get a smart contract audit from CertiK, Hacken, or similar' });

    // Exchange scores (0-100)
    const exchange_scores = {
      trading_volume: Math.min(100, Math.round((volume / 1000000) * 100)),
      liquidity_depth: Math.min(100, Math.round((liquidity / 500000) * 100)),
      holder_distribution: Math.min(100, Math.round((holders / 10000) * 100)),
      smart_contract: pipelineScore >= 85 ? 90 : pipelineScore >= 70 ? 75 : 50,
      community_health: pipelineScore >= 85 ? 70 : pipelineScore >= 70 ? 55 : 30,
      regulatory_readiness: 40,
    };

    // Technical data
    let technical = { rsi: null, macd: null, volume_trend: 'unknown', score: 50 };
    if (tech) {
      try {
        const ind = JSON.parse(tech.indicators_json || '{}');
        technical = { rsi: ind.rsi?.rsi || null, macd: ind.macd?.crossover || null, volume_trend: ind.volumeTrend?.trend || 'unknown', score: tech.technical_score || 50 };
      } catch {}
    }

    // Simulation data
    let simulation = null;
    if (sim) {
      simulation = {
        consensus: sim.consensus,
        confidence: sim.confidence,
        recommendation: sim.recommendation,
        score: sim.score,
      };
      // Parse JSON fields
      try { if (typeof sim.consensus === 'string' && sim.consensus.startsWith('{')) simulation.consensus = JSON.parse(sim.consensus).overall; } catch {}
    }

    // Next steps
    const next_steps = weaknesses.map(w => w.recommendation).filter(Boolean);

    res.json({
      success: true,
      address,
      chain: token?.chain || chain,
      ticker: token?.ticker || null,
      name: token?.name || null,
      readiness_pct,
      tier_eligibility,
      strengths,
      weaknesses,
      exchange_scores,
      technical,
      simulation,
      next_steps,
      pipeline_score: pipelineScore,
      in_pipeline: !!token,
      disclaimer: 'Estimated thresholds based on industry research. Actual requirements vary by exchange. Not financial advice.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
