/**
 * MiroFish Simulation Routes — store + query results
 * v9.0 | Feature-gated by MIROFISH_REALTIME
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { feature } = require("../lib/feature-flags");

// Store simulation results
router.post("/store", (req, res) => {
  if (!feature("MIROFISH_REALTIME"))
    return res.status(404).json({ error: "MiroFish disabled" });
  const db = getDB();

  const {
    token_address,
    token_symbol,
    chain,
    total_agents,
    llm_agents,
    heuristic_agents,
    rounds,
    duration_seconds,
    ollama_calls,
    cost_usd,
    final_belief,
    consensus,
    cluster_degen,
    cluster_community,
    cluster_market_dynamics,
    cluster_whale,
    cluster_institutional,
    monte_carlo_result,
    monte_carlo_iterations,
    monte_carlo_time_ms,
    simulation_hash,
    raw_results,
  } = req.body;

  if (!token_address || !token_symbol || final_belief == null || !consensus) {
    return res.status(400).json({
      error:
        "Missing required fields: token_address, token_symbol, final_belief, consensus",
    });
  }

  try {
    const result = db
      .prepare(
        `
      INSERT INTO mirofish_simulations (
        token_address, token_symbol, chain,
        total_agents, llm_agents, heuristic_agents,
        rounds, duration_seconds, ollama_calls, cost_usd,
        final_belief, consensus,
        cluster_degen, cluster_community, cluster_market_dynamics,
        cluster_whale, cluster_institutional,
        monte_carlo_result, monte_carlo_iterations, monte_carlo_time_ms,
        simulation_hash, raw_results
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        token_address,
        token_symbol,
        chain || "solana",
        total_agents || 1000,
        llm_agents || 200,
        heuristic_agents || 800,
        rounds || 20,
        duration_seconds,
        ollama_calls,
        cost_usd || 0,
        final_belief,
        consensus,
        cluster_degen,
        cluster_community,
        cluster_market_dynamics,
        cluster_whale,
        cluster_institutional,
        monte_carlo_result,
        monte_carlo_iterations,
        monte_carlo_time_ms,
        simulation_hash,
        raw_results ? JSON.stringify(raw_results) : null,
      );
    res.json({ id: result.lastInsertRowid, status: "stored" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get by token address
router.get("/token/:address", (req, res) => {
  if (!feature("MIROFISH_REALTIME"))
    return res.status(404).json({ error: "MiroFish disabled" });
  const db = getDB();
  const sims = db
    .prepare(
      `SELECT * FROM mirofish_simulations WHERE token_address = ? ORDER BY created_at DESC`,
    )
    .all(req.params.address);
  res.json({
    token: req.params.address,
    simulations: sims,
    count: sims.length,
  });
});

// Latest for token
router.get("/token/:address/latest", (req, res) => {
  if (!feature("MIROFISH_REALTIME"))
    return res.status(404).json({ error: "MiroFish disabled" });
  const db = getDB();
  const sim = db
    .prepare(
      `SELECT * FROM mirofish_simulations WHERE token_address = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(req.params.address);
  if (!sim) return res.status(404).json({ error: "No simulation found" });
  res.json(sim);
});

// List all (paginated)
router.get("/list", (req, res) => {
  if (!feature("MIROFISH_REALTIME"))
    return res.status(404).json({ error: "MiroFish disabled" });
  const db = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  const sims = db
    .prepare(
      `SELECT id, token_address, token_symbol, chain, total_agents, rounds, final_belief, consensus, cluster_institutional, duration_seconds, cost_usd, created_at FROM mirofish_simulations ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset);
  const total = db
    .prepare("SELECT COUNT(*) as cnt FROM mirofish_simulations")
    .get();
  res.json({ simulations: sims, total: total.cnt, limit, offset });
});

// Stats
router.get("/stats", (req, res) => {
  if (!feature("MIROFISH_REALTIME"))
    return res.status(404).json({ error: "MiroFish disabled" });
  const db = getDB();
  const stats = db
    .prepare(
      `SELECT COUNT(*) as total_simulations, SUM(total_agents) as total_agent_rounds, SUM(ollama_calls) as total_ollama_calls, SUM(cost_usd) as total_cost, AVG(final_belief) as avg_belief, MIN(final_belief) as min_belief, MAX(final_belief) as max_belief, AVG(duration_seconds) as avg_duration FROM mirofish_simulations`,
    )
    .get();
  res.json(stats);
});

module.exports = router;
