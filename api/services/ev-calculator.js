/**
 * EV Calculator — MiroFish Stage 1
 * Expected Value = probability * revenue - (1 - probability) * cost
 *
 * Pure math utility — no DB, no LLM, no side effects.
 * Buzz BD Agent | MiroFish MVP
 */

function calculateEV(probability, revenue = 1000, cost = 500) {
  const ev = Math.round(probability * revenue - (1 - probability) * cost);
  let decision;
  if (ev > 200) decision = "LIST";
  else if (ev >= 0) decision = "MONITOR";
  else decision = "REJECT";

  return {
    probability,
    revenue,
    cost,
    ev,
    decision,
    formula: `EV = ${probability} × ${revenue} − ${(1 - probability).toFixed(2)} × ${cost} = ${ev}`,
  };
}

function calculateConfidence(verdicts) {
  if (!verdicts || verdicts.length === 0) return 0;
  const scores = verdicts.map((v) => {
    if (v.signal === "bullish") return 1;
    if (v.signal === "neutral") return 0.5;
    return 0;
  });
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  return Math.round((1 - stdDev / 0.5) * 100) / 100;
}

function calculateProbability(verdicts) {
  if (!verdicts || verdicts.length === 0) return 0;
  let weightedBullish = 0;
  let totalWeight = 0;
  for (const v of verdicts) {
    const w = v.weight || 0.25;
    totalWeight += w;
    if (v.signal === "bullish") weightedBullish += w;
    else if (v.signal === "neutral") weightedBullish += w * 0.5;
  }
  return totalWeight > 0
    ? Math.round((weightedBullish / totalWeight) * 100) / 100
    : 0;
}

function buildClusterBreakdown(verdicts) {
  const clusters = {};
  for (const v of verdicts) {
    const persona = (v.persona || "unknown").replace("-agent", "");
    if (!clusters[persona]) {
      clusters[persona] = {
        bullish: 0,
        neutral: 0,
        bearish: 0,
        total: 0,
        agents: [],
      };
    }
    clusters[persona][v.signal || "neutral"]++;
    clusters[persona].total++;
    clusters[persona].agents.push({
      weight: v.weight,
      signal: v.signal,
      confidence: v.confidence,
      score: v.score,
    });
  }
  // Add consensus label
  for (const [name, cluster] of Object.entries(clusters)) {
    if (
      cluster.bullish > cluster.bearish &&
      cluster.bullish > cluster.neutral
    ) {
      cluster.consensus = "BULLISH";
    } else if (cluster.bearish > cluster.bullish) {
      cluster.consensus = "BEARISH";
    } else {
      cluster.consensus = "MIXED";
    }
  }
  return clusters;
}

function identifySignals(clusters) {
  const risks = [];
  const signals = [];
  for (const [name, cluster] of Object.entries(clusters)) {
    if (cluster.consensus === "BEARISH") risks.push(`${name} cluster bearish`);
    else if (cluster.consensus === "MIXED") risks.push(`${name} cluster split`);
    else if (cluster.consensus === "BULLISH")
      signals.push(`${name} cluster aligned bullish`);
  }
  return {
    key_risk: risks.length > 0 ? risks.join("; ") : "No major risks identified",
    key_signal:
      signals.length > 0 ? signals.join("; ") : "No strong bullish alignment",
  };
}

module.exports = {
  calculateEV,
  calculateConfidence,
  calculateProbability,
  buildClusterBreakdown,
  identifySignals,
};
