/**
 * Degen Persona Agent — "Ape early, exit fast"
 *
 * Philosophy: High-risk momentum trading perspective.
 * Looks for: Volume surge, meme potential, early-stage tokenomics, momentum.
 * Signal weight: 0.15
 * Model: bankr/gpt-5-nano (FREE)
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const WEIGHT = 0.15;

/**
 * Analyze token from degen perspective
 * @param {object} tokenData - Scanner + safety + wallet + social data
 * @param {function} llmCall - LLM function (bankr/gpt-5-nano)
 * @returns {object} { signal, confidence, reasoning, score, recommendation }
 */
async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateDegenFactors(tokenData);
    const score = computeDegenScore(factors);
    const signal = score >= 65 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    const confidence = Math.min(1.0, Math.max(0.1, score / 100));

    // LLM enrichment for reasoning (if available)
    let reasoning = generateDegenReasoning(factors, score);
    if (llmCall) {
      try {
        const llmReasoning = await getDegenLLMAnalysis(tokenData, factors, llmCall);
        if (llmReasoning) reasoning = llmReasoning;
      } catch {
        // Fall back to rule-based reasoning
      }
    }

    const recommendation = deriveRecommendation(signal, confidence, score);

    return {
      persona: 'degen-agent',
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
      persona: 'degen-agent',
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

/**
 * Evaluate degen-specific factors from token data
 */
function evaluateDegenFactors(data) {
  const factors = [];
  const scanner = data.scannerData || data.scanner?.data || {};
  const social = data.socialData || data.social?.data || {};

  // Volume surge (24h volume vs liquidity ratio)
  const volume24h = parseFloat(scanner.volume_24h || scanner.volume?.h24 || 0);
  const liquidity = parseFloat(scanner.liquidity_usd || scanner.liquidity || 0);
  const volLiqRatio = liquidity > 0 ? volume24h / liquidity : 0;

  if (volLiqRatio > 3) {
    factors.push({ name: 'volume_surge', score: 20, detail: `Vol/Liq ratio ${volLiqRatio.toFixed(1)}x — massive trading activity` });
  } else if (volLiqRatio > 1.5) {
    factors.push({ name: 'volume_surge', score: 12, detail: `Vol/Liq ratio ${volLiqRatio.toFixed(1)}x — healthy momentum` });
  } else if (volLiqRatio > 0.5) {
    factors.push({ name: 'volume_surge', score: 5, detail: `Vol/Liq ratio ${volLiqRatio.toFixed(1)}x — moderate activity` });
  } else {
    factors.push({ name: 'volume_surge', score: 0, detail: 'Low volume relative to liquidity' });
  }

  // Price momentum (24h change)
  const priceChange = parseFloat(scanner.price_change_24h || scanner.priceChange?.h24 || 0);
  if (priceChange > 50) {
    factors.push({ name: 'price_momentum', score: 20, detail: `+${priceChange.toFixed(1)}% in 24h — parabolic` });
  } else if (priceChange > 20) {
    factors.push({ name: 'price_momentum', score: 15, detail: `+${priceChange.toFixed(1)}% in 24h — strong pump` });
  } else if (priceChange > 5) {
    factors.push({ name: 'price_momentum', score: 8, detail: `+${priceChange.toFixed(1)}% in 24h — trending up` });
  } else if (priceChange > -10) {
    factors.push({ name: 'price_momentum', score: 3, detail: `${priceChange.toFixed(1)}% in 24h — stable` });
  } else {
    factors.push({ name: 'price_momentum', score: 0, detail: `${priceChange.toFixed(1)}% in 24h — dumping` });
  }

  // Early stage (low mcap = high upside potential for degens)
  const mcap = parseFloat(scanner.market_cap || scanner.mcap || scanner.fdv || 0);
  if (mcap > 0 && mcap < 500000) {
    factors.push({ name: 'early_stage', score: 20, detail: `$${(mcap / 1000).toFixed(0)}K mcap — micro cap gem potential` });
  } else if (mcap > 0 && mcap < 2000000) {
    factors.push({ name: 'early_stage', score: 15, detail: `$${(mcap / 1e6).toFixed(1)}M mcap — small cap with room` });
  } else if (mcap > 0 && mcap < 10000000) {
    factors.push({ name: 'early_stage', score: 8, detail: `$${(mcap / 1e6).toFixed(1)}M mcap — mid cap` });
  } else {
    factors.push({ name: 'early_stage', score: 2, detail: 'Large cap — limited degen upside' });
  }

  // Meme/narrative potential (social signals)
  const twitterFollowers = parseInt(social.twitter_followers || social.followers || 0);
  const hasMemeSignal = (scanner.name || '').match(/pepe|doge|shib|inu|cat|frog|wojak|chad|moon/i);
  if (hasMemeSignal) {
    factors.push({ name: 'meme_potential', score: 15, detail: 'Meme narrative detected — degen magnet' });
  } else if (twitterFollowers > 10000) {
    factors.push({ name: 'meme_potential', score: 10, detail: `${twitterFollowers} Twitter followers — growing community` });
  } else if (twitterFollowers > 1000) {
    factors.push({ name: 'meme_potential', score: 5, detail: `${twitterFollowers} Twitter followers — early community` });
  } else {
    factors.push({ name: 'meme_potential', score: 0, detail: 'No meme narrative or social presence' });
  }

  // Transaction count (buy pressure)
  const buys = parseInt(scanner.txns?.h24?.buys || scanner.buys_24h || 0);
  const sells = parseInt(scanner.txns?.h24?.sells || scanner.sells_24h || 0);
  const buyRatio = (buys + sells) > 0 ? buys / (buys + sells) : 0.5;
  if (buyRatio > 0.65) {
    factors.push({ name: 'buy_pressure', score: 15, detail: `${(buyRatio * 100).toFixed(0)}% buys — heavy accumulation` });
  } else if (buyRatio > 0.55) {
    factors.push({ name: 'buy_pressure', score: 8, detail: `${(buyRatio * 100).toFixed(0)}% buys — mild buy pressure` });
  } else {
    factors.push({ name: 'buy_pressure', score: 2, detail: `${(buyRatio * 100).toFixed(0)}% buys — sell pressure dominant` });
  }

  // Boost status (paid promotion = active marketing = degen magnet)
  if (scanner.boosted || scanner.boostCount > 0) {
    factors.push({ name: 'boosted', score: 10, detail: 'DexScreener boosted — active promotion' });
  }

  return factors;
}

function computeDegenScore(factors) {
  const total = factors.reduce((sum, f) => sum + f.score, 0);
  return Math.min(100, total);
}

function generateDegenReasoning(factors, score) {
  const top = factors.filter(f => f.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const topDetails = top.map(f => f.detail).join('. ');
  const signal = score >= 65 ? 'BULLISH' : score >= 40 ? 'NEUTRAL' : 'BEARISH';
  return `Degen analysis (${signal}, ${score}/100): ${topDetails || 'No strong signals found.'}`;
}

async function getDegenLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As a degen crypto trader, analyze this token briefly (2-3 sentences max):
Token: ${tokenData.scannerData?.name || tokenData.scanner?.data?.name || 'Unknown'}
Volume/Liq ratio: ${factors.find(f => f.name === 'volume_surge')?.detail || 'N/A'}
Price 24h: ${factors.find(f => f.name === 'price_momentum')?.detail || 'N/A'}
Market cap: ${factors.find(f => f.name === 'early_stage')?.detail || 'N/A'}
Give your degen take: ape or pass? Why?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
