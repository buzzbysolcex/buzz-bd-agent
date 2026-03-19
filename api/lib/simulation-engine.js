/**
 * Enhanced Simulation Engine — MiroFish P1-B
 * 4 Personas x 5 Weight Variations = 20 Agent Verdicts
 *
 * Integrates with:
 *   - llm-cascade.js (cascadeCall for sub-agent LLM calls)
 *   - pipeline_tokens + token_scores (DB)
 *   - persona agents at api/services/agents/personas/
 *   - financial-datasets MCP (optional)
 *
 * Buzz BD Agent | SolCex
 */

const { getDB } = require('../db');
const { cascadeCall } = require('./llm-cascade');

// Optional: Financial Datasets MCP integration
let financialDatasets;
try { financialDatasets = require('../intel/financial-datasets-mcp'); } catch {}

// ─── Persona Definitions ────────────────────────────────
const PERSONAS = {
  degen:         { baseWeight: 0.15, variations: [0.05, 0.10, 0.15, 0.20, 0.25], focus: 'momentum, narrative, hype' },
  whale:         { baseWeight: 0.25, variations: [0.15, 0.20, 0.25, 0.30, 0.35], focus: 'smart money, accumulation, liquidity' },
  institutional: { baseWeight: 0.35, variations: [0.25, 0.30, 0.35, 0.40, 0.45], focus: 'audit, KYC, compliance, risk' },
  community:     { baseWeight: 0.25, variations: [0.15, 0.20, 0.25, 0.30, 0.35], focus: 'organic growth, dev activity, holder loyalty' },
};

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
    token = db.prepare('SELECT * FROM pipeline_tokens WHERE address = ?').get(tokenAddress);
  } catch {}

  const addr = token?.address || tokenAddress;
  if (addr) {
    try {
      scores = db.prepare('SELECT * FROM token_scores WHERE address = ?').get(addr);
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
    try { const s = JSON.parse(scores.safety_data || '{}'); safetyScore = s.score || 0; } catch {}
    try { const w = JSON.parse(scores.wallet_data || '{}'); walletScore = w.score || 0; } catch {}
    try { const so = JSON.parse(scores.social_data || '{}'); socialScore = so.score || 0; } catch {}
    try {
      const sd = JSON.parse(scores.scanner_data || '{}');
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
    mcap = compositeScore >= 85 ? 50000000 : compositeScore >= 70 ? 5000000 : 500000;
    volume24h = compositeScore >= 85 ? 5000000 : compositeScore >= 70 ? 1000000 : 100000;
    holders = compositeScore >= 85 ? 10000 : compositeScore >= 70 ? 3000 : 500;
  }

  return { compositeScore, safetyScore, walletScore, socialScore, mcap, volume24h, holders };
}

// ─── Build LLM Prompt ────────────────────────────────────

function buildPrompt(persona, weight, focus, symbol, chain, ctx) {
  return `You are a ${persona} analyst evaluating token ${symbol} (${chain}) for exchange listing on SolCex.
Your influence weight in this simulation is ${weight}.

TOKEN DATA:
- Composite Score: ${ctx.compositeScore}/100
- Safety Score: ${ctx.safetyScore}/30
- Wallet Score: ${ctx.walletScore}/30
- Social Score: ${ctx.socialScore}/20
- Market Cap: $${ctx.mcap.toLocaleString()}
- 24h Volume: $${ctx.volume24h.toLocaleString()}
- Holders: ${ctx.holders}
- Chain: ${chain}

As a ${persona} with weight ${weight}, your focus is: ${focus}

Respond ONLY with valid JSON:
{"verdict":"STRONG_BUY|BUY|NEUTRAL|SELL|STRONG_SELL","confidence":0.0-1.0,"reasoning":"2-3 sentences","priceTarget30d":"UP_50|UP_20|STABLE|DOWN_20|DOWN_50","riskLevel":"LOW|MEDIUM|HIGH|EXTREME"}`;
}

// ─── Single Agent Call ───────────────────────────────────

async function callAgent(persona, weight, focus, symbol, chain, ctx) {
  const prompt = buildPrompt(persona, weight, focus, symbol, chain, ctx);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), CALL_TIMEOUT_MS)
  );

  const llmPromise = cascadeCall({
    messages: [
      { role: 'system', content: `You are a ${persona} persona agent for SolCex listing simulations. Return ONLY valid JSON.` },
      { role: 'user', content: prompt },
    ],
    max_tokens: 600,
    temperature: 0.4,
  }, { agent: `sim-${persona}` });

  const raw = await Promise.race([llmPromise, timeoutPromise]);
  let text = typeof raw === 'string' ? raw : raw?.content || raw?.text || JSON.stringify(raw);

  // Strip <think>...</think> blocks (Bankr/gemini-3-flash includes reasoning tags)
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Extract JSON from response — find the last complete JSON object (most likely the answer)
  const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (!jsonMatches || jsonMatches.length === 0) throw new Error('No JSON in response');

  // Try each match until one parses with a valid verdict
  let parsed = null;
  for (const match of jsonMatches) {
    try {
      const candidate = JSON.parse(match);
      if (candidate.verdict) { parsed = candidate; break; }
    } catch {}
  }
  if (!parsed) {
    // Fallback: try the first parseable match
    for (const match of jsonMatches) {
      try { parsed = JSON.parse(match); break; } catch {}
    }
  }
  if (!parsed) throw new Error('No parseable JSON in response');

  // Validate required fields
  if (!VERDICT_MAP.hasOwnProperty(parsed.verdict)) {
    throw new Error(`Invalid verdict: ${parsed.verdict}`);
  }

  return {
    persona,
    weight,
    verdict: parsed.verdict,
    confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
    reasoning: parsed.reasoning || '',
    priceTarget30d: parsed.priceTarget30d || 'STABLE',
    riskLevel: parsed.riskLevel || 'MEDIUM',
    status: 'COMPLETED',
  };
}

