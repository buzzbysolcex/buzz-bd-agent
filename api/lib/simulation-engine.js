/**
 * Enhanced Simulation Engine — MiroFish P1-B (v7.8.0)
 * 5 Personas x 10 Weight Variations = 50 Agent Verdicts
 *
 * Integrates with:
 *   - Rule-based verdicts (Project Opus Brain — no external LLM calls)
 *   - pipeline_tokens + token_scores (DB)
 *   - persona agents at api/services/agents/personas/
 *   - financial-datasets MCP (optional)
 *
 * Buzz BD Agent | SolCex
 */

const { getDB } = require("../db");

// Optional: Financial Datasets MCP integration
let financialDatasets;
try {
  financialDatasets = require("../intel/financial-datasets-mcp");
} catch {}

// ─── Persona Definitions (5 personas × 10 variations = 50 agents) ─────
const PERSONAS = {
  degen: { baseWeight: 0.15, focus: "momentum, narrative, hype" },
  whale: { baseWeight: 0.25, focus: "smart money, accumulation, liquidity" },
  institutional: { baseWeight: 0.35, focus: "audit, KYC, compliance, risk" },
  community: {
    baseWeight: 0.25,
    focus: "organic growth, dev activity, holder loyalty",
  },
  technical_trader: {
    baseWeight: 0.2,
    focus:
      "RSI, MACD, volume trends, price momentum, chart patterns, support/resistance",
  },
};

// 10 variation axes per persona
const VARIATIONS = [
  {
    risk_tolerance: "ultra_conservative",
    time_horizon: "long_term",
    experience: "veteran",
  },
  {
    risk_tolerance: "conservative",
    time_horizon: "long_term",
    experience: "veteran",
  },
  {
    risk_tolerance: "moderate",
    time_horizon: "medium_term",
    experience: "veteran",
  },
  {
    risk_tolerance: "aggressive",
    time_horizon: "medium_term",
    experience: "veteran",
  },
  {
    risk_tolerance: "ultra_aggressive",
    time_horizon: "short_term",
    experience: "veteran",
  },
  {
    risk_tolerance: "ultra_conservative",
    time_horizon: "long_term",
    experience: "newcomer",
  },
  {
    risk_tolerance: "conservative",
    time_horizon: "medium_term",
    experience: "newcomer",
  },
  {
    risk_tolerance: "moderate",
    time_horizon: "short_term",
    experience: "newcomer",
  },
  {
    risk_tolerance: "aggressive",
    time_horizon: "short_term",
    experience: "newcomer",
  },
  {
    risk_tolerance: "ultra_aggressive",
    time_horizon: "short_term",
    experience: "newcomer",
  },
];

// Weight spread per variation index (centered on baseWeight)
const WEIGHT_OFFSETS = [-0.1, -0.08, -0.05, -0.02, 0, 0, 0.02, 0.05, 0.08, 0.1];

// Verdict numeric mapping
const VERDICT_MAP = {
  STRONG_BUY: 2,
  BUY: 1,
  NEUTRAL: 0,
  SELL: -1,
  STRONG_SELL: -2,
};

const CALL_TIMEOUT_MS = 30_000;

// ─── Token Lookup ────────────────────────────────────────

function lookupToken(db, tokenAddress, chain) {
  let token = null;
  let scores = null;

  try {
    token = db
      .prepare("SELECT * FROM pipeline_tokens WHERE address = ?")
      .get(tokenAddress);
  } catch {}

  const addr = token?.address || tokenAddress;
  if (addr) {
    try {
      scores = db
        .prepare("SELECT * FROM token_scores WHERE address = ?")
        .get(addr);
    } catch {}
  }

  return { token, scores };
}

// ─── Build Token Context ─────────────────────────────────

