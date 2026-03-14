/**
 * Institutional Persona Agent — "Due diligence first"
 *
 * Philosophy: Compliance, credibility, regulatory risk assessment.
 * Looks for: Audit status, team doxx, contract quality, regulatory signals.
 * Signal weight: 0.35 (highest — institutional credibility matters most for BD)
 * Model: bankr/claude-haiku-4.5 (more sophisticated reasoning for compliance)
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const WEIGHT = 0.35;

/**
 * Analyze token from institutional/compliance perspective
 */
async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateInstitutionalFactors(tokenData);
    const score = computeInstitutionalScore(factors);
    const signal = score >= 65 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    const confidence = Math.min(1.0, Math.max(0.1, score / 100));

    let reasoning = generateInstitutionalReasoning(factors, score);
    if (llmCall) {
      try {
        const llmReasoning = await getInstitutionalLLMAnalysis(tokenData, factors, llmCall);
        if (llmReasoning) reasoning = llmReasoning;
      } catch {}
    }

    const recommendation = deriveRecommendation(signal, confidence, score);

    return {
      persona: 'institutional-agent',
      status: 'completed',
      signal,
      confidence,
      score,
      weight: WEIGHT,
      reasoning,
      bd_recommendation: recommendation,
      factors,
      model_used: llmCall ? 'bankr/claude-haiku-4.5' : 'rule-based',
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      persona: 'institutional-agent',
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

function evaluateInstitutionalFactors(data) {
  const factors = [];
  const safety = data.safetyData || data.safety?.data || {};
  const scanner = data.scannerData || data.scanner?.data || {};
  const social = data.socialData || data.social?.data || {};
  const safetyScore = data.safetyScore || data.safety?.score || 0;

  // Contract safety (RugCheck results — highest priority for institutions)
  if (safetyScore >= 80) {
    factors.push({ name: 'contract_safety', score: 25, detail: `Safety score ${safetyScore}/100 — clean contract` });
  } else if (safetyScore >= 60) {
    factors.push({ name: 'contract_safety', score: 15, detail: `Safety score ${safetyScore}/100 — minor concerns` });
  } else if (safetyScore > 0) {
    factors.push({ name: 'contract_safety', score: 5, detail: `Safety score ${safetyScore}/100 — significant risks` });
  } else {
    factors.push({ name: 'contract_safety', score: 0, detail: 'Safety score unavailable — cannot verify' });
  }

  // Instant kill checks (mint authority, honeypot, blacklist)
  const hasInstantKill = safety.instant_kills?.length > 0 || safety.honeypot || safety.mint_not_revoked;
  if (hasInstantKill) {
    factors.push({ name: 'instant_kill', score: -30, detail: 'CRITICAL: Instant kill risk detected — institutional no-go' });
  }

  // Audit status
  const isAudited = safety.audited || safety.audit_status === 'audited' || scanner.audit;
  if (isAudited) {
    factors.push({ name: 'audit_status', score: 20, detail: 'Contract audited — meets institutional standard' });
  } else {
    factors.push({ name: 'audit_status', score: 0, detail: 'No audit found — institutional risk flag' });
  }

  // Team visibility/doxx
  const hasTeam = social.team_visible || social.team_doxxed || scanner.info?.socials?.length > 2;
  const hasWebsite = scanner.website || scanner.info?.websites?.length > 0;
  if (hasTeam && hasWebsite) {
    factors.push({ name: 'team_credibility', score: 15, detail: 'Team visible with website — credible project' });
  } else if (hasWebsite) {
    factors.push({ name: 'team_credibility', score: 8, detail: 'Website exists but team not fully visible' });
  } else {
    factors.push({ name: 'team_credibility', score: 0, detail: 'No website or team info — anon project' });
  }

  // Liquidity lock status
  const lpLocked = safety.lp_locked || safety.liquidity_locked;
  if (lpLocked) {
    factors.push({ name: 'liquidity_lock', score: 15, detail: 'Liquidity locked — institutional requirement met' });
  } else {
    factors.push({ name: 'liquidity_lock', score: 0, detail: 'Liquidity not locked — rug risk for institutional entry' });
  }

  // Market cap (institutions prefer established projects)
  const mcap = parseFloat(scanner.market_cap || scanner.mcap || scanner.fdv || 0);
  if (mcap > 10000000) {
    factors.push({ name: 'market_maturity', score: 15, detail: `$${(mcap / 1e6).toFixed(1)}M mcap — institutional-grade` });
  } else if (mcap > 1000000) {
    factors.push({ name: 'market_maturity', score: 10, detail: `$${(mcap / 1e6).toFixed(1)}M mcap — emerging but viable` });
  } else if (mcap > 100000) {
    factors.push({ name: 'market_maturity', score: 5, detail: `$${(mcap / 1000).toFixed(0)}K mcap — too early for institutional` });
  } else {
    factors.push({ name: 'market_maturity', score: 0, detail: 'Micro cap — below institutional threshold' });
  }

  // CoinMarketCap listing (legitimacy signal)
  const cmcListed = scanner.cmc_id || scanner.cmc_rank || scanner.coinmarketcap;
  if (cmcListed) {
    factors.push({ name: 'cmc_listing', score: 10, detail: 'CMC listed — passes basic legitimacy check' });
  }

  // Ownership renounced
  const ownershipRenounced = safety.ownership_renounced || safety.owner_renounced;
  if (ownershipRenounced) {
    factors.push({ name: 'ownership', score: 10, detail: 'Ownership renounced — decentralized control' });
  }

  return factors;
}

function computeInstitutionalScore(factors) {
  const total = factors.reduce((sum, f) => sum + f.score, 0);
  return Math.max(0, Math.min(100, total));
}

function generateInstitutionalReasoning(factors, score) {
  const top = factors.filter(f => f.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const risks = factors.filter(f => f.score <= 0 && f.name !== 'instant_kill');
  const signal = score >= 65 ? 'BULLISH' : score >= 40 ? 'NEUTRAL' : 'BEARISH';

  let reasoning = `Institutional analysis (${signal}, ${score}/100): `;
  reasoning += top.map(f => f.detail).join('. ');
  if (risks.length > 0) {
    reasoning += `. Risks: ${risks.slice(0, 2).map(f => f.detail).join('; ')}`;
  }
  return reasoning;
}

async function getInstitutionalLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As an institutional compliance analyst, evaluate this token for CEX listing (2-3 sentences):
Token: ${tokenData.scannerData?.name || 'Unknown'}
Safety: ${factors.find(f => f.name === 'contract_safety')?.detail || 'N/A'}
Audit: ${factors.find(f => f.name === 'audit_status')?.detail || 'N/A'}
Team: ${factors.find(f => f.name === 'team_credibility')?.detail || 'N/A'}
LP Lock: ${factors.find(f => f.name === 'liquidity_lock')?.detail || 'N/A'}
Would this pass institutional due diligence for a CEX listing? Key risks?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
