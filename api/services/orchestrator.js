/**
 * Orchestrator Service — 9 Parallel Agent Dispatch (5 Sub-Agents + 4 Personas)
 *
 * v6.1.1: 5 sub-agents (scanner, safety, wallet, social, scorer)
 * v7.4.0: + 4 persona agents (degen, whale, institutional, community)
 *
 * Final composite: 70% sub-agent score + 30% persona consensus
 * BD recommendation: 3+ bullish + score >= 75 = outreach_now
 *                    2+ bullish + score >= 60 = monitor
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const { runScannerAgent } = require('./agents/scanner');
const { runSafetyAgent } = require('./agents/safety');
const { runWalletAgent } = require('./agents/wallet');
const { runSocialAgent } = require('./agents/social');
const { runScorerAgent } = require('./agents/scorer');

// v7.4.0: Persona agents
const degenAgent = require('./agents/personas/degen-agent');
const whaleAgent = require('./agents/personas/whale-agent');
const institutionalAgent = require('./agents/personas/institutional-agent');
const communityAgent = require('./agents/personas/community-agent');

// SSE broadcasting (optional — only if pipeline-stream is loaded)
let sseEmit;
try {
  const pipelineStream = require('../routes/pipeline-stream');
  sseEmit = {
    progress: pipelineStream.emitProgress,
    persona: pipelineStream.emitPersonaSignal,
    complete: pipelineStream.emitComplete,
    error: pipelineStream.emitError,
  };
} catch {
  sseEmit = null;
}

// Sub-agent weights (MUST sum to 1.0)
const WEIGHTS = {
  safety: 0.30,
  wallet: 0.30,
  social: 0.20,
  scorer: 0.20
};

// Persona weights (MUST sum to 1.0)
const PERSONA_WEIGHTS = {
  'degen-agent': 0.15,
  'whale-agent': 0.25,
  'institutional-agent': 0.35,
  'community-agent': 0.25,
};

// Composite split: sub-agents vs personas
const SUB_AGENT_RATIO = 0.70;
const PERSONA_RATIO = 0.30;

// Verdict thresholds
const THRESHOLDS = {
  HOT: 85,
  QUALIFIED: 70,
  WATCH: 50,
  SKIP: 0
};

// Timeouts per agent (ms)
const TIMEOUTS = {
  scanner: 30000,   // 30s — just API calls
  safety: 45000,    // 45s — RugCheck can be slow
  wallet: 45000,    // 45s — Helius forensics
  social: 120000,   // 120s — Grok + web search (known slow)
  scorer: 15000,    // 15s — computation only
  persona: 30000    // 30s — persona analysis (rule-based + optional LLM)
};

/**
 * Main orchestration function
 * Runs 5 sub-agents + 4 persona agents, aggregates weighted scores
 * @param {object} opts - { address, chain, depth, requestId, db }
 */