function buildTokenContext(token, scores) {
  let compositeScore = 0;
  let safetyScore = 0;
  let walletScore = 0;
  let socialScore = 0;
  let mcap = 0;
  let volume24h = 0;
  let holders = 0;

  if (scores) {
    compositeScore = scores.score || 0;
    try {
      const s = JSON.parse(scores.safety_data || "{}");
      safetyScore = s.score || 0;
    } catch {}
    try {
      const w = JSON.parse(scores.wallet_data || "{}");
      walletScore = w.score || 0;
    } catch {}
    try {
      const so = JSON.parse(scores.social_data || "{}");
      socialScore = so.score || 0;
    } catch {}
    try {
      const sd = JSON.parse(scores.scanner_data || "{}");
      const data = sd.data || sd;
      mcap = data.market_cap || data.marketCap || 0;
      volume24h = data.volume_24h || data.volume24h || 0;
      holders = data.holders || data.unique_holders || 0;
    } catch {}
  }

  // Fallback from pipeline_tokens
  if (!compositeScore && token?.score) {
    compositeScore = token.score;
    safetyScore = compositeScore >= 85 ? 25 : compositeScore >= 70 ? 18 : 10;
    walletScore = compositeScore >= 85 ? 25 : compositeScore >= 70 ? 18 : 10;
    socialScore = compositeScore >= 85 ? 16 : compositeScore >= 70 ? 12 : 6;
    mcap =
      compositeScore >= 85 ? 50000000 : compositeScore >= 70 ? 5000000 : 500000;
    volume24h =
      compositeScore >= 85 ? 5000000 : compositeScore >= 70 ? 1000000 : 100000;
    holders = compositeScore >= 85 ? 10000 : compositeScore >= 70 ? 3000 : 500;
  }

  return {
    compositeScore,
    safetyScore,
    walletScore,
    socialScore,
    mcap,
    volume24h,
    holders,
  };
}

// buildPrompt removed — Project Opus Brain: Claude Code handles qualitative analysis

// ─── Single Agent Call (Rule-Based — No LLM) ────────────
// Project Opus Brain: Simulation verdicts are now computed by rules.
// Claude Code performs the deep qualitative analysis externally.

function callAgent(persona, weight, focus, symbol, chain, ctx, variation) {
  const score = ctx.compositeScore || 0;
  const safety = ctx.safetyScore || 0;
  const wallet = ctx.walletScore || 0;
  const social = ctx.socialScore || 0;

  // Risk tolerance modifier
  const riskMod =
    {
      ultra_conservative: -15,
      conservative: -8,
      moderate: 0,
      aggressive: 8,
      ultra_aggressive: 15,
    }[variation?.risk_tolerance] || 0;

  // Persona-specific scoring bias
  const personaBias =
    {
      degen: (ctx.volume24h > 100000 ? 10 : 0) + (ctx.mcap < 2000000 ? 10 : 0),
      whale: (wallet >= 20 ? 10 : -5) + (ctx.mcap > 1000000 ? 5 : -5),
      institutional: (safety >= 20 ? 15 : -10) + (ctx.holders > 1000 ? 5 : -5),
      community: (social >= 12 ? 10 : -5) + (ctx.holders > 500 ? 5 : 0),
      technical_trader: score >= 60 ? 10 : -5,
    }[persona] || 0;

  const adjustedScore = Math.max(
    0,
    Math.min(100, score + riskMod + personaBias),
  );

  // Map to verdict
  let verdict, confidence, priceTarget, riskLevel;
  if (adjustedScore >= 85) {
    verdict = "STRONG_BUY";
    confidence = 0.9;
    priceTarget = "UP_50";
    riskLevel = "LOW";
  } else if (adjustedScore >= 70) {
    verdict = "BUY";
    confidence = 0.75;
    priceTarget = "UP_20";
    riskLevel = "MEDIUM";
  } else if (adjustedScore >= 50) {
    verdict = "NEUTRAL";
    confidence = 0.5;
    priceTarget = "STABLE";
    riskLevel = "MEDIUM";
  } else if (adjustedScore >= 30) {
    verdict = "SELL";
    confidence = 0.6;
    priceTarget = "DOWN_20";
    riskLevel = "HIGH";
  } else {
    verdict = "STRONG_SELL";
    confidence = 0.8;
    priceTarget = "DOWN_50";
    riskLevel = "EXTREME";
  }

  const reasoning =
    `${persona} (${variation?.risk_tolerance || "moderate"}, ${variation?.experience || "veteran"}): ` +
    `Score ${adjustedScore} (base ${score} + risk ${riskMod} + persona ${personaBias}). ` +
    `Safety=${safety}/30, Wallet=${wallet}/30, Social=${social}/20, MCap=$${ctx.mcap.toLocaleString()}`;

  return Promise.resolve({
    persona,
    weight,
    variation,
    verdict,
    confidence,
    reasoning,
    priceTarget30d: priceTarget,
    riskLevel,
    status: "COMPLETED",
  });
}

