/**
 * MicroBuzz v2 — 500-Agent 3-Round Simulator
 * ADR-010 | Orchestrates LLM agents + heuristic agents on AMM
 *
 * Round 1: DexScreener + v2_8rules score
 * Round 2: + Twitter/social + Round 1 price
 * Round 3: + HeyAnon cross-chain + Round 1+2
 *
 * ~27 min per simulation (30 LLM × 3 rounds × ~18s + instant heuristics)
 */

const { createMarket, getPrice, agentTrade, getLLMSummary, recordRoundPrice, settlePrediction } = require('./microbuzz-amm');
const { generateLLMAgents, buildUserPrompt } = require('./microbuzz-agents');
const { executeAllHeuristics } = require('./microbuzz-heuristics');
const { queryAgent, checkOllamaHealth, stopModel } = require('./microbuzz-ollama');

/**
 * Run a full 500-agent 3-round simulation for a token
 * @param {Object} tokenData - token metrics from pipeline
 * @returns {Object} full simulation result
 */
async function runSimulation(tokenData) {
  const startTime = Date.now();
  const simulationSeed = Date.now() % 1000000;

  // Pre-flight checks
  const health = await checkOllamaHealth();
  if (!health.ready) {
    return { success: false, error: 'Ollama not ready: ' + JSON.stringify(health) };
  }

  const market = createMarket(tokenData.symbol || tokenData.name || 'UNKNOWN');
  const llmAgents = generateLLMAgents();
  const priorResults = {};

  const roundResults = [];

  // ─── 3 ROUNDS ────────────────────────────────────
  for (let round = 1; round <= 3; round++) {
    const roundStart = Date.now();
    const roundData = await runRound(round, market, llmAgents, tokenData, priorResults, simulationSeed);
    roundData.duration_ms = Date.now() - roundStart;
    roundResults.push(roundData);

    // Store for next round's context
    priorResults[`round${round}`] = {
      price: getPrice(market),
      llm_summary: getLLMSummary(market, round)
    };

    recordRoundPrice(market, round);
  }

  // ─── SETTLE ──────────────────────────────────────
  const settlement = settlePrediction(market);
  const totalTime = Date.now() - startTime;

  // EV calculation: p × W − (1−p) × L
  const p = settlement.amm_final_price;
  const W = 5000;  // listing fee revenue
  const L = 200;   // BD cost
  const ev = p * W - (1 - p) * L;

  return {
    success: true,
    token_address: tokenData.address,
    token_symbol: settlement.token_symbol,
    chain: tokenData.chain,

    // Round prices
    round_1_price: roundResults[0] ? priorResults.round1.price : null,
    round_2_price: roundResults[1] ? priorResults.round2.price : null,
    round_3_price: roundResults[2] ? priorResults.round3.price : null,
    amm_final_price: settlement.amm_final_price,
    microbuzz_score: settlement.microbuzz_score,
    ev_score: Math.round(ev * 100) / 100,

    // Agent counts
    llm_agent_count: 30,
    heuristic_agent_count: 470,
    total_agent_count: 500,
    total_trades: settlement.total_trades,

    // LLM consensus per round
    llm_consensus_r1: priorResults.round1?.llm_summary?.consensus_strength || null,
    llm_consensus_r2: priorResults.round2?.llm_summary?.consensus_strength || null,
    llm_consensus_r3: priorResults.round3?.llm_summary?.consensus_strength || null,

    // Round details
    rounds: roundResults,
    round_prices: settlement.round_prices,

    // All trades (for DB storage)
    trades: settlement.trades,

    // Timing
    simulation_time_ms: totalTime,
    simulation_seed: simulationSeed,
    created_at: new Date().toISOString()
  };
}

/**
 * Run a single round: Phase A (LLM) then Phase B (heuristic)
 */
