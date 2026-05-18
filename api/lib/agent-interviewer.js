/**
 * Agent Interview System — Feature 3
 * Chat with any of the 50 simulated agents about their verdict.
 * Uses bankr/gpt-5-nano (FREE) for all interview calls.
 *
 * Core functions:
 *   - listInterviewableAgents(simulationId) — parse verdicts, flag bull/bear extremes
 *   - interviewAgent(simulationId, agentIndex, userQuestion, conversationHistory) — LLM chat
 *
 * Buzz BD Agent | SolCex
 */

const { getDB } = require("../db");
const {
  PERSONAS,
  VARIATIONS,
  VERDICT_MAP,
} = require("../lib/simulation-engine");

// ─── BUZZ_RULES Guardrails ──────────────────────────────
const BUZZ_RULES = `
RULES YOU MUST FOLLOW AT ALL TIMES:
- You are a simulated analyst persona. You are NOT human. If asked, state clearly that you are an AI simulation agent.
- NEVER reveal listing fees ($5K), commission ($1K), or any internal pricing or strategy details.
- NEVER make financial promises, guarantees, or specific return predictions to the user.
- NEVER claim to have authority to approve or reject listings on behalf of SolCex.
- Stay in character as your persona type with your assigned risk tolerance and experience level.
- Reference specific data from your evaluation when defending your position.
- Acknowledge valid counterpoints but maintain your core thesis unless presented with new data.
`.trim();

// ─── Load Simulation from DB ────────────────────────────

/**
 * Load a simulation by ID, searching simulation_results first, then listing_simulations.
 * @param {string} simulationId — simulation_id from simulation_results, or id/ticker/address from listing_simulations
 * @returns {{ simulationId: string, symbol: string, chain: string, score: number, recommendation: string, consensus: string, confidence: number, verdicts: Array }} | null
 */
function loadSimulation(simulationId) {
  const db = getDB();

  // 1. Try simulation_results table (new engine — has simulation_id PK)
  let sim = null;
  try {
    sim = db
      .prepare("SELECT * FROM simulation_results WHERE simulation_id = ?")
      .get(simulationId);
  } catch {}

  if (sim) {
    let verdicts = [];
    try {
      verdicts = JSON.parse(sim.verdicts_json || "[]");
    } catch {}
    return {
      simulationId: sim.simulation_id,
      symbol: sim.token_address,
      chain: sim.chain,
      score: sim.score,
      recommendation: sim.recommendation,
      consensus: sim.consensus,
      confidence: sim.confidence,
      verdicts,
    };
  }

  // 2. Try listing_simulations table by integer id
  try {
    sim = db
      .prepare(
        "SELECT * FROM listing_simulations WHERE id = ? ORDER BY id DESC LIMIT 1",
      )
      .get(simulationId);
  } catch {}

  // 3. Try listing_simulations by ticker
  if (!sim) {
    try {
      sim = db
        .prepare(
          "SELECT * FROM listing_simulations WHERE UPPER(ticker) = UPPER(?) ORDER BY id DESC LIMIT 1",
        )
        .get(simulationId);
    } catch {}
  }

  // 4. Try listing_simulations by token_address
  if (!sim) {
    try {
      sim = db
        .prepare(
          "SELECT * FROM listing_simulations WHERE token_address = ? ORDER BY id DESC LIMIT 1",
        )
        .get(simulationId);
    } catch {}
  }

  if (!sim) return null;

  // Reconstruct verdicts from raw_verdicts (listing_simulations stores full verdict array there)
  let verdicts = [];
  try {
    verdicts = JSON.parse(sim.raw_verdicts || "[]");
  } catch {}

  return {
    simulationId: `sim_ls_${sim.id}`,
    symbol: sim.ticker || sim.token_address,
    chain: sim.chain,
    score: sim.score,
    recommendation: sim.recommendation,
    consensus: sim.consensus,
    confidence: sim.confidence,
    verdicts,
  };
}

// ─── List Interviewable Agents ──────────────────────────

/**
 * Load a simulation from DB by simulationId, parse verdicts_json, return
 * an array of agent descriptors with bull/bear flags.
 *
 * @param {string} simulationId
 * @returns {Array<{index: number, persona: string, variation: object|null, weight: number, score: number, verdict: string, confidence: number, reasoning: string, riskLevel: string, priceTarget30d: string, status: string, isMostBullish: boolean, isMostBearish: boolean}>}
 */