// ─── Consensus Calculation ───────────────────────────────

function calculateConsensus(verdicts) {
  const completed = verdicts.filter((v) => v.status === "COMPLETED");
  if (completed.length === 0) {
    return {
      score: 0,
      confidence: 0,
      consensus: "NEUTRAL",
      recommendation: "CAUTION",
    };
  }

  // Weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  const numericVerdicts = [];

  for (const v of completed) {
    const numVal = VERDICT_MAP[v.verdict] || 0;
    weightedSum += numVal * v.weight;
    totalWeight += v.weight;
    numericVerdicts.push(numVal);
  }

  const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Standard deviation
  const mean =
    numericVerdicts.reduce((a, b) => a + b, 0) / numericVerdicts.length;
  const variance =
    numericVerdicts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    numericVerdicts.length;
  const stddev = Math.sqrt(variance);

  // Confidence: 1 - (stddev / 2), clamped
  const confidence = Math.min(1, Math.max(0, 1 - stddev / 2));

  // Consensus direction
  let consensus;
  if (avg > 0.5) consensus = "BULLISH";
  else if (avg < -0.5) consensus = "BEARISH";
  else consensus = "NEUTRAL";

  // Recommendation
  let recommendation;
  if (consensus === "BULLISH" && confidence > 0.7) recommendation = "PROCEED";
  else if (consensus === "BEARISH" && confidence > 0.7)
    recommendation = "REJECT";
  else recommendation = "CAUTION";

  // Normalize score to 0-100
  const score = Math.round(((avg + 2) / 4) * 100);

  // Confidence interval
  const confidenceLow = Math.max(0, confidence - stddev * 0.15);
  const confidenceHigh = Math.min(1, confidence + stddev * 0.15);

  return {
    score,
    confidence: Math.round(confidence * 1000) / 1000,
    confidenceLow: Math.round(confidenceLow * 1000) / 1000,
    confidenceHigh: Math.round(confidenceHigh * 1000) / 1000,
    consensus,
    recommendation,
    weightedAvg: Math.round(avg * 1000) / 1000,
    stddev: Math.round(stddev * 1000) / 1000,
    completedCount: completed.length,
    totalCount: verdicts.length,
    abstainCount: verdicts.filter((v) => v.status === "ABSTAIN").length,
  };
}

// ─── Main Entry: runSimulation ───────────────────────────