// ─── Consensus Calculation ───────────────────────────────

function calculateConsensus(verdicts) {
  const completed = verdicts.filter(v => v.status === 'COMPLETED');
  if (completed.length === 0) {
    return { score: 0, confidence: 0, consensus: 'NEUTRAL', recommendation: 'CAUTION' };
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
  const mean = numericVerdicts.reduce((a, b) => a + b, 0) / numericVerdicts.length;
  const variance = numericVerdicts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericVerdicts.length;
  const stddev = Math.sqrt(variance);

  // Confidence: 1 - (stddev / 2), clamped
  const confidence = Math.min(1, Math.max(0, 1 - (stddev / 2)));

  // Consensus direction
  let consensus;
  if (avg > 0.5) consensus = 'BULLISH';
  else if (avg < -0.5) consensus = 'BEARISH';
  else consensus = 'NEUTRAL';

  // Recommendation
  let recommendation;
  if (consensus === 'BULLISH' && confidence > 0.7) recommendation = 'PROCEED';
  else if (consensus === 'BEARISH' && confidence > 0.7) recommendation = 'REJECT';
  else recommendation = 'CAUTION';

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
    abstainCount: verdicts.filter(v => v.status === 'ABSTAIN').length,
  };
}

// ─── Main Entry: runSimulation ───────────────────────────

