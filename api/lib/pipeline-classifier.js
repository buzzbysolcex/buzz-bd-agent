/**
 * Pipeline Classifier + Dual-Gate Scoring
 * v8.1.0 | Wednesday Day 37
 *
 * Auto-classification: 85+ = hot, 70-84 = qualified, 50-69 = watch, <50 = skip
 * Dual-gate (Mitchell GAP 26): fundamentals AND market must independently clear 60%
 *
 * Fundamentals = Safety(max 25) + Wallet(max 25) + Technical(max 20) = max 70
 * Market = Social(max 15) + Scorer-market(max 15) = max 30
 * Both must clear 60% of their max independently.
 * Fundamentals < 42 = BLOCKED. Market < 18 = BLOCKED.
 */

function classifyToken(score) {
  if (score >= 85) return 'hot';
  if (score >= 70) return 'qualified';
  if (score >= 50) return 'watch';
  return 'skip';
}

function dualGateCheck(scoreBreakdown) {
  if (!scoreBreakdown) return { pass: true, reason: 'no breakdown available — skipping gate' };

  let breakdown;
  try {
    breakdown = typeof scoreBreakdown === 'string' ? JSON.parse(scoreBreakdown) : scoreBreakdown;
  } catch {
    return { pass: true, reason: 'unparseable breakdown — skipping gate' };
  }

  // Extract component scores
  const safety = breakdown.contract_safety || breakdown.safety || 0;
  const wallet = breakdown.holder_dist || breakdown.wallet || 0;
  const technical = (breakdown.token_age || 0) + (breakdown.deployer_history || 0) + (breakdown.momentum || 0);
  const social = (breakdown.team_identity || 0) + (breakdown.social_presence || 0);
  const market = (breakdown.market_cap || 0) + (breakdown.liquidity || 0) + (breakdown.volume || 0);

  const fundamentalsScore = safety + wallet + technical;
  const marketScore = social + market;

  const fundamentalsMax = 70;
  const marketMax = 30;
  const fundamentalsThreshold = Math.floor(fundamentalsMax * 0.6); // 42
  const marketThreshold = Math.floor(marketMax * 0.6); // 18

  const fundamentalsPass = fundamentalsScore >= fundamentalsThreshold;
  const marketPass = marketScore >= marketThreshold;
  const pass = fundamentalsPass && marketPass;

  return {
    pass,
    fundamentals: { score: fundamentalsScore, max: fundamentalsMax, threshold: fundamentalsThreshold, pass: fundamentalsPass },
    market: { score: marketScore, max: marketMax, threshold: marketThreshold, pass: marketPass },
    reason: pass ? 'dual-gate passed' :
      !fundamentalsPass && !marketPass ? `both gates failed (fundamentals ${fundamentalsScore}/${fundamentalsThreshold}, market ${marketScore}/${marketThreshold})` :
      !fundamentalsPass ? `fundamentals failed (${fundamentalsScore}/${fundamentalsThreshold})` :
      `market failed (${marketScore}/${marketThreshold})`
  };
}

// Map classification labels to valid pipeline_tokens.stage values
const CLASSIFICATION_TO_STAGE = {
  hot: 'prospect',       // 85+ → ready for BD outreach
  qualified: 'scored',   // 70-84 → scored, needs review
  watch: 'scored',       // 50-69 → scored but not actionable
  skip: 'discovered'     // <50 → stay in discovered
};

function classifyAndGate(score, scoreBreakdown) {
  const classification = classifyToken(score);
  const gate = dualGateCheck(scoreBreakdown);

  // Determine effective classification (dual-gate can downgrade)
  const effectiveClassification = (classification === 'hot' || classification === 'qualified') && !gate.pass
    ? 'watch' : classification;

  return {
    stage: classification,
    dual_gate_pass: gate.pass,
    gate_details: gate,
    // effective_stage must be a valid pipeline stage for DB constraint
    effective_stage: CLASSIFICATION_TO_STAGE[effectiveClassification] || 'discovered'
  };
}

module.exports = { classifyToken, dualGateCheck, classifyAndGate };
