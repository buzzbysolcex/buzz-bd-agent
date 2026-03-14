/**
 * Whale Persona Agent — "Follow smart money"
 *
 * Philosophy: Track large wallet accumulation, DEX→CEX flows, smart money patterns.
 * Looks for: Whale wallet activity, concentrated holdings, Helius forensics.
 * Signal weight: 0.25
 * Model: bankr/gpt-5-nano (FREE)
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const WEIGHT = 0.25;

/**
 * Analyze token from whale/smart money perspective
 */
async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateWhaleFactors(tokenData);
    const score = computeWhaleScore(factors);
    const signal = score >= 65 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    const confidence = Math.min(1.0, Math.max(0.1, score / 100));

    let reasoning = generateWhaleReasoning(factors, score);
    if (llmCall) {
      try {
        const llmReasoning = await getWhaleLLMAnalysis(tokenData, factors, llmCall);
        if (llmReasoning) reasoning = llmReasoning;
      } catch {}
    }

    const recommendation = deriveRecommendation(signal, confidence, score);

    return {
      persona: 'whale-agent',
      status: 'completed',
      signal,
      confidence,
      score,
      weight: WEIGHT,
      reasoning,
      bd_recommendation: recommendation,
      factors,
      model_used: llmCall ? 'bankr/gpt-5-nano' : 'rule-based',
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      persona: 'whale-agent',
      status: 'error',
      signal: 'neutral',
      confidence: 0.1,
      score: 0,
      weight: WEIGHT,
      reasoning: `Error: ${err.message}`,
      bd_recommendation: 'skip',
      factors: [],
      model_used: 'none',
      duration_ms: Date.now() - start,
    };
  }
}

function evaluateWhaleFactors(data) {
  const factors = [];
  const wallet = data.walletData || data.wallet?.data || {};
  const scanner = data.scannerData || data.scanner?.data || {};

  // Top holder concentration
  const topHolderPct = parseFloat(wallet.top10_holder_pct || wallet.top_holders_pct || 0);
  if (topHolderPct > 0 && topHolderPct < 30) {
    factors.push({ name: 'holder_distribution', score: 20, detail: `Top 10 hold ${topHolderPct.toFixed(1)}% — well distributed, whale-safe` });
  } else if (topHolderPct >= 30 && topHolderPct < 50) {
    factors.push({ name: 'holder_distribution', score: 12, detail: `Top 10 hold ${topHolderPct.toFixed(1)}% — moderate concentration` });
  } else if (topHolderPct >= 50) {
    factors.push({ name: 'holder_distribution', score: 0, detail: `Top 10 hold ${topHolderPct.toFixed(1)}% — high concentration risk` });
  } else {
    factors.push({ name: 'holder_distribution', score: 5, detail: 'Holder data unavailable' });
  }

  // Unique holders count
  const holders = parseInt(wallet.unique_holders || wallet.holders || scanner.holders || 0);
  if (holders > 5000) {
    factors.push({ name: 'holder_count', score: 20, detail: `${holders} holders — strong adoption` });
  } else if (holders > 1000) {
    factors.push({ name: 'holder_count', score: 14, detail: `${holders} holders — growing base` });
  } else if (holders > 200) {
    factors.push({ name: 'holder_count', score: 7, detail: `${holders} holders — early stage` });
  } else {
    factors.push({ name: 'holder_count', score: 0, detail: `${holders || 'Unknown'} holders — too thin` });
  }

  // Liquidity depth (whales need deep liquidity to enter/exit)
  const liquidity = parseFloat(scanner.liquidity_usd || scanner.liquidity || 0);
  if (liquidity > 500000) {
    factors.push({ name: 'liquidity_depth', score: 20, detail: `$${(liquidity / 1e6).toFixed(2)}M liquidity — whale-grade depth` });
  } else if (liquidity > 100000) {
    factors.push({ name: 'liquidity_depth', score: 14, detail: `$${(liquidity / 1000).toFixed(0)}K liquidity — adequate for medium positions` });
  } else if (liquidity > 25000) {
    factors.push({ name: 'liquidity_depth', score: 7, detail: `$${(liquidity / 1000).toFixed(0)}K liquidity — thin for whale entry` });
  } else {
    factors.push({ name: 'liquidity_depth', score: 0, detail: 'Insufficient liquidity for whale positions' });
  }

  // Smart money signals (wallet forensics)
  const smartMoneyIn = wallet.smart_money_inflow || wallet.whale_buys || 0;
  const smartMoneyOut = wallet.smart_money_outflow || wallet.whale_sells || 0;
  if (smartMoneyIn > smartMoneyOut && smartMoneyIn > 0) {
    factors.push({ name: 'smart_money_flow', score: 15, detail: 'Net smart money inflow detected' });
  } else if (smartMoneyOut > smartMoneyIn && smartMoneyOut > 0) {
    factors.push({ name: 'smart_money_flow', score: 0, detail: 'Smart money outflow — whales exiting' });
  } else {
    factors.push({ name: 'smart_money_flow', score: 5, detail: 'No clear smart money signal' });
  }

  // DEX to CEX flow (indicates institutional interest)
  const dexToCex = wallet.dex_to_cex_flow || 0;
  if (dexToCex > 0) {
    factors.push({ name: 'dex_cex_flow', score: 10, detail: 'DEX→CEX flow detected — potential CEX listing prep' });
  }

  // Pair age (older = more established = safer for whales)
  const pairAge = scanner.pair_age_hours || scanner.pairCreatedAt
    ? Math.floor((Date.now() - new Date(scanner.pairCreatedAt).getTime()) / 3600000)
    : 0;
  if (pairAge > 720) { // 30+ days
    factors.push({ name: 'pair_maturity', score: 15, detail: `Pair age ${Math.floor(pairAge / 24)}d — established and tested` });
  } else if (pairAge > 168) { // 7+ days
    factors.push({ name: 'pair_maturity', score: 10, detail: `Pair age ${Math.floor(pairAge / 24)}d — survived first week` });
  } else if (pairAge > 24) {
    factors.push({ name: 'pair_maturity', score: 5, detail: `Pair age ${Math.floor(pairAge / 24)}d — very new` });
  } else {
    factors.push({ name: 'pair_maturity', score: 0, detail: 'Pair < 24h old — too early for whale entry' });
  }

  return factors;
}

function computeWhaleScore(factors) {
  return Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));
}

function generateWhaleReasoning(factors, score) {
  const top = factors.filter(f => f.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const signal = score >= 65 ? 'BULLISH' : score >= 40 ? 'NEUTRAL' : 'BEARISH';
  return `Whale analysis (${signal}, ${score}/100): ${top.map(f => f.detail).join('. ') || 'Insufficient data.'}`;
}

async function getWhaleLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As a crypto whale managing $10M+, analyze this token briefly (2-3 sentences):
Token: ${tokenData.scannerData?.name || 'Unknown'}
Liquidity: ${factors.find(f => f.name === 'liquidity_depth')?.detail || 'N/A'}
Holders: ${factors.find(f => f.name === 'holder_count')?.detail || 'N/A'}
Distribution: ${factors.find(f => f.name === 'holder_distribution')?.detail || 'N/A'}
Would you take a position? Why or why not?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
