/**
 * Narrative Trader Persona Agent — "Trade the story, not the chart"
 *
 * Philosophy: CT narrative momentum trading.
 * Looks for: Viral potential, asymmetric upside, listing event alpha.
 * Signal weight: 0.15
 * Model: bankr/gpt-5-nano (FREE)
 *
 * Buzz BD Agent v7.5.0 | Bags.fm-First
 */

const WEIGHT = 0.15;

async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateNarrativeFactors(tokenData);
    const score = computeScore(factors);
    const signal = score >= 65 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    const confidence = Math.min(1.0, Math.max(0.1, score / 100));

    let reasoning = generateReasoning(factors, score);
    if (llmCall) {
      try {
        const llmReasoning = await getLLMAnalysis(tokenData, factors, llmCall);
        if (llmReasoning) reasoning = llmReasoning;
      } catch {
        // Fall back to rule-based reasoning
      }
    }

    const recommendation = deriveRecommendation(signal, confidence, score);

    return {
      persona: 'narrative-trader-agent',
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
      persona: 'narrative-trader-agent',
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

function evaluateNarrativeFactors(data) {
  const factors = [];
  const scanner = data.scannerData || data.scanner?.data || {};
  const social = data.socialData || data.social?.data || {};

  // Viral narrative potential
  const name = (scanner.name || scanner.symbol || '').toLowerCase();
  const hasMeme = name.match(/pepe|doge|shib|inu|cat|frog|wojak|chad|moon|elon|trump|ai|gpt|agent/i);
  const hasTrend = name.match(/ai|agent|rwa|depin|meme|l2|restaking|bags/i);

  if (hasMeme && hasTrend) {
    factors.push({ name: 'viral_narrative', score: 25, detail: 'Multi-narrative token — meme + trend overlap (CT magnet)' });
  } else if (hasTrend) {
    factors.push({ name: 'viral_narrative', score: 18, detail: 'Trend narrative detected — potential CT momentum' });
  } else if (hasMeme) {
    factors.push({ name: 'viral_narrative', score: 15, detail: 'Meme narrative — viral potential but shorter shelf life' });
  } else {
    factors.push({ name: 'viral_narrative', score: 3, detail: 'No obvious narrative — harder to generate CT buzz' });
  }

  // Listing event alpha (price impact of CEX listing)
  const mcap = parseFloat(scanner.market_cap || scanner.mcap || scanner.fdv || 0);
  if (mcap > 0 && mcap < 5000000) {
    factors.push({ name: 'listing_alpha', score: 25, detail: 'Sub-$5M mcap — CEX listing could 2-5x from exposure alone' });
  } else if (mcap > 0 && mcap < 20000000) {
    factors.push({ name: 'listing_alpha', score: 18, detail: '$5-20M mcap — meaningful listing pump expected' });
  } else if (mcap > 0 && mcap < 100000000) {
    factors.push({ name: 'listing_alpha', score: 10, detail: '$20-100M mcap — moderate listing impact' });
  } else {
    factors.push({ name: 'listing_alpha', score: 2, detail: 'Large cap — listing already priced in' });
  }

  // Momentum (price + buy pressure)
  const priceChange = parseFloat(scanner.price_change_24h || scanner.priceChange?.h24 || 0);
  const buys = parseInt(scanner.txns?.h24?.buys || scanner.buys_24h || 0);
  const sells = parseInt(scanner.txns?.h24?.sells || scanner.sells_24h || 0);
  const buyRatio = (buys + sells) > 0 ? buys / (buys + sells) : 0.5;

  if (priceChange > 30 && buyRatio > 0.6) {
    factors.push({ name: 'momentum_play', score: 20, detail: `+${priceChange.toFixed(0)}% with ${(buyRatio*100).toFixed(0)}% buys — narrative momentum confirmed` });
  } else if (priceChange > 10 && buyRatio > 0.55) {
    factors.push({ name: 'momentum_play', score: 12, detail: `+${priceChange.toFixed(0)}% — mild momentum` });
  } else if (priceChange > -10) {
    factors.push({ name: 'momentum_play', score: 5, detail: 'Sideways — waiting for catalyst' });
  } else {
    factors.push({ name: 'momentum_play', score: 0, detail: `${priceChange.toFixed(0)}% — negative momentum, narrative dead` });
  }

  // Social buzz (CT presence)
  const twitterFollowers = parseInt(social.twitter_followers || social.followers || 0);
  if (twitterFollowers > 50000) {
    factors.push({ name: 'ct_presence', score: 15, detail: `${twitterFollowers} followers — CT narrative ready` });
  } else if (twitterFollowers > 10000) {
    factors.push({ name: 'ct_presence', score: 10, detail: `${twitterFollowers} followers — growing CT presence` });
  } else if (twitterFollowers > 2000) {
    factors.push({ name: 'ct_presence', score: 5, detail: `${twitterFollowers} followers — early CT buzz` });
  } else {
    factors.push({ name: 'ct_presence', score: 0, detail: 'No CT presence — hard to trade the narrative' });
  }

  // Volume spike (narrative catalysts show in volume)
  const volume = parseFloat(scanner.volume_24h || scanner.volume?.h24 || 0);
  const liquidity = parseFloat(scanner.liquidity_usd || scanner.liquidity || 0);
  const volLiqRatio = liquidity > 0 ? volume / liquidity : 0;

  if (volLiqRatio > 3) {
    factors.push({ name: 'volume_spike', score: 15, detail: `${volLiqRatio.toFixed(1)}x vol/liq — narrative catalyst in progress` });
  } else if (volLiqRatio > 1.5) {
    factors.push({ name: 'volume_spike', score: 8, detail: `${volLiqRatio.toFixed(1)}x vol/liq — above average interest` });
  } else {
    factors.push({ name: 'volume_spike', score: 2, detail: 'Normal volume — no narrative catalyst detected' });
  }

  return factors;
}

function computeScore(factors) {
  return Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));
}

function generateReasoning(factors, score) {
  const top = factors.filter(f => f.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const topDetails = top.map(f => f.detail).join('. ');
  const signal = score >= 65 ? 'BULLISH' : score >= 40 ? 'NEUTRAL' : 'BEARISH';
  return `Narrative trader analysis (${signal}, ${score}/100): ${topDetails || 'No tradeable narrative found.'}`;
}

async function getLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As a crypto narrative trader on CT, briefly analyze this listing event (2-3 sentences):
Token: ${tokenData.scannerData?.name || 'Unknown'}
Narrative: ${factors.find(f => f.name === 'viral_narrative')?.detail || 'N/A'}
Listing alpha: ${factors.find(f => f.name === 'listing_alpha')?.detail || 'N/A'}
Momentum: ${factors.find(f => f.name === 'momentum_play')?.detail || 'N/A'}
Would this listing create a tradeable narrative? Long, short, or skip?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