async function runRound(roundNumber, market, llmAgents, tokenData, priorResults, seed) {
  const userPrompt = buildUserPrompt(tokenData, roundNumber, priorResults);

  // ─── Phase A: 30 LLM agents (sequential, ~18s each) ───
  const llmResults = [];
  let llmTraded = 0;
  let llmYes = 0;
  let llmNo = 0;
  let llmNothing = 0;

  for (const agent of llmAgents) {
    const decision = await queryAgent(agent, userPrompt);

    if (decision.direction === 'YES' || decision.direction === 'NO') {
      const tradeResult = agentTrade(
        market,
        agent.id,
        'llm',
        decision.direction,
        decision.amount,
        {
          round: roundNumber,
          persona: agent.persona,
          risk: agent.risk_tolerance,
          reasoning: decision.reasoning
        }
      );
      llmTraded++;
      if (decision.direction === 'YES') llmYes++;
      else llmNo++;
    } else {
      llmNothing++;
    }

    llmResults.push({
      agent_id: agent.id,
      persona: agent.persona,
      experience: agent.experience,
      risk: agent.risk_tolerance,
      direction: decision.direction,
      conviction: decision.conviction,
      amount: decision.amount,
      reasoning: decision.reasoning,
      duration_ms: decision.duration_ms,
      success: decision.success
    });
  }

  const priceAfterLLM = getPrice(market);
  const llmSummary = getLLMSummary(market, roundNumber);

  // ─── Phase B: 470 heuristic agents (instant) ───
  const heuristicResult = executeAllHeuristics(market, llmSummary, roundNumber, seed);
  const priceAfterHeuristics = getPrice(market);

  return {
    round: roundNumber,
    phase_a: {
      agents: 30,
      traded: llmTraded,
      yes: llmYes,
      no: llmNo,
      nothing: llmNothing,
      price_after: priceAfterLLM,
      consensus: llmSummary
    },
    phase_b: {
      ...heuristicResult,
      price_after: priceAfterHeuristics
    },
    price_start: roundNumber === 1 ? 0.5 : null,
    price_end: priceAfterHeuristics
  };
}

/**
 * Get enriched token context for simulation
 * Pulls live data from pipeline + external sources
 */
async function getTokenContext(address, chain) {
  const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;
  const BASE = 'http://localhost:3000';

  const tokenData = { address, chain };

  // Try pipeline data
  try {
    const resp = await fetch(`${BASE}/api/v1/pipeline/tokens/${address}?chain=${chain || 'solana'}`, {
      headers: { 'X-API-Key': ADMIN_KEY }
    });
    if (resp.ok) {
      const data = await resp.json();
      const t = data.token || data;
      Object.assign(tokenData, {
        symbol: t.ticker || t.symbol,
        name: t.name,
        score: t.score,
        chain: t.chain || chain
      });
    }
  } catch {}

  // Try DexScreener
  try {
    const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (resp.ok) {
      const data = await resp.json();
      const pair = data.pairs?.[0];
      if (pair) {
        Object.assign(tokenData, {
          symbol: tokenData.symbol || pair.baseToken?.symbol,
          name: tokenData.name || pair.baseToken?.name,
          price: parseFloat(pair.priceUsd || 0),
          mcap: pair.marketCap || pair.fdv,
          fdv: pair.fdv,
          liquidity: pair.liquidity?.usd,
          volume_24h: pair.volume?.h24,
          price_change_24h: pair.priceChange?.h24
        });

        // Social data (Round 2+)
        const socials = pair.info?.socials || [];
        const twitter = socials.find(s => s.type === 'twitter');
        if (twitter) tokenData.twitter_handle = twitter.url?.split('/').pop();
        if (pair.info?.websites?.[0]) tokenData.website = pair.info.websites[0].url;
      }
    }
  } catch {}

  // HeyAnon cross-chain data (Round 3)
  try {
    const defi = require('./heyanon-defi');
    if (tokenData.symbol) {
      const hl = await defi.getHyperliquidOI(tokenData.symbol);
      if (hl.found) {
        tokenData.hyperliquid_oi = hl.open_interest;
        tokenData.hyperliquid_funding = hl.funding_rate;
      }
    }
  } catch {}

  return tokenData;
}

module.exports = {
  runSimulation,
  runRound,
  getTokenContext
};
