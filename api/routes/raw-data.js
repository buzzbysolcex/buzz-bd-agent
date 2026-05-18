/**
 * Raw Data Endpoints — Project Opus Brain
 * Exposes raw agent data for Claude Code (the brain) to consume directly.
 *
 * GET /api/v1/scan/raw/:address         — Raw scanner data (DexScreener + CMC)
 * GET /api/v1/safety/raw/:address       — Raw safety data (RugCheck)
 * GET /api/v1/wallet/raw/:address       — Raw wallet data (Helius)
 * GET /api/v1/social/raw/:address       — Raw social data (ATV + Serper + Grok)
 * GET /api/v1/scores/components/:address — All sub-scores for a token
 * GET /api/v1/technical/raw/:address    — Raw technical indicators (RSI/MACD/volume)
 * GET /api/v1/simulate/data/:address    — All data needed for simulation
 * GET /api/v1/outcomes/:address         — 30/60/90 day listing outcome tracking
 * POST /api/v1/outcomes/:address        — Record an outcome
 * POST /api/v1/calibration/run          — Trigger prediction calibration
 * GET /api/v1/calibration/results       — View calibration history
 *
 * Buzz BD Agent | Project Opus Brain
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");

// Agent imports
const { runScannerAgent } = require("../services/agents/scanner");
const { runSafetyAgent } = require("../services/agents/safety");
const { runWalletAgent } = require("../services/agents/wallet");
const { runSocialAgent } = require("../services/agents/social");
const { runScorerAgent } = require("../services/agents/scorer");
const { analyzeTechnical } = require("../lib/technical-analyst");

// ============================================================
// Phase 2: Scanner Raw Data
// ============================================================
router.get("/scan/raw/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-scan-${Date.now()}`;

  try {
    const result = await runScannerAgent({ address, chain, requestId });
    res.json({
      disclaimer: "QUICK SCORE — NOT PIPELINE VERIFIED",
      max_classification: "WARM",
      address,
      chain,
      raw: result.data,
      tokenName: result.tokenName,
      tokenSymbol: result.tokenSymbol,
      marketCap: result.marketCap,
      liquidity: result.liquidity,
      priceUsd: result.priceUsd,
      dexscreenerUrl: result.dexscreenerUrl,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "SCANNER_ERROR" });
  }
});

// ============================================================
// Phase 3: Safety Raw Data
// ============================================================
router.get("/safety/raw/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-safety-${Date.now()}`;

  try {
    const result = await runSafetyAgent({ address, chain, requestId });
    res.json({
      address,
      chain,
      score: result.score,
      raw: result.data,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "SAFETY_ERROR" });
  }
});

// ============================================================
// Phase 4: Wallet Raw Data
// ============================================================
router.get("/wallet/raw/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-wallet-${Date.now()}`;

  try {
    const result = await runWalletAgent({ address, chain, requestId });
    res.json({
      address,
      chain,
      score: result.score,
      raw: result.data,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "WALLET_ERROR" });
  }
});

// ============================================================
// Phase 5: Social Raw Data
// ============================================================
router.get("/social/raw/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-social-${Date.now()}`;

  try {
    const result = await runSocialAgent({ address, chain, requestId });
    res.json({
      address,
      chain,
      score: result.score,
      raw: result.data,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "SOCIAL_ERROR" });
  }
});

// ============================================================
// Phase 6: Score Components
// ============================================================
router.get("/scores/components/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-scores-${Date.now()}`;

  try {
    // Run scanner first (other agents need its data)
    const scannerResult = await runScannerAgent({ address, chain, requestId });

    // Run safety, wallet, social in parallel
    const [safetyResult, walletResult, socialResult] = await Promise.allSettled(
      [
        runSafetyAgent({ address, chain, requestId }),
        runWalletAgent({ address, chain, requestId }),
        runSocialAgent({ address, chain, requestId }),
      ],
    );

    const safety =
      safetyResult.status === "fulfilled"
        ? safetyResult.value
        : { score: 0, data: null };
    const wallet =
      walletResult.status === "fulfilled"
        ? walletResult.value
        : { score: 0, data: null };
    const social =
      socialResult.status === "fulfilled"
        ? socialResult.value
        : { score: 0, data: null };

    // Run scorer with all data
    const scorerResult = await runScorerAgent({
      address,
      chain,
      requestId,
      scannerData: scannerResult.data,
      safetyData: safety.data,
      walletData: wallet.data,
      socialData: social.data,
      safetyScore: safety.score || 0,
      walletScore: wallet.score || 0,
      socialScore: social.score || 0,
    });

    // Run technical analysis
    const technical = await analyzeTechnical(address, chain);

    // Quick scan cap: max classification WARM, never HOT
    const quickClassification =
      scorerResult.score >= 70
        ? "WARM"
        : scorerResult.score >= 40
          ? "WATCH"
          : "SKIP";
    res.json({
      disclaimer: "QUICK SCORE — NOT PIPELINE VERIFIED",
      max_classification: quickClassification,
      address,
      chain,
      composite_score: scorerResult.score,
      bd_target: scorerResult.bd_target,
      components: {
        scanner: {
          score: 0,
          data: scannerResult.data,
          duration_ms: scannerResult.duration_ms,
        },
        safety: {
          score: safety.score,
          data: safety.data,
          duration_ms: safety.duration_ms,
        },
        wallet: {
          score: wallet.score,
          data: wallet.data,
          duration_ms: wallet.duration_ms,
        },
        social: {
          score: social.score,
          data: social.data,
          duration_ms: social.duration_ms,
        },
        scorer: {
          score: scorerResult.score,
          data: scorerResult.data,
          duration_ms: scorerResult.duration_ms,
        },
        technical: { score: technical.technical_score, data: technical },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "SCORES_ERROR" });
  }
});

// ============================================================
// Phase 7: Technical Raw Data
// ============================================================
router.get("/technical/raw/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";

  try {
    const result = await analyzeTechnical(address, chain);
    res.json({
      address,
      chain,
      score: result.technical_score,
      raw: {
        rsi: result.rsi,
        macd: result.macd,
        volumeTrend: result.volumeTrend,
        momentum: result.momentum,
        source: result.source,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "TECHNICAL_ERROR" });
  }
});

// ============================================================
// Phase 8: Simulation Data (all data needed for Claude Code simulation)
// ============================================================
router.get("/simulate/data/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || "solana";
  const requestId = `raw-sim-${Date.now()}`;

  try {
    // Run all agents in parallel
    const [scannerResult, safetyResult, walletResult, socialResult] =
      await Promise.allSettled([
        runScannerAgent({ address, chain, requestId }),
        runSafetyAgent({ address, chain, requestId }),
        runWalletAgent({ address, chain, requestId }),
        runSocialAgent({ address, chain, requestId }),
      ]);

    const scanner =
      scannerResult.status === "fulfilled"
        ? scannerResult.value
        : { score: 0, data: null };
    const safety =
      safetyResult.status === "fulfilled"
        ? safetyResult.value
        : { score: 0, data: null };
    const wallet =
      walletResult.status === "fulfilled"
        ? walletResult.value
        : { score: 0, data: null };
    const social =
      socialResult.status === "fulfilled"
        ? socialResult.value
        : { score: 0, data: null };

    // Scorer + Technical
    const [scorerResult, technical] = await Promise.all([
      runScorerAgent({
        address,
        chain,
        requestId,
        scannerData: scanner.data,
        safetyData: safety.data,
        walletData: wallet.data,
        socialData: social.data,
        safetyScore: safety.score || 0,
        walletScore: wallet.score || 0,
        socialScore: social.score || 0,
      }),
      analyzeTechnical(address, chain),
    ]);

    // DB lookups for historical data
    const db = getDB();
    let pipelineToken = null;
    let previousSimulations = [];
    try {
      pipelineToken = db
        .prepare("SELECT * FROM pipeline_tokens WHERE address = ?")
        .get(address);
    } catch {}
    try {
      previousSimulations = db
        .prepare(
          "SELECT * FROM simulation_results WHERE token_address = ? ORDER BY created_at DESC LIMIT 5",
        )
        .all(address);
    } catch {}

    res.json({
      address,
      chain,
      tokenName: scanner.tokenName,
      tokenSymbol: scanner.tokenSymbol,
      composite_score: scorerResult.score,
      bd_target: scorerResult.bd_target,
      scanner: scanner.data,
      safety: { score: safety.score, data: safety.data },
      wallet: { score: wallet.score, data: wallet.data },
      social: { score: social.score, data: social.data },
      scorer: { score: scorerResult.score, data: scorerResult.data },
      technical: {
        score: technical.technical_score,
        rsi: technical.rsi,
        macd: technical.macd,
        volumeTrend: technical.volumeTrend,
        momentum: technical.momentum,
      },
      pipeline: pipelineToken,
      previous_simulations: previousSimulations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "SIMULATE_DATA_ERROR" });
  }
});

// ============================================================
// Phase 10: Outcomes Tracking
// ============================================================
router.get("/outcomes/:address", (req, res) => {
  const { address } = req.params;
  const db = getDB();

  try {
    const outcomes = db
      .prepare(
        "SELECT * FROM listing_outcomes WHERE token_address = ? ORDER BY recorded_at DESC",
      )
      .all(address);
    res.json({ address, outcomes });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "OUTCOMES_ERROR" });
  }
});

router.post("/outcomes/:address", (req, res) => {
  const { address } = req.params;
  const { chain, day, price_usd, market_cap, volume_24h, holder_count, notes } =
    req.body;
  const db = getDB();

  try {
    db.prepare(
      `
      INSERT INTO listing_outcomes (token_address, chain, day, price_usd, market_cap, volume_24h, holder_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      address,
      chain || "solana",
      day || 30,
      price_usd,
      market_cap,
      volume_24h,
      holder_count,
      notes,
    );

    res.json({ ok: true, address, day });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "OUTCOMES_INSERT_ERROR" });
  }
});

// ============================================================
// Score Calibration — MCap/Liquidity penalty pass
// ============================================================
router.post("/calibrate", async (req, res) => {
  try {
    const { calibrateScores } = require("../lib/score-calibrator");
    const result = await calibrateScores();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "CALIBRATE_ERROR" });
  }
});

// ============================================================
// Phase 10: Calibration
// ============================================================
router.post("/calibration/run", async (req, res) => {
  const db = getDB();

  try {
    // Get tokens that have both predictions and outcomes
    const tokens = db
      .prepare(
        `
      SELECT DISTINCT lo.token_address, lo.chain
      FROM listing_outcomes lo
      JOIN simulation_results sr ON sr.token_address = lo.token_address
    `,
      )
      .all();

    const calibrationResults = [];

    for (const token of tokens) {
      const outcomes = db
        .prepare(
          "SELECT * FROM listing_outcomes WHERE token_address = ? ORDER BY day ASC",
        )
        .all(token.token_address);

      const prediction = db
        .prepare(
          "SELECT * FROM simulation_results WHERE token_address = ? ORDER BY created_at DESC LIMIT 1",
        )
        .get(token.token_address);

      if (prediction && outcomes.length > 0) {
        const latestOutcome = outcomes[outcomes.length - 1];
        const predictedScore = prediction.score || 0;
        const actualPerformance =
          latestOutcome.price_usd > 0 ? "positive" : "negative";

        calibrationResults.push({
          token_address: token.token_address,
          predicted_score: predictedScore,
          predicted_recommendation: prediction.recommendation,
          actual_outcome: actualPerformance,
          outcome_day: latestOutcome.day,
          accuracy:
            (predictedScore >= 50 && actualPerformance === "positive") ||
            (predictedScore < 50 && actualPerformance === "negative")
              ? "correct"
              : "incorrect",
        });
      }
    }

    // Store calibration run
    const runId = `cal_${Date.now()}`;
    db.prepare(
      `
      INSERT INTO calibration_runs (run_id, token_count, correct_count, accuracy_pct, results_json)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      runId,
      calibrationResults.length,
      calibrationResults.filter((r) => r.accuracy === "correct").length,
      calibrationResults.length > 0
        ? Math.round(
            (calibrationResults.filter((r) => r.accuracy === "correct").length /
              calibrationResults.length) *
              100,
          )
        : 0,
      JSON.stringify(calibrationResults),
    );

    res.json({
      run_id: runId,
      tokens_evaluated: calibrationResults.length,
      correct: calibrationResults.filter((r) => r.accuracy === "correct")
        .length,
      incorrect: calibrationResults.filter((r) => r.accuracy === "incorrect")
        .length,
      accuracy_pct:
        calibrationResults.length > 0
          ? Math.round(
              (calibrationResults.filter((r) => r.accuracy === "correct")
                .length /
                calibrationResults.length) *
                100,
            )
          : 0,
      results: calibrationResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "CALIBRATION_ERROR" });
  }
});

router.get("/calibration/results", (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit || "10");

  try {
    const runs = db
      .prepare(
        "SELECT * FROM calibration_runs ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit);

    res.json({ count: runs.length, runs });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message, code: "CALIBRATION_RESULTS_ERROR" });
  }
});

module.exports = router;