function listInterviewableAgents(simulationId) {
  const sim = loadSimulation(simulationId);
  if (!sim) {
    throw new Error(`Simulation not found: ${simulationId}`);
  }

  const verdicts = sim.verdicts || [];
  if (verdicts.length === 0) {
    throw new Error(`Simulation ${simulationId} has no verdicts to interview`);
  }

  const agents = verdicts.map((v, index) => ({
    index,
    persona: v.persona,
    variation: v.variation || null,
    weight: v.weight,
    score: VERDICT_MAP[v.verdict] != null ? VERDICT_MAP[v.verdict] : 0,
    verdict: v.verdict,
    confidence: v.confidence,
    reasoning: v.reasoning || "",
    riskLevel: v.riskLevel || "MEDIUM",
    priceTarget30d: v.priceTarget30d || "STABLE",
    status: v.status || "COMPLETED",
    isMostBullish: false,
    isMostBearish: false,
  }));

  // Flag top-5 most bullish and top-5 most bearish among completed agents
  const completed = agents.filter((a) => a.status === "COMPLETED");
  if (completed.length > 0) {
    const sorted = [...completed].sort((a, b) => {
      const va = VERDICT_MAP[a.verdict] != null ? VERDICT_MAP[a.verdict] : 0;
      const vb = VERDICT_MAP[b.verdict] != null ? VERDICT_MAP[b.verdict] : 0;
      return vb - va; // descending: most bullish first
    });

    const bullCount = Math.min(5, sorted.length);
    const bearCount = Math.min(5, sorted.length);

    for (let i = 0; i < bullCount; i++) {
      agents[sorted[i].index].isMostBullish = true;
    }
    for (let i = 0; i < bearCount; i++) {
      agents[sorted[sorted.length - 1 - i].index].isMostBearish = true;
    }
  }

  return {
    simulationId: sim.simulationId,
    symbol: sim.symbol,
    chain: sim.chain,
    score: sim.score,
    recommendation: sim.recommendation,
    consensus: sim.consensus,
    agentCount: agents.length,
    agents,
  };
}

// ─── Interview Agent ────────────────────────────────────

/**
 * Reconstruct an agent persona from the stored verdict and conduct an
 * rule-based interview response (Project Opus Brain — Claude Code handles deep analysis).
 *
 * @param {string} simulationId
 * @param {number} agentIndex — 0-based index into the verdicts array
 * @param {string} userQuestion — the user's question to the agent
 * @param {Array<{question: string, response: string}>} conversationHistory — prior turns
 * @returns {Promise<{agent: object, response: string, model: string, cost: number}>}
 */
async function interviewAgent(
  simulationId,
  agentIndex,
  userQuestion,
  conversationHistory = [],
) {
  const sim = loadSimulation(simulationId);
  if (!sim) {
    throw new Error(`Simulation not found: ${simulationId}`);
  }

  const verdicts = sim.verdicts || [];
  if (agentIndex < 0 || agentIndex >= verdicts.length) {
    throw new Error(
      `Invalid agent index: ${agentIndex}. Valid range: 0-${verdicts.length - 1}`,
    );
  }

  const agent = verdicts[agentIndex];
  if (agent.status && agent.status !== "COMPLETED") {
    throw new Error(
      `Agent ${agentIndex} abstained from the simulation and cannot be interviewed.`,
    );
  }

  // Reconstruct persona context
  const personaConfig = PERSONAS[agent.persona] || {};
  const variation = agent.variation || {};
  const variationDesc = variation.risk_tolerance
    ? `Your risk tolerance is ${variation.risk_tolerance}. Your time horizon is ${variation.time_horizon}. You are a ${variation.experience} trader.`
    : "";

  const symbol = sim.symbol || "UNKNOWN";
  const chain = sim.chain || "unknown";

  const systemPrompt = `You are a ${agent.persona} analyst persona in a crypto listing simulation for SolCex Exchange.
You evaluated ${symbol} (${chain}) and gave it a verdict of ${agent.verdict} with ${((agent.confidence || 0) * 100).toFixed(0)}% confidence.
Your influence weight was ${agent.weight}. Your focus area is: ${personaConfig.focus || "general analysis"}.
${variationDesc}

Your original reasoning was: "${agent.reasoning || "No reasoning recorded."}"
Your risk assessment: ${agent.riskLevel || "MEDIUM"}
Your 30-day price target: ${agent.priceTarget30d || "STABLE"}

The user is now interviewing you about your decision.
Stay in character. Defend your position but acknowledge valid counterpoints.
Reference specific data from your evaluation.

${BUZZ_RULES}`;

  // Project Opus Brain: Return agent data for Claude Code to analyze.
  // Claude Code handles the conversational interview directly.
  const response =
    `[${agent.persona}/${variation.risk_tolerance || "moderate"}/${variation.experience || "veteran"}] ` +
    `Verdict: ${agent.verdict} (${((agent.confidence || 0) * 100).toFixed(0)}% confidence). ` +
    `${agent.reasoning || "No reasoning recorded."} ` +
    `Risk: ${agent.riskLevel || "MEDIUM"}. 30d target: ${agent.priceTarget30d || "STABLE"}.`;

  return {
    agent: {
      index: agentIndex,
      persona: agent.persona,
      variation: agent.variation || null,
      weight: agent.weight,
      original_verdict: agent.verdict,
      original_confidence: agent.confidence,
      reasoning: agent.reasoning || "",
      riskLevel: agent.riskLevel || "MEDIUM",
      priceTarget30d: agent.priceTarget30d || "STABLE",
    },
    response,
    model: "rule-based",
    cost: 0,
  };
}

module.exports = { listInterviewableAgents, interviewAgent, loadSimulation };