async function orchestrateScore({ address, chain, depth, requestId, db }) {
  const results = {};
  const timings = {};
  const errors = [];

  console.log(`[${requestId}] 🎼 Orchestrator: Dispatching 9 agents for ${address} on ${chain}`);

  // ─── Phase 1: Run scanner + safety + wallet + social in parallel ───
  const phase1Start = Date.now();

  if (sseEmit) {
    sseEmit.progress('scanner', address, 'started');
    sseEmit.progress('safety', address, 'started');
    sseEmit.progress('wallet', address, 'started');
    sseEmit.progress('social', address, 'started');
  }

  const [scannerResult, safetyResult, walletResult, socialResult] = await Promise.allSettled([
    withTimeout(runScannerAgent({ address, chain, requestId }), TIMEOUTS.scanner, 'scanner'),
    withTimeout(runSafetyAgent({ address, chain, requestId }), TIMEOUTS.safety, 'safety'),
    withTimeout(runWalletAgent({ address, chain, requestId }), TIMEOUTS.wallet, 'wallet'),
    withTimeout(runSocialAgent({ address, chain, requestId }), TIMEOUTS.social, 'social')
  ]);

  // Process Phase 1 results
  results.scanner = processAgentResult('scanner', scannerResult, errors);
  timings.scanner = results.scanner.duration_ms || (Date.now() - phase1Start);

  results.safety = processAgentResult('safety', safetyResult, errors);
  timings.safety = results.safety.duration_ms || (Date.now() - phase1Start);

  results.wallet = processAgentResult('wallet', walletResult, errors);
  timings.wallet = results.wallet.duration_ms || (Date.now() - phase1Start);

  results.social = processAgentResult('social', socialResult, errors);
  timings.social = results.social.duration_ms || (Date.now() - phase1Start);

  console.log(`[${requestId}] ⏱️ Phase 1 complete: ${Date.now() - phase1Start}ms`);

  // ─── Phase 2: Run scorer + 4 persona agents in parallel ───
  // Scorer needs Phase 1 data; personas also use Phase 1 data
  const phase2Start = Date.now();

  const tokenDataForPersonas = {
    scannerData: results.scanner?.data,
    safetyData: results.safety?.data,
    walletData: results.wallet?.data,
    socialData: results.social?.data,
    safetyScore: results.safety?.score || 0,
    walletScore: results.wallet?.score || 0,
    socialScore: results.social?.score || 0,
    scanner: results.scanner,
    safety: results.safety,
    wallet: results.wallet,
    social: results.social,
  };

  if (sseEmit) {
    sseEmit.progress('scorer', address, 'started');
    sseEmit.progress('degen-agent', address, 'started');
    sseEmit.progress('whale-agent', address, 'started');
    sseEmit.progress('institutional-agent', address, 'started');
    sseEmit.progress('community-agent', address, 'started');
  }

  // Run scorer + all 4 personas in parallel
  const [scorerResult, degenResult, whaleResult, institutionalResult, communityResult] = await Promise.allSettled([
    withTimeout(
      runScorerAgent({
        address, chain, requestId,
        ...tokenDataForPersonas
      }),
      TIMEOUTS.scorer,
      'scorer'
    ),
    withTimeout(degenAgent.analyzeToken(tokenDataForPersonas, null), TIMEOUTS.persona, 'degen-agent'),
    withTimeout(whaleAgent.analyzeToken(tokenDataForPersonas, null), TIMEOUTS.persona, 'whale-agent'),
    withTimeout(institutionalAgent.analyzeToken(tokenDataForPersonas, null), TIMEOUTS.persona, 'institutional-agent'),
    withTimeout(communityAgent.analyzeToken(tokenDataForPersonas, null), TIMEOUTS.persona, 'community-agent'),
  ]);

  results.scorer = processAgentResult('scorer', scorerResult, errors);
  timings.scorer = results.scorer.duration_ms || (Date.now() - phase2Start);

  // Process persona results
  const personaResults = {};

  const personaSettled = [
    { name: 'degen-agent', result: degenResult },
    { name: 'whale-agent', result: whaleResult },
    { name: 'institutional-agent', result: institutionalResult },
    { name: 'community-agent', result: communityResult },
  ];

  for (const { name, result } of personaSettled) {
    if (result.status === 'fulfilled') {
      personaResults[name] = result.value;
      timings[name] = result.value.duration_ms || (Date.now() - phase2Start);

      // Emit SSE persona signal
      if (sseEmit) {
        sseEmit.persona(name, address, result.value.signal, result.value.confidence, result.value.score);
      }
    } else {
      const errMsg = result.reason?.message || 'Unknown error';
      errors.push({ agent: name, error: errMsg });
      personaResults[name] = {
        persona: name,
        status: 'error',
        signal: 'neutral',
        confidence: 0.1,
        score: 0,
        weight: PERSONA_WEIGHTS[name],
        reasoning: `Error: ${errMsg}`,
        bd_recommendation: 'skip',
      };
      if (sseEmit) sseEmit.error(name, address, errMsg);
    }
  }

  console.log(`[${requestId}] ⏱️ Phase 2 complete: ${Date.now() - phase2Start}ms`);

  // ─── Phase 3: Compute composite score (70% sub-agents + 30% personas) ───
  const subAgentScore = computeWeightedScore(results);
  const personaScore = computePersonaScore(personaResults);
  const finalScore = Math.round((subAgentScore * SUB_AGENT_RATIO + personaScore * PERSONA_RATIO) * 100) / 100;
  const verdict = getVerdict(finalScore);

  // Persona consensus
  const personaConsensus = computePersonaConsensus(personaResults, finalScore);

  // Persist persona signals to DB
  if (db) {
    persistPersonaSignals(db, address, chain, results.scanner, personaResults);
  }

  // Build breakdown
  const breakdown = {
    safety: {
      raw_score: results.safety?.score || 0,
      weight: WEIGHTS.safety,
      weighted: (results.safety?.score || 0) * WEIGHTS.safety,
      status: results.safety?.status || 'error',
      factors: results.safety?.data?.factors || []
    },
    wallet: {
      raw_score: results.wallet?.score || 0,
      weight: WEIGHTS.wallet,
      weighted: (results.wallet?.score || 0) * WEIGHTS.wallet,
      status: results.wallet?.status || 'error',
      factors: results.wallet?.data?.factors || []
    },
    social: {
      raw_score: results.social?.score || 0,
      weight: WEIGHTS.social,
      weighted: (results.social?.score || 0) * WEIGHTS.social,
      status: results.social?.status || 'error',
      factors: results.social?.data?.factors || []
    },
    scorer: {
      raw_score: results.scorer?.score || 0,
      weight: WEIGHTS.scorer,
      weighted: (results.scorer?.score || 0) * WEIGHTS.scorer,
      status: results.scorer?.status || 'error',
      factors: results.scorer?.data?.factors || []
    },
    sub_agent_composite: subAgentScore,
    persona_composite: personaScore,
    composite: finalScore,
    formula: '(safety*0.30 + wallet*0.30 + social*0.20 + scorer*0.20) * 0.70 + persona_consensus * 0.30',
    persona_consensus: personaConsensus,
  };

  // SSE: emit completion
  if (sseEmit) {
    sseEmit.complete(address, chain, finalScore, verdict, personaConsensus.recommendation, personaConsensus);
  }

  console.log(`[${requestId}] 📊 Final: ${finalScore}/100 → ${verdict} (sub:${subAgentScore} persona:${personaScore}) BD:${personaConsensus.recommendation}`);

  return {
    score: finalScore,
    verdict,
    breakdown,
    subAgentResults: results,
    personaResults,
    personaConsensus,
    agentTimings: timings,
    errors
  };
}

