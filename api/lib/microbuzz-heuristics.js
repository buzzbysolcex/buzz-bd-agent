/**
 * MicroBuzz v2 — 470 Heuristic Market Agents
 * ADR-010 | Pure JS, instant execution, NEVER queries Ollama
 *
 * 150 Momentum Followers: buy LLM majority direction
 * 100 Contrarians: bet against LLM majority
 * 120 Noise Traders: random small trades (seeded PRNG)
 * 100 Threshold Followers: trade only at price extremes
 */

const { agentTrade, getPrice } = require("./microbuzz-amm");

// ─── Seeded PRNG (reproducible noise) ────────────────

function createSeededRNG(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Agent Generators ────────────────────────────────

function generateHeuristicAgents() {
  const agents = [];
  let id = 0;

  for (let i = 0; i < 150; i++) {
    agents.push({
      id: `momentum_${++id}`,
      type: "momentum",
      subtype: "heuristic",
    });
  }
  for (let i = 0; i < 100; i++) {
    agents.push({
      id: `contrarian_${++id}`,
      type: "contrarian",
      subtype: "heuristic",
    });
  }
  for (let i = 0; i < 120; i++) {
    agents.push({ id: `noise_${++id}`, type: "noise", subtype: "heuristic" });
  }
  for (let i = 0; i < 100; i++) {
    agents.push({
      id: `threshold_${++id}`,
      type: "threshold",
      subtype: "heuristic",
    });
  }

  return agents;
}

// ─── Momentum Followers (150) ────────────────────────
// Buy same direction as LLM majority
// Size proportional to LLM consensus strength

function executeMomentumFollowers(agents, llmSummary, market, round, rng) {
  const trades = [];
  const direction = llmSummary.majority_direction;
  const strength = llmSummary.consensus_strength; // 0.5 to 1.0

  // Shuffle order to prevent position bias
  const shuffled = [...agents].sort(() => rng() - 0.5);

  for (const agent of shuffled) {
    // Base amount $5-25, scaled by consensus strength
    const baseAmount = 5 + rng() * 20;
    const amount = baseAmount * (0.5 + strength); // stronger consensus = bigger trades

    const result = agentTrade(market, agent.id, "momentum", direction, amount, {
      round,
      persona: "momentum_follower",
    });
    if (result.success) trades.push(result.trade);
  }

  return trades;
}

// ─── Contrarians (100) ───────────────────────────────
// Bet AGAINST LLM majority
// Size inversely proportional to consensus (strong consensus = small contrarian bets)

function executeContrarians(agents, llmSummary, market, round, rng) {
  const trades = [];
  const direction = llmSummary.majority_direction === "YES" ? "NO" : "YES";
  const strength = llmSummary.consensus_strength;

  const shuffled = [...agents].sort(() => rng() - 0.5);

  for (const agent of shuffled) {
    // Inverse sizing: strong LLM consensus = small contrarian bets
    const baseAmount = 5 + rng() * 15;
    const amount = baseAmount * (1.5 - strength); // weaker consensus = bigger contrarian

    const result = agentTrade(
      market,
      agent.id,
      "contrarian",
      direction,
      amount,
      {
        round,
        persona: "contrarian",
      },
    );
    if (result.success) trades.push(result.trade);
  }

  return trades;
}

// ─── Noise Traders (120) ─────────────────────────────
// Random direction, random small amounts ($5-20)
// Purpose: adds liquidity, market realism

function executeNoiseTraders(agents, market, round, rng) {
  const trades = [];

  const shuffled = [...agents].sort(() => rng() - 0.5);

  for (const agent of shuffled) {
    const direction = rng() > 0.5 ? "YES" : "NO";
    const amount = 5 + rng() * 15; // $5-20

    const result = agentTrade(market, agent.id, "noise", direction, amount, {
      round,
      persona: "noise_trader",
    });
    if (result.success) trades.push(result.trade);
  }

  return trades;
}

// ─── Threshold Followers (100) ───────────────────────
// Only trade when price > 0.60 (buy YES) or < 0.40 (buy NO)
// Size increases with distance from 0.50

function executeThresholdFollowers(agents, market, round, rng) {
  const trades = [];
  const currentPrice = getPrice(market);

  const shuffled = [...agents].sort(() => rng() - 0.5);

  for (const agent of shuffled) {
    let direction = null;
    let amount = 0;

    if (currentPrice > 0.6) {
      // Bullish breakout — buy YES
      direction = "YES";
      const distance = currentPrice - 0.5;
      amount = 10 + distance * 100 + rng() * 10; // bigger as price rises
    } else if (currentPrice < 0.4) {
      // Bearish breakdown — buy NO
      direction = "NO";
      const distance = 0.5 - currentPrice;
      amount = 10 + distance * 100 + rng() * 10;
    }
    // Between 0.40-0.60: do nothing (wait and see)

    if (direction) {
      const result = agentTrade(
        market,
        agent.id,
        "threshold",
        direction,
        amount,
        {
          round,
          persona: "threshold_follower",
        },
      );
      if (result.success) trades.push(result.trade);
    }
  }

  return trades;
}

// ─── Execute All Heuristics ──────────────────────────

function executeAllHeuristics(market, llmSummary, round, seed) {
  const agents = generateHeuristicAgents();
  const rng = createSeededRNG(seed + round * 1000);

  const momentum = agents.filter((a) => a.type === "momentum");
  const contrarian = agents.filter((a) => a.type === "contrarian");
  const noise = agents.filter((a) => a.type === "noise");
  const threshold = agents.filter((a) => a.type === "threshold");

  const momentumTrades = executeMomentumFollowers(
    momentum,
    llmSummary,
    market,
    round,
    rng,
  );
  const contrarianTrades = executeContrarians(
    contrarian,
    llmSummary,
    market,
    round,
    rng,
  );
  const noiseTrades = executeNoiseTraders(noise, market, round, rng);
  const thresholdTrades = executeThresholdFollowers(
    threshold,
    market,
    round,
    rng,
  );

  return {
    momentum: momentumTrades.length,
    contrarian: contrarianTrades.length,
    noise: noiseTrades.length,
    threshold: thresholdTrades.length,
    total:
      momentumTrades.length +
      contrarianTrades.length +
      noiseTrades.length +
      thresholdTrades.length,
  };
}

module.exports = {
  generateHeuristicAgents,
  executeMomentumFollowers,
  executeContrarians,
  executeNoiseTraders,
  executeThresholdFollowers,
  executeAllHeuristics,
};