async function runSimulation(tokenAddress, chain, options = {}) {
  const startTime = Date.now();
  const depth = options.depth || 'mvp';
  const simulationId = `sim_${require('crypto').randomBytes(8).toString('hex')}`;
  const db = getDB();

  // 1. Fetch token data
  const { token, scores } = lookupToken(db, tokenAddress, chain);
  const symbol = token?.ticker || token?.name || tokenAddress.slice(0, 8);
  const ctx = buildTokenContext(token, scores);

  // 2. Optional: enrich with Financial Datasets data
  let financialData = null;
  if (financialDatasets && typeof financialDatasets.getTokenData === 'function') {
    try {
      financialData = await financialDatasets.getTokenData(tokenAddress, chain);
      if (financialData?.marketCap) ctx.mcap = financialData.marketCap;
      if (financialData?.volume24h) ctx.volume24h = financialData.volume24h;
      if (financialData?.holders) ctx.holders = financialData.holders;
    } catch {}
  }

  // 3. Build 20 agent calls (4 personas x 5 variations)
  const agentCalls = [];
  for (const [persona, config] of Object.entries(PERSONAS)) {
    for (const weight of config.variations) {
      agentCalls.push(
        callAgent(persona, weight, config.focus, symbol, chain, ctx)
          .catch(err => ({
            persona,
            weight,
            verdict: 'NEUTRAL',
            confidence: 0,
            reasoning: `Agent call failed: ${err.message}`,
            priceTarget30d: 'STABLE',
            riskLevel: 'MEDIUM',
            status: 'ABSTAIN',
          }))
      );
    }
  }

  // 4. Execute all 20 calls in parallel
  const results = await Promise.allSettled(agentCalls);
  const verdicts = results.map(r => r.status === 'fulfilled' ? r.value : {
    persona: 'unknown',
    weight: 0,
    verdict: 'NEUTRAL',
    confidence: 0,
    reasoning: 'Promise rejected',
    priceTarget30d: 'STABLE',
    riskLevel: 'MEDIUM',
    status: 'ABSTAIN',
  });

  // 5. Calculate consensus
  const consensus = calculateConsensus(verdicts);

  // 5b. Adversarial bull/bear debate (B5)
  let debate = null;
  const completed = verdicts.filter(v => v.status === 'COMPLETED');
  if (completed.length >= 6) {
    try {
      debate = await runDebate(completed, symbol, chain);
    } catch (e) {
      console.error('[SimEngine] Debate failed:', e.message);
    }
  }

  // 6. Build metrics
  const durationMs = Date.now() - startTime;
  const metrics = {
    totalAgents: 20,
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

// ─── Adversarial Bull/Bear Debate ────────────────────────

async function runDebate(completedVerdicts, symbol, chain) {
  const sorted = [...completedVerdicts].sort((a, b) => {
    const va = VERDICT_MAP[a.verdict] || 0;
    const vb = VERDICT_MAP[b.verdict] || 0;
    return vb - va;
  });

  const bulls = sorted.slice(0, 3);
  const bears = sorted.slice(-3).reverse();

  const bullCase = bulls.map(v =>
    `${v.persona} (w=${v.weight}): ${v.verdict} — ${v.reasoning}`
  ).join('\n');

  const bearCase = bears.map(v =>
    `${v.persona} (w=${v.weight}): ${v.verdict} — ${v.reasoning}`
  ).join('\n');

  const debatePrompt = `You are a senior crypto analyst reviewing a listing simulation for ${symbol} (${chain}) on SolCex Exchange.

BULL CASE (top 3 most bullish agents):
${bullCase}

BEAR CASE (top 3 most bearish/cautious agents):
${bearCase}

Synthesize both cases in 3-4 sentences. Who has the stronger argument? What is the key risk? What is the key signal? End with a one-word refined consensus: BULLISH, BEARISH, or NEUTRAL.

Respond ONLY with valid JSON:
{"synthesis":"3-4 sentences","refined_consensus":"BULLISH|BEARISH|NEUTRAL","key_risk":"one sentence","key_signal":"one sentence"}`;

  const result = await cascadeCall({
    messages: [
      { role: 'system', content: 'You are a senior analyst. Respond only with valid JSON.' },
      { role: 'user', content: debatePrompt }
    ],
    max_tokens: 400,
    temperature: 0.3,
  }, { agent: 'debate-analyst' });

  let text = typeof result === 'string' ? result : result?.content || result?.text || '';
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { transcript: text, refined_consensus: null };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      synthesis: parsed.synthesis || '',
      refined_consensus: parsed.refined_consensus || null,
      key_risk: parsed.key_risk || '',
      key_signal: parsed.key_signal || '',
      bull_arguments: bulls.map(v => ({ persona: v.persona, verdict: v.verdict, reasoning: v.reasoning })),
      bear_arguments: bears.map(v => ({ persona: v.persona, verdict: v.verdict, reasoning: v.reasoning })),
    };
  } catch {
    return { transcript: text, refined_consensus: null };
  }
}

module.exports = { runSimulation, PERSONAS, VERDICT_MAP, calculateConsensus, runDebate };