/**
 * Compute weighted composite score from sub-agent results
 */
function computeWeightedScore(results) {
  let weighted = 0;
  let totalWeight = 0;

  for (const [agent, weight] of Object.entries(WEIGHTS)) {
    const agentResult = results[agent];
    if (agentResult && agentResult.status === 'completed' && typeof agentResult.score === 'number') {
      weighted += agentResult.score * weight;
      totalWeight += weight;
    }
  }

  // If some agents failed, normalize to available weight
  if (totalWeight > 0 && totalWeight < 1.0) {
    weighted = weighted / totalWeight;
  }

  return Math.round(weighted * 100) / 100;
}

/**
 * Compute weighted persona score
 */
function computePersonaScore(personaResults) {
  let weighted = 0;
  let totalWeight = 0;

  for (const [name, weight] of Object.entries(PERSONA_WEIGHTS)) {
    const persona = personaResults[name];
    if (persona && persona.status === 'completed' && typeof persona.score === 'number') {
      weighted += persona.score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0 && totalWeight < 1.0) {
    weighted = weighted / totalWeight;
  }

  return Math.round(weighted * 100) / 100;
}

/**
 * Compute persona consensus and BD recommendation
 * Section 12: 3+ bullish + score >= 75 = outreach_now
 *             2+ bullish + score >= 60 = monitor
 */
function computePersonaConsensus(personaResults, finalScore) {
  const signals = Object.values(personaResults);
  const bullish = signals.filter(p => p.signal === 'bullish').length;
  const bearish = signals.filter(p => p.signal === 'bearish').length;
  const neutral = signals.filter(p => p.signal === 'neutral').length;

  let recommendation = 'skip';
  if (bullish >= 3 && finalScore >= 75) {
    recommendation = 'outreach_now';
  } else if (bullish >= 2 && finalScore >= 60) {
    recommendation = 'monitor';
  }

  return {
    bullish,
    bearish,
    neutral,
    total: signals.length,
    recommendation,
    personas: Object.entries(personaResults).map(([name, p]) => ({
      name,
      signal: p.signal,
      confidence: p.confidence,
      score: p.score,
    })),
  };
}

/**
 * Persist persona signals to database
 */
function persistPersonaSignals(db, address, chain, scannerResult, personaResults) {
  try {
    const insert = db.prepare(`
      INSERT INTO persona_signals
      (token_address, chain, symbol, persona_name, signal, confidence, reasoning,
       bd_recommendation, raw_score, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const symbol = scannerResult?.tokenSymbol || scannerResult?.data?.symbol || null;

    const insertMany = db.transaction((personas) => {
      for (const [name, p] of Object.entries(personas)) {
        insert.run(
          address, chain, symbol, name,
          p.signal, p.confidence, p.reasoning,
          p.bd_recommendation, p.score, p.model_used
        );
      }
    });

    insertMany(personaResults);
  } catch (err) {
    console.error(`[orchestrator] ⚠️ Failed to persist persona signals: ${err.message}`);
  }
}

/**
 * Get verdict from score
 */
function getVerdict(score) {
  if (score >= THRESHOLDS.HOT) return 'HOT';
  if (score >= THRESHOLDS.QUALIFIED) return 'QUALIFIED';
  if (score >= THRESHOLDS.WATCH) return 'WATCH';
  return 'SKIP';
}

/**
 * Process a Promise.allSettled result into a standardized agent result
 */
function processAgentResult(agentName, settledResult, errors) {
  if (settledResult.status === 'fulfilled') {
    const value = settledResult.value;
    return {
      status: value.status || 'completed',
      score: value.score || 0,
      duration_ms: value.duration_ms || 0,
      tokenName: value.tokenName || null,
      tokenSymbol: value.tokenSymbol || null,
      marketCap: value.marketCap || null,
      liquidity: value.liquidity || null,
      priceUsd: value.priceUsd || null,
      dexscreenerUrl: value.dexscreenerUrl || null,
      data: value.data || null
    };
  } else {
    const errMsg = settledResult.reason?.message || 'Unknown error';
    errors.push({ agent: agentName, error: errMsg });
    console.error(`[orchestrator] ❌ ${agentName} failed: ${errMsg}`);
    return {
      status: 'error',
      score: 0,
      duration_ms: 0,
      data: null,
      error: errMsg
    };
  }
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

module.exports = { orchestrateScore, WEIGHTS, PERSONA_WEIGHTS, THRESHOLDS };
