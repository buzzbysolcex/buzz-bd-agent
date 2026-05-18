/**
 * Technical Analysis Routes — MiroFish P1-B4
 * GET /technical/:address — compute and return TA indicators
 *
 * Buzz BD Agent | MiroFish Integration
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { analyzeTechnical } = require("../lib/technical-analyst");

/**
 * GET /technical/:address?chain=solana
 * Returns technical analysis with 1-hour cache
 */
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const chain = req.query.chain || "solana";
    const db = getDB();

    // Check cache
    try {
      const cached = db
        .prepare(
          `SELECT technical_score, indicators_json, computed_at
         FROM technical_analysis_cache
         WHERE token_address = ? AND chain = ? AND expires_at > datetime('now')`,
        )
        .get(address, chain);

      if (cached) {
        const indicators = JSON.parse(cached.indicators_json || "{}");
        return res.json({
          success: true,
          technical_score: cached.technical_score,
          rsi: indicators.rsi || null,
          macd: indicators.macd || null,
          volumeTrend: indicators.volume || null,
          momentum: indicators.momentum || null,
          cached: true,
          computed_at: cached.computed_at,
        });
      }
    } catch {
      /* cache miss, compute fresh */
    }

    // Compute fresh analysis
    const result = await analyzeTechnical(address, chain);

    // Cache for 1 hour
    try {
      db.prepare(
        `INSERT OR REPLACE INTO technical_analysis_cache
         (token_address, chain, technical_score, indicators_json, computed_at, expires_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+60 minutes'))`,
      ).run(address, chain, result.technical_score, result.indicators_json);
    } catch (e) {
      console.error("[Technical] Cache write error:", e.message);
    }

    res.json({
      success: true,
      technical_score: result.technical_score,
      rsi: result.rsi,
      macd: result.macd,
      volumeTrend: result.volumeTrend,
      momentum: result.momentum,
      cached: false,
      computed_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