async function runSimulation(tokenAddress, chain, options = {}) {
  const startTime = Date.now();
  const depth = options.depth || "mvp";
  const simulationId = `sim_${require("crypto").randomBytes(8).toString("hex")}`;
  const db = getDB();

  // Track simulation count
  try {
    db.prepare(
      `CREATE TABLE IF NOT EXISTS simulation_counter (id INTEGER PRIMARY KEY, count INTEGER DEFAULT 0, last_run TEXT)`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO simulation_counter (id, count) VALUES (1, 0)`,
    ).run();
    db.prepare(
      `UPDATE simulation_counter SET count = count + 1, last_run = datetime('now') WHERE id = 1`,
    ).run();
  } catch (e) {
    /* non-critical */
  }

  // 1. Fetch token data
  const { token, scores } = lookupToken(db, tokenAddress, chain);
  const symbol = token?.ticker || token?.name || tokenAddress.slice(0, 8);
  const ctx = buildTokenContext(token, scores);

  // 2. Optional: enrich with Financial Datasets data
  let financialData = null;
  if (
    financialDatasets &&
    typeof financialDatasets.getTokenData === "function"
  ) {
    try {
      financialData = await financialDatasets.getTokenData(tokenAddress, chain);
      if (financialData?.marketCap) ctx.mcap = financialData.marketCap;
      if (financialData?.volume24h) ctx.volume24h = financialData.volume24h;
      if (financialData?.holders) ctx.holders = financialData.holders;
    } catch {}
  }

  // 3. Build 50 agent calls (5 personas x 10 variations)
  const agentCalls = [];
  for (const [persona, config] of Object.entries(PERSONAS)) {
    for (let i = 0; i < VARIATIONS.length; i++) {
      const variation = VARIATIONS[i];
      const weight = Math.max(0.05, config.baseWeight + WEIGHT_OFFSETS[i]);
      agentCalls.push({
        persona,
        weight,
        focus: config.focus,
        variation,
        variationIndex: i,
      });
    }
  }

  // 4. Execute in batches of 10 with 500ms delay between batches
  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 500;
  const verdicts = [];

  for (let b = 0; b < agentCalls.length; b += BATCH_SIZE) {
    const batch = agentCalls.slice(b, b + BATCH_SIZE);
    const batchPromises = batch.map((a) =>
      callAgent(
        a.persona,
        a.weight,
        a.focus,
        symbol,
        chain,
        ctx,
        a.variation,
      ).catch((err) => ({
        persona: a.persona,
        weight: a.weight,
        variation: a.variation,
        verdict: "NEUTRAL",
        confidence: 0,
        reasoning: `Agent call failed: ${err.message}`,
        priceTarget30d: "STABLE",
        riskLevel: "MEDIUM",
        status: "ABSTAIN",
      })),
    );

    const results = await Promise.allSettled(batchPromises);
    for (const r of results) {
      verdicts.push(
        r.status === "fulfilled"
          ? r.value
          : {
              persona: "unknown",
              weight: 0,
              verdict: "NEUTRAL",
              confidence: 0,
              reasoning: "Promise rejected",
              priceTarget30d: "STABLE",
              riskLevel: "MEDIUM",
              status: "ABSTAIN",
            },
      );
    }

    // Delay between batches (skip after last batch)
    if (b + BATCH_SIZE < agentCalls.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 5. Calculate consensus
  const consensus = calculateConsensus(verdicts);

  // 5b. Adversarial bull/bear debate (top-5 vs top-5)
  let debate = null;
  const completed = verdicts.filter((v) => v.status === "COMPLETED");
  if (completed.length >= 10) {
    try {
      debate = await runDebate(completed, symbol, chain);
    } catch (e) {
      console.error("[SimEngine] Debate failed:", e.message);
    }
  }

  // 6. Build metrics
  const durationMs = Date.now() - startTime;
  const metrics = {
    totalAgents: 50,
    persona_count: 5,
    variation_count: 10,
    completed: consensus.completedCount,
    abstained: consensus.abstainCount,
    durationMs,
    avgConfidence: consensus.confidence,
    stddev: consensus.stddev,
    depth,
    tokenFound: !!token,
    scoresFound: !!scores,
    financialDataEnriched: !!financialData,
    hasDebate: !!debate,
  };

  return {
    simulationId,
    tokenAddress,
    chain,
    symbol,
    depth,
    score: consensus.score,
    confidence: consensus.confidence,
    confidenceLow: consensus.confidenceLow,
    confidenceHigh: consensus.confidenceHigh,
    consensus: consensus.consensus,
    recommendation: consensus.recommendation,
    weightedAvg: consensus.weightedAvg,
    verdicts,
    debate,
    metrics,
    durationMs,
    createdAt: new Date().toISOString(),
  };
}

// ─── Adversarial Bull/Bear Debate (Rule-Based — No LLM) ─
// Project Opus Brain: Claude Code performs the deep debate analysis externally.
// This function provides structured bull/bear data for Claude Code to analyze.

function runDebate(completedVerdicts, symbol, chain) {
  const sorted = [...completedVerdicts].sort((a, b) => {
    const va = VERDICT_MAP[a.verdict] || 0;
    const vb = VERDICT_MAP[b.verdict] || 0;
    return vb - va;
  });

  const bulls = sorted.slice(0, 5);
  const bears = sorted.slice(-5).reverse();

  const bullScore = bulls.reduce(
    (s, v) => s + (VERDICT_MAP[v.verdict] || 0),
    0,
  );
  const bearScore = bears.reduce(
    (s, v) => s + (VERDICT_MAP[v.verdict] || 0),
    0,
  );
  const netScore = bullScore + bearScore;

  let refined_consensus;
  if (netScore > 2) refined_consensus = "BULLISH";
  else if (netScore < -2) refined_consensus = "BEARISH";
  else refined_consensus = "NEUTRAL";

  const bullReasons = bulls.map((v) => v.reasoning).join(" ");
  const bearReasons = bears.map((v) => v.reasoning).join(" ");

  return Promise.resolve({
    synthesis:
      `Bull camp (${bulls.length} agents, net +${bullScore}) vs Bear camp (${bears.length} agents, net ${bearScore}). ` +
      `Net debate score: ${netScore}. Consensus: ${refined_consensus}.`,
    refined_consensus,
    key_risk: bearReasons.slice(0, 200),
    key_signal: bullReasons.slice(0, 200),
    bull_arguments: bulls.map((v) => ({
      persona: v.persona,
      verdict: v.verdict,
      reasoning: v.reasoning,
    })),
    bear_arguments: bears.map((v) => ({
      persona: v.persona,
      verdict: v.verdict,
      reasoning: v.reasoning,
    })),
  });
}

// ─── Monte Carlo Stage 2 — MiroFish ─────────────────────────
// 1000 agents × 100 iterations → probability distribution
// Rule-based, zero LLM cost, ~5 min per token
// Cluster 5: market_dynamics (spread, depth, MEV, arb)

const CLUSTER_TEMPLATES = {
  degen: {
    riskTolerance: 0.9,
    conviction: 0.3,
    marketSensitivity: 0.8,
    liquidityWeight: 0.2,
  },
  whale: {
    riskTolerance: 0.4,
    conviction: 0.7,
    marketSensitivity: 0.5,
    liquidityWeight: 0.9,
  },
  institutional: {
    riskTolerance: 0.2,
    conviction: 0.8,
    marketSensitivity: 0.3,
    liquidityWeight: 0.95,
  },
  community: {
    riskTolerance: 0.6,
    conviction: 0.5,
    marketSensitivity: 0.6,
    liquidityWeight: 0.4,
  },
  market_dynamics: {
    riskTolerance: 0.5,
    conviction: 0.6,
    marketSensitivity: 0.9,
    liquidityWeight: 0.8,
  },
};

function generateMCAgents(count) {
  const perCluster = Math.floor(count / 5);
  const agents = [];
  for (const [type, template] of Object.entries(CLUSTER_TEMPLATES)) {
    for (let i = 0; i < perCluster; i++) {
      agents.push({
        id: `${type}_${i}`,
        cluster: type,
        riskTolerance: template.riskTolerance * (0.7 + Math.random() * 0.6),
        conviction: template.conviction * (0.7 + Math.random() * 0.6),
        marketSensitivity:
          template.marketSensitivity * (0.7 + Math.random() * 0.6),
        liquidityWeight: template.liquidityWeight * (0.7 + Math.random() * 0.6),
      });
    }
  }
  return agents;
}

function perturb(value, range) {
  return value * (1 - range + Math.random() * range * 2);
}

function runSingleMCSim(tokenData, agents) {
  const score = tokenData.composite_score || tokenData.score || 50;
  const liq = tokenData.liquidity || 0;
  const vol = tokenData.volume_24h || 0;
  const holders = tokenData.holders || 0;
  const mcap = tokenData.mcap || tokenData.fdv || 0;
  const safety = tokenData.safety_score || 50;

  let buyVotes = 0,
    sellVotes = 0,
    holdVotes = 0;
  let totalConviction = 0;

  for (const agent of agents) {
    // Each agent evaluates based on their profile
    const scoreSignal = (score / 100 - 0.5) * 2; // -1 to +1
    const liqSignal = liq > 100000 ? 0.3 : liq > 50000 ? 0 : -0.3;
    const safetySignal = (safety / 100 - 0.5) * 2;
    const marketSignal = mcap > 500000 && mcap < 50000000 ? 0.2 : -0.2;

    // Weighted decision
    const signal =
      scoreSignal * agent.conviction +
      liqSignal * agent.liquidityWeight +
      safetySignal * agent.riskTolerance +
      marketSignal * agent.marketSensitivity +
      (Math.random() - 0.5) * 0.3; // noise

    if (signal > 0.15 * (1 / agent.riskTolerance)) {
      buyVotes++;
      totalConviction += Math.abs(signal);
    } else if (signal < -0.15 * (1 / agent.riskTolerance)) {
      sellVotes++;
      totalConviction += Math.abs(signal);
    } else {
      holdVotes++;
    }
  }

  const total = buyVotes + sellVotes + holdVotes;
  const consensusPct = total > 0 ? Math.max(buyVotes, sellVotes) / total : 0.5;
  const direction = buyVotes > sellVotes ? "BUY" : "SELL";
  const p = buyVotes / Math.max(1, buyVotes + sellVotes); // listing probability

  const W = 5000; // listing fee
  const L = 200; // BD cost
  const ev = p * W - (1 - p) * L;

  return {
    ev,
    consensusPct,
    direction,
    buyVotes,
    sellVotes,
    holdVotes,
    agentCount: total,
    p,
  };
}

async function monteCarloSimulate(tokenData, options = {}) {
  const { agentCount = 1000, iterations = 100, perturbRange = 0.15 } = options;

  const baseAgents = generateMCAgents(agentCount);
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const perturbedAgents = baseAgents.map((agent) => ({
      ...agent,
      riskTolerance: perturb(agent.riskTolerance, perturbRange),
      conviction: perturb(agent.conviction, perturbRange),
      marketSensitivity: perturb(agent.marketSensitivity, perturbRange),
      liquidityWeight: perturb(agent.liquidityWeight, perturbRange),
    }));

    results.push(runSingleMCSim(tokenData, perturbedAgents));
  }

  return computeDistribution(results);
}

function computeDistribution(results) {
  const evs = results.map((r) => r.ev).sort((a, b) => a - b);
  const consensuses = results.map((r) => r.consensusPct);
  const ps = results.map((r) => r.p);
  const n = evs.length;

  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const stddev = (arr) => {
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };

  const evDist = {
    mean: Math.round(avg(evs) * 100) / 100,
    median: Math.round(evs[Math.floor(n / 2)] * 100) / 100,
    stddev: Math.round(stddev(evs) * 100) / 100,
    p5: Math.round(evs[Math.floor(n * 0.05)] * 100) / 100,
    p25: Math.round(evs[Math.floor(n * 0.25)] * 100) / 100,
    p75: Math.round(evs[Math.floor(n * 0.75)] * 100) / 100,
    p95: Math.round(evs[Math.floor(n * 0.95)] * 100) / 100,
    min: Math.round(evs[0] * 100) / 100,
    max: Math.round(evs[n - 1] * 100) / 100,
  };

  const decision = decideFromDistribution(evs);

  // Cluster breakdown from last iteration
  const lastResult = results[results.length - 1];
  const clusterSummary = {};
  for (const [type] of Object.entries(CLUSTER_TEMPLATES)) {
    const clusterResults = results.map((r) => r);
    clusterSummary[type] = { agents: Math.floor(results[0].agentCount / 5) };
  }

  return {
    ev: evDist,
    consensus: {
      mean: Math.round(avg(consensuses) * 1000) / 1000,
      stddev: Math.round(stddev(consensuses) * 1000) / 1000,
    },
    listing_probability: {
      mean: Math.round(avg(ps) * 1000) / 1000,
      stddev: Math.round(stddev(ps) * 1000) / 1000,
    },
    iterations: n,
    agents: results[0]?.agentCount || 0,
    decision,
    clusters: Object.keys(CLUSTER_TEMPLATES),
  };
}

function decideFromDistribution(evs) {
  const avg_ev = evs.reduce((s, v) => s + v, 0) / evs.length;
  const p5 = evs[Math.floor(evs.length * 0.05)];

  if (avg_ev > 200 && p5 > -100) return "LIST";
  if (avg_ev > 200 && p5 <= -100) return "CAUTION";
  if (avg_ev > 0) return "MONITOR";
  return "REJECT";
}

module.exports = {
  runSimulation,
  PERSONAS,
  VARIATIONS,
  WEIGHT_OFFSETS,
  VERDICT_MAP,
  calculateConsensus,
  runDebate,
  monteCarloSimulate,
  generateMCAgents,
  CLUSTER_TEMPLATES,
};
