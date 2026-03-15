/**
 * Simulate Listing — 6-Persona Market Impact Simulation
 * POST /api/v1/simulate/simulate-listing
 *
 * Dispatches all 6 persona agents (4 original + 2 new) against a listing scenario
 * to predict market reaction and consensus BD recommendation.
 *
 * Buzz BD Agent v7.5.0 | Bags.fm-First
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// POST /api/v1/simulate/simulate-listing
router.post('/simulate-listing', async (req, res) => {
  try {
    const { address, chain, scenario } = req.body;
    if (!address || !chain || !scenario) {
      return res.json({ success: false, error: 'address, chain, scenario required' });
    }

    const db = getDB();

    // 1. Pull existing scan data
    let tokenData = null;
    try {
      tokenData = db.prepare('SELECT * FROM token_scores WHERE address = ?').get(address);
    } catch (e) { /* table may not exist */ }

    let bagsData = null;
    try {
      bagsData = db.prepare('SELECT * FROM bags_tokens WHERE token_mint = ?').get(address);
    } catch (e) { /* table may not exist */ }

    // 2. Build context for personas
    const context = {
      scannerData: tokenData ? {
        name: tokenData.name || address,
        symbol: tokenData.symbol,
        market_cap: tokenData.market_cap,
        liquidity_usd: tokenData.liquidity_usd,
        volume_24h: tokenData.volume_24h,
        price_change_24h: tokenData.price_change_24h,
      } : { name: address, address },
      safetyData: {},
      walletData: {},
      socialData: {},
      safetyScore: tokenData?.safety_score || 50,
      walletScore: tokenData?.wallet_score || 50,
      socialScore: tokenData?.social_score || 50,
      bags: bagsData,
      scenario,
      timestamp: new Date().toISOString()
    };

    // 3. Import all 6 personas
    const degenAgent = require('/opt/buzz-api/services/agents/personas/degen-agent');
    const whaleAgent = require('/opt/buzz-api/services/agents/personas/whale-agent');
    const institutionalAgent = require('/opt/buzz-api/services/agents/personas/institutional-agent');
    const communityAgent = require('/opt/buzz-api/services/agents/personas/community-agent');
    const competitorAgent = require('/opt/buzz-api/services/agents/personas/competitor-exchange-agent');
    const narrativeAgent = require('/opt/buzz-api/services/agents/personas/narrative-trader-agent');

    // 4. Dispatch all 6 in parallel (same pattern as orchestrator.js)
    const results = await Promise.allSettled([
      degenAgent.analyzeToken(context, null),
      whaleAgent.analyzeToken(context, null),
      institutionalAgent.analyzeToken(context, null),
      communityAgent.analyzeToken(context, null),
      competitorAgent.analyzeToken(context, null),
      narrativeAgent.analyzeToken(context, null),
    ]);

    // 5. Aggregate consensus
    const fulfilled = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const bullish = fulfilled.filter(r => r.signal === 'bullish').length;
    const neutral = fulfilled.filter(r => r.signal === 'neutral').length;
    const bearish = fulfilled.filter(r => r.signal === 'bearish').length;

    const consensus = {
      overall: bullish > bearish + neutral ? 'bullish' : bearish > bullish ? 'bearish' : 'mixed',
      bullish_count: bullish,
      neutral_count: neutral,
      bearish_count: bearish,
      total_personas: fulfilled.length,
      expected_impact: bullish >= 4 ? '+15-25% in 24h' : bullish >= 2 ? '+5-15% in 24h' : 'minimal',
    };

    // 6. Store in listing_simulations table
    try {
      db.prepare(`INSERT INTO listing_simulations
        (token_address, chain, scenario, persona_results, consensus, bullish_count, neutral_count, bearish_count, expected_impact, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        address, chain, scenario,
        JSON.stringify(fulfilled),
        JSON.stringify(consensus),
        bullish, neutral, bearish,
        consensus.expected_impact,
        new Date().toISOString()
      );
    } catch (e) {
      console.error('[simulate] DB insert error:', e.message);
    }

    // 7. Return
    res.json({
      success: true,
      simulation: {
        token: address,
        chain,
        scenario,
        persona_results: fulfilled,
        consensus
      }
    });
  } catch (err) {
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

module.exports = router;
