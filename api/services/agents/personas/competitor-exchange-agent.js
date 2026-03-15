/**
 * Competitor Exchange Persona Agent — "What would Bitget/MEXC do?"
 *
 * Philosophy: Competitive listing intelligence.
 * Looks for: First-mover advantage, token validation signals, competitive response.
 * Signal weight: 0.15
 * Model: bankr/gpt-5-nano (FREE)
 *
 * Buzz BD Agent v7.5.0 | Bags.fm-First
 */

const WEIGHT = 0.15;

async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateCompetitiveFactors(tokenData);
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
      persona: 'competitor-exchange-agent',
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
      persona: 'competitor-exchange-agent',
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

function evaluateCompetitiveFactors(data) {
  const factors = [];
  const scanner = data.scannerData || data.scanner?.data || {};
  const social = data.socialData || data.social?.data || {};
  const safety = data.safetyData || data.safety?.data || {};

  // First-mover advantage (not yet on major CEXs)
  const mcap = parseFloat(scanner.market_cap || scanner.mcap || scanner.fdv || 0);
  const volume = parseFloat(scanner.volume_24h || scanner.volume?.h24 || 0);

  if (mcap > 0 && mcap < 10000000 && volume > 50000) {
    factors.push({ name: 'first_mover', score: 25, detail: 'Sub-$10M mcap with volume — first-mover CEX listing advantage' });
  } else if (mcap > 0 && mcap < 50000000 && volume > 100000) {
    factors.push({ name: 'first_mover', score: 18, detail: 'Mid-cap with strong volume — competitive listing opportunity' });
  } else if (mcap >= 50000000) {
    factors.push({ name: 'first_mover', score: 5, detail: 'Large cap — likely already on multiple CEXs' });
  } else {
    factors.push({ name: 'first_mover', score: 8, detail: 'Early stage — potential first-mover but risky' });
  }

  // Validation signal (other CEXs would follow)
  const liquidity = parseFloat(scanner.liquidity_usd || scanner.liquidity || 0);
  if (liquidity > 100000 && volume > 200000) {
    factors.push({ name: 'validation_signal', score: 20, detail: 'Strong DEX metrics — listing validates token for other CEXs' });
  } else if (liquidity > 50000) {
    factors.push({ name: 'validation_signal', score: 12, detail: 'Decent liquidity — moderate validation signal' });
  } else {
    factors.push({ name: 'validation_signal', score: 3, detail: 'Low liquidity — weak validation signal' });
  }

  // Community readiness for CEX
  const twitterFollowers = parseInt(social.twitter_followers || social.followers || 0);
  if (twitterFollowers > 50000) {
    factors.push({ name: 'cex_ready_community', score: 20, detail: `${twitterFollowers} followers — CEX-ready community` });
  } else if (twitterFollowers > 10000) {
    factors.push({ name: 'cex_ready_community', score: 12, detail: `${twitterFollowers} followers — growing community` });
  } else if (twitterFollowers > 1000) {
    factors.push({ name: 'cex_ready_community', score: 5, detail: `${twitterFollowers} followers — early community` });
  } else {
    factors.push({ name: 'cex_ready_community', score: 0, detail: 'Minimal community — not CEX-ready' });
  }

  // Safety profile (CEXs require clean contracts)
  const safetyScore = data.safetyScore || 0;
  if (safetyScore >= 80) {
    factors.push({ name: 'cex_safety', score: 20, detail: `Safety ${safetyScore}/100 — meets CEX listing standards` });
  } else if (safetyScore >= 60) {
    factors.push({ name: 'cex_safety', score: 10, detail: `Safety ${safetyScore}/100 — borderline for CEX` });
  } else {
    factors.push({ name: 'cex_safety', score: 0, detail: `Safety ${safetyScore}/100 — would not pass CEX review` });
  }

  // Volume cannibalization risk (high volume = CEX listing may cannibalize DEX)
  if (volume > 1000000) {
    factors.push({ name: 'volume_growth', score: 15, detail: `$${(volume/1e6).toFixed(1)}M daily — CEX listing adds volume` });
  } else if (volume > 100000) {
    factors.push({ name: 'volume_growth', score: 10, detail: `$${(volume/1000).toFixed(0)}K daily — CEX listing would boost significantly` });
  } else {
    factors.push({ name: 'volume_growth', score: 3, detail: 'Low volume — CEX listing may not generate meaningful volume' });
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
  return `Competitor exchange analysis (${signal}, ${score}/100): ${topDetails || 'No strong competitive signals.'}`;
}

async function getLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As a BD analyst at a competing CEX (Bitget/MEXC), briefly analyze this listing opportunity (2-3 sentences):
Token: ${tokenData.scannerData?.name || 'Unknown'}
Volume: ${factors.find(f => f.name === 'volume_growth')?.detail || 'N/A'}
Safety: ${factors.find(f => f.name === 'cex_safety')?.detail || 'N/A'}
First-mover: ${factors.find(f => f.name === 'first_mover')?.detail || 'N/A'}
Would your exchange list this? Would SolCex gain first-mover advantage?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
