/**
 * Listing Report — Unified Token Report
 * GET /api/v1/listing-report/:addressOrTicker
 *
 * Combines scan + score + safety + simulation into a single report.
 * If no simulation cached, suggests running POST /simulate-listing first.
 *
 * Buzz BD Agent | MiroFish MVP
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");

// GET /api/v1/listing-report/:addressOrTicker
router.get("/listing-report/:addressOrTicker", (req, res) => {
  try {
    const db = getDB();
    const param = req.params.addressOrTicker;

    if (!param) {
      return res.json({
        success: false,
        error: "addressOrTicker parameter required",
      });
    }

    // 1. Look up in pipeline_tokens by address OR ticker
    let token = null;
    try {
      token = db
        .prepare("SELECT * FROM pipeline_tokens WHERE address = ?")
        .get(param);
    } catch (e) {
      /* table may not exist */
    }

    if (!token) {
      try {
        token = db
          .prepare(
            "SELECT * FROM pipeline_tokens WHERE UPPER(ticker) = UPPER(?)",
          )
          .get(param);
      } catch (e) {
        /* table may not exist */
      }
    }

    if (!token) {
      return res.json({
        success: false,
        error: "Token not found in pipeline — scan first",
        hint: "POST /api/v1/score-token with { address, chain } to add to pipeline",
      });
    }

    // 2. Query token_scores
    let scores = null;
    try {
      scores = db
        .prepare("SELECT * FROM token_scores WHERE address = ?")
        .get(token.address);
    } catch (e) {
      /* table may not exist */
    }

    // 3. Query persona_signals (latest per persona)
    let personaSignals = [];
    try {
      personaSignals = db
        .prepare(
          `
        SELECT * FROM persona_signals
        WHERE token_address = ?
        ORDER BY scored_at DESC
        LIMIT 10
      `,
        )
        .all(token.address);
    } catch (e) {
      /* table may not exist */
    }

    // 4. Query simulation_results (new engine) then fall back to listing_simulations
    let simulation = null;
    try {
      simulation = db
        .prepare(
          `
        SELECT * FROM simulation_results
        WHERE token_address = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
        )
        .get(token.address);
    } catch (e) {
      /* table may not exist */
    }
    if (!simulation) {
      try {
        simulation = db
          .prepare(
            `
          SELECT * FROM listing_simulations
          WHERE token_address = ?
          ORDER BY id DESC
          LIMIT 1
        `,
          )
          .get(token.address);
      } catch (e) {
        /* table may not exist */
      }
    }

    // 5. Build unified report
    const report = {
      token: {
        address: token.address,
        ticker: token.ticker,
        name: token.name,
        chain: token.chain,
        stage: token.stage,
        pipeline_score: token.score,
        source: token.source,
        created_at: token.created_at,
        updated_at: token.updated_at,
      },
      scores: scores
        ? {
            total_score: scores.total_score,
            safety_score: scores.safety_score,
            wallet_score: scores.wallet_score,
            social_score: scores.social_score,
            market_cap: scores.market_cap,
            liquidity_usd: scores.liquidity_usd,
            volume_24h: scores.volume_24h,
            price_change_24h: scores.price_change_24h,
            scored_at: scores.scored_at || scores.created_at,
          }
        : null,
      persona_signals:
        personaSignals.length > 0
          ? personaSignals.map((ps) => ({
              persona: ps.persona_name,
              signal: ps.signal,
              confidence: ps.confidence,
              reasoning: ps.reasoning,
              bd_recommendation: ps.bd_recommendation,
              scored_at: ps.scored_at,
            }))
          : null,
      simulation: simulation
        ? {
            id: simulation.simulation_id || simulation.id,
            agents_count: simulation.agents_count || 20,
            score: simulation.score,
            probability: simulation.probability,
            confidence: simulation.confidence,
            confidence_interval: simulation.confidence_low
              ? {
                  low: simulation.confidence_low,
                  high: simulation.confidence_high,
                }
              : null,
            ev: simulation.ev,
            recommendation: simulation.recommendation,
            consensus: safeJSONParse(simulation.consensus),
            verdicts: safeJSONParse(
              simulation.verdicts_json || simulation.raw_verdicts,
            ),
            metrics: safeJSONParse(simulation.metrics_json),
            bullish_count: simulation.bullish_count,
            neutral_count: simulation.neutral_count,
            bearish_count: simulation.bearish_count,
            key_risk: simulation.key_risk,
            key_signal: simulation.key_signal,
            expected_impact: simulation.expected_impact,
            duration_ms: simulation.duration_ms,
            report_url: simulation.report_url,
            simulated_at: simulation.simulated_at || simulation.created_at,
          }
        : {
            message: "No simulation found — run one first",
            hint:
              'POST /api/v1/simulate-listing with { tokenAddress: "' +
              token.address +
              '", chain: "' +
              token.chain +
              '" }',
          },
    };

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error("[listing-report] Error:", err.message);
    res.json({ success: false, error: err.message });
  }
});

function safeJSONParse(str) {
  if (!str) return null;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

module.exports = router;
