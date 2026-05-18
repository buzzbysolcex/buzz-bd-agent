/**
 * MicroBuzz v2 — API Routes
 * ADR-010 | 500-agent hybrid AMM prediction market
 *
 * POST /api/v1/microbuzz/simulate/:address  — run simulation
 * GET  /api/v1/microbuzz/result/:address    — latest result
 * GET  /api/v1/microbuzz/history/:address   — all results
 * GET  /api/v1/microbuzz/status             — Ollama + queue status
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const {
  runSimulation,
  getTokenContext,
} = require("../lib/microbuzz-simulator");
const { checkOllamaHealth, stopModel } = require("../lib/microbuzz-ollama");

// Track running simulation
let currentSimulation = null;

// ─── Ensure tables exist ─────────────────────────────

function ensureTables() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS microbuzz_v2_simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      token_symbol TEXT,
      chain TEXT DEFAULT 'solana',
      round_1_price REAL,
      round_2_price REAL,
      round_3_price REAL,
      amm_final_price REAL,
      ev_score REAL,
      llm_agent_count INTEGER DEFAULT 30,
      heuristic_agent_count INTEGER DEFAULT 470,
      total_agent_count INTEGER DEFAULT 500,
      total_trades INTEGER,
      llm_consensus_r1 REAL,
      llm_consensus_r2 REAL,
      llm_consensus_r3 REAL,
      simulation_time_ms INTEGER,
      simulation_seed INTEGER,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS microbuzz_v2_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simulation_id INTEGER REFERENCES microbuzz_v2_simulations(id),
      round INTEGER,
      agent_id TEXT,
      agent_type TEXT,
      agent_persona TEXT,
      agent_risk TEXT,
      direction TEXT,
      amount REAL,
      price_before REAL,
      price_after REAL,
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Initialize tables on load
try {
  ensureTables();
} catch {}

// ─── POST /simulate/:address ─────────────────────────

router.post("/simulate/:address", async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || req.body?.chain || "solana";

  if (currentSimulation) {
    return res.status(409).json({
      error: "simulation_running",
      message: `Simulation already running for ${currentSimulation.symbol}`,
      started: currentSimulation.started,
    });
  }

  // Pre-flight: check Ollama
  const health = await checkOllamaHealth();
  if (!health.ready) {
    return res.status(503).json({
      error: "ollama_not_ready",
      health,
    });
  }

  // Get token context
  const tokenData = await getTokenContext(address, chain);
  tokenData.address = address;
  tokenData.chain = chain;

  currentSimulation = {
    address,
    symbol: tokenData.symbol || address.slice(0, 8),
    started: new Date().toISOString(),
  };

  // Return immediately, simulation runs in background
  res.json({
    message: "Simulation started",
    token: tokenData.symbol || address,
    chain,
    estimated_time: "~27 minutes",
    status_endpoint: `/api/v1/microbuzz/status`,
  });

  // Run simulation in background
  try {
    const result = await runSimulation(tokenData);

    if (result.success) {
      saveSimulation(result);
    }
  } catch (e) {
    // Log error but don't crash
    console.error("[microbuzz-v2] Simulation failed:", e.message);
  } finally {
    currentSimulation = null;
  }
});

// ─── GET /result/:address ────────────────────────────

router.get("/result/:address", (req, res) => {
  const db = getDB();
  const chain = req.query.chain || "solana";

  const row = db
    .prepare(
      `
    SELECT * FROM microbuzz_v2_simulations
    WHERE token_address = ? AND chain = ?
    ORDER BY created_at DESC LIMIT 1
  `,
    )
    .get(req.params.address, chain);

  if (!row) {
    return res.status(404).json({ error: "no_simulation_found" });
  }

  res.json({ simulation: row });
});

// ─── GET /history/:address ───────────────────────────

router.get("/history/:address", (req, res) => {
  const db = getDB();
  const chain = req.query.chain || "solana";
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const rows = db
    .prepare(
      `
    SELECT * FROM microbuzz_v2_simulations
    WHERE token_address = ? AND chain = ?
    ORDER BY created_at DESC LIMIT ?
  `,
    )
    .all(req.params.address, chain, limit);

  res.json({ count: rows.length, simulations: rows });
});

// ─── GET /status ─────────────────────────────────────

router.get("/status", async (req, res) => {
  const health = await checkOllamaHealth();
  const db = getDB();

  let totalSims = 0;
  let totalTrades = 0;
  try {
    totalSims =
      db.prepare("SELECT COUNT(*) as c FROM microbuzz_v2_simulations").get()
        ?.c || 0;
    totalTrades =
      db.prepare("SELECT COUNT(*) as c FROM microbuzz_v2_trades").get()?.c || 0;
  } catch {}

  res.json({
    version: "v2",
    ollama: health,
    running: currentSimulation,
    agents: { llm: 30, heuristic: 470, total: 500 },
    rounds: 3,
    model: "qwen3:14b",
    stats: { total_simulations: totalSims, total_trades: totalTrades },
  });
});

// ─── Save simulation to DB ───────────────────────────

function saveSimulation(result) {
  const db = getDB();
  ensureTables();

  const simInsert = db.prepare(`
    INSERT INTO microbuzz_v2_simulations (
      token_address, token_symbol, chain,
      round_1_price, round_2_price, round_3_price, amm_final_price, ev_score,
      llm_agent_count, heuristic_agent_count, total_agent_count, total_trades,
      llm_consensus_r1, llm_consensus_r2, llm_consensus_r3,
      simulation_time_ms, simulation_seed, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const simResult = simInsert.run(
    result.token_address,
    result.token_symbol,
    result.chain,
    result.round_1_price,
    result.round_2_price,
    result.round_3_price,
    result.amm_final_price,
    result.ev_score,
    result.llm_agent_count,
    result.heuristic_agent_count,
    result.total_agent_count,
    result.total_trades,
    result.llm_consensus_r1,
    result.llm_consensus_r2,
    result.llm_consensus_r3,
    result.simulation_time_ms,
    result.simulation_seed,
    "completed",
  );

  const simId = simResult.lastInsertRowid;

  // Insert all trades in a transaction
  const tradeInsert = db.prepare(`
    INSERT INTO microbuzz_v2_trades (
      simulation_id, round, agent_id, agent_type, agent_persona, agent_risk,
      direction, amount, price_before, price_after, reasoning
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTrades = db.transaction((trades) => {
    for (const t of trades) {
      tradeInsert.run(
        simId,
        t.round,
        t.agent_id,
        t.agent_type,
        t.agent_persona,
        t.agent_risk,
        t.direction,
        t.amount,
        t.price_before,
        t.price_after,
        (t.reasoning || "").slice(0, 500),
      );
    }
  });

  insertTrades(result.trades || []);

  return simId;
}

module.exports = router;
