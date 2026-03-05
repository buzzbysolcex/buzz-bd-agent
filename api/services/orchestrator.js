/**
 * Orchestrator Service — 5 Parallel Sub-Agent Dispatch
 * 
 * Mirrors the OpenClaw orchestrate.js logic but as a REST-callable service.
 * Dispatches scanner, safety, wallet, social, scorer in parallel.
 * Aggregates with weights: safety(0.30) + wallet(0.30) + social(0.20) + scorer(0.20)
 * 
 * In LIVE mode: Calls actual intelligence source APIs
 * In GATEWAY mode: Dispatches to OpenClaw sub-agents via sessions_spawn
 * 
 * Buzz BD Agent v6.1.1 | Sprint Day 9
 */

const { runScannerAgent } = require('./agents/scanner');
const { runSafetyAgent } = require('./agents/safety');
const { runWalletAgent } = require('./agents/wallet');
const { runSocialAgent } = require('./agents/social');
const { runScorerAgent } = require('./agents/scorer');

// Sub-agent weights (MUST sum to 1.0)
const WEIGHTS = {
  safety: 0.30,
  wallet: 0.30,
  social: 0.20,
  scorer: 0.20
};

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
  scorer: 15000     // 15s — computation only, depends on other results
};

/**
 * Main orchestration function
 * Runs 5 sub-agents in parallel, aggregates weighted scores
 */
async function orchestrateScore({ address, chain, depth, requestId }) {
  const results = {};
  const timings = {};
  const errors = [];

  console.log(`[${requestId}] 🎼 Orchestrator: Dispatching 5 agents for ${address} on ${chain}`);

  // ─── Phase 1: Run scanner + safety + wallet + social in parallel ───
  // Scanner provides data that other agents can use
  // All 4 run simultaneously for speed

  const phase1Start = Date.now();
  
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

  // ─── Phase 2: Run scorer with all Phase 1 data ───
  const phase2Start = Date.now();
  
  const scorerResult = await withTimeout(
    runScorerAgent({ 
      address, chain, requestId,
      scannerData: results.scanner?.data,
      safetyData: results.safety?.data,
      walletData: results.wallet?.data,
      socialData: results.social?.data,
      safetyScore: results.safety?.score || 0,
      walletScore: results.wallet?.score || 0,
      socialScore: results.social?.score || 0
    }),
    TIMEOUTS.scorer,
    'scorer'
  ).then(r => ({ status: 'fulfilled', value: r }))
   .catch(err => ({ status: 'rejected', reason: err }));

  results.scorer = processAgentResult('scorer', scorerResult, errors);
  timings.scorer = results.scorer.duration_ms || (Date.now() - phase2Start);

  // ─── Phase 3: Compute weighted composite score ───
  const weightedScore = computeWeightedScore(results);
  const verdict = getVerdict(weightedScore);

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
    composite: weightedScore,
    formula: 'safety(0.30) + wallet(0.30) + social(0.20) + scorer(0.20)'
  };

  console.log(`[${requestId}] 📊 Final: ${weightedScore}/100 → ${verdict}`);

  return {
    score: weightedScore,
    verdict,
    breakdown,
    subAgentResults: results,
    agentTimings: timings,
    errors
  };
}

/**
 * Compute weighted composite score from agent results
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

  return Math.round(weighted * 100) / 100; // 2 decimal places
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

module.exports = { orchestrateScore, WEIGHTS, THRESHOLDS };
