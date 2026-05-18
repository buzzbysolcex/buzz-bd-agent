/**
 * Whale Signal Intelligence Routes
 * Nansen Hyperliquid smart money perp data
 * 3 endpoints: summary, single token, sweep trigger
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const {
  runWhaleSignalSweep,
  getWhaleSignalFromCache,
  resolveToHyperliquidSymbol,
} = require("../lib/whale-signal-intel");

// GET /whale-signal/summary — all cached whale signals
router.get("/summary", (req, res) => {
  try {
    const db = getDB();
    const rows = db
      .prepare(
        "SELECT * FROM whale_signal_cache ORDER BY whale_signal_score DESC",
      )
      .all();
    const bullish = rows.filter((r) => r.whale_signal_score >= 80);
    const moderate = rows.filter(
      (r) => r.whale_signal_score >= 60 && r.whale_signal_score < 80,
    );
    const bearish = rows.filter((r) => r.bearish_flag);
    res.json({
      success: true,
      total: rows.length,
      bullish: bullish.length,
      moderate: moderate.length,
      bearish_flags: bearish.length,
      signals: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /whale-signal/:symbol — single token whale signal
router.get("/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let data = getWhaleSignalFromCache(symbol);
    if (!data) {
      // Try fetching fresh
      const { hasPerp } = await resolveToHyperliquidSymbol(symbol);
      if (!hasPerp)
        return res.json({
          success: true,
          symbol,
          hasPerp: false,
          whale_signal_score: 50,
          message: "No Hyperliquid perp for this token",
        });
      return res.json({
        success: true,
        symbol,
        hasPerp: true,
        cached: false,
        message: "No cached data. Run /whale-signal/sweep to fetch.",
      });
    }
    // Parse JSON fields
    let breakdown = null,
      rawData = null;
    try {
      breakdown = JSON.parse(data.score_breakdown_json);
    } catch (e) {
      /* invalid JSON */
    }
    try {
      rawData = JSON.parse(data.raw_data_json);
    } catch (e) {
      /* invalid JSON */
    }
    res.json({
      success: true,
      symbol,
      cached: true,
      whale_signal_score: data.whale_signal_score,
      sm_net_flow: data.sm_net_flow_direction,
      sm_longs: data.sm_longs_count,
      sm_shorts: data.sm_shorts_count,
      sm_total_value: data.sm_total_value_usd,
      buy_sell_pressure: data.buy_sell_pressure,
      funding_rate: data.funding_rate,
      open_interest: data.open_interest,
      bearish_flag: !!data.bearish_flag,
      breakdown,
      positions_sample: rawData?.positions || [],
      computed_at: data.computed_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /whale-signal/sweep — trigger manual sweep (admin only)
router.post("/sweep", async (req, res) => {
  try {
    const results = await runWhaleSignalSweep();
    const bullish = results.filter((r) => r.score >= 80);
    const bearish = results.filter((r) => r.bearishFlag);
    res.json({
      success: true,
      total: results.length,
      with_perps: results.filter((r) => r.hasPerp).length,
      bullish_count: bullish.length,
      bearish_flags: bearish.length,
      results: results.map((r) => ({
        ticker: r.ticker,
        score: r.score,
        hasPerp: r.hasPerp,
        bearishFlag: r.bearishFlag,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
