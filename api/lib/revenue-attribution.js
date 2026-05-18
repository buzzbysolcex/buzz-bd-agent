/**
 * Revenue Attribution Service — Day 32 Sprint Phase 3
 */

const { getDB } = require("../db");

const STAGE_PROBABILITIES = {
  discovered: 0.05,
  scanned: 0.1,
  scored: 0.15,
  prospect: 0.25,
  contacted: 0.4,
  negotiating: 0.6,
  approved: 0.85,
  listed: 1.0,
  rejected: 0,
};

function trackAttribution(tokenAddress, chain, source, ticker) {
  const db = getDB();
  const existing = db
    .prepare(
      "SELECT id FROM pipeline_revenue_attribution WHERE token_address = ? AND chain = ?",
    )
    .get(tokenAddress, chain);

  if (existing) {
    db.prepare(
      `
      UPDATE pipeline_revenue_attribution SET discovery_source = COALESCE(?, discovery_source), updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(source, existing.id);
    return existing.id;
  }

  const result = db
    .prepare(
      `
    INSERT INTO pipeline_revenue_attribution (token_address, chain, token_ticker, discovery_source, first_seen_at, current_stage)
    VALUES (?, ?, ?, ?, datetime('now'), 'discovered')
  `,
    )
    .run(tokenAddress, chain, ticker || null, source || "unknown");

  return result.lastInsertRowid;
}

function updateStage(tokenAddress, chain, newStage) {
  const db = getDB();
  const record = db
    .prepare(
      "SELECT * FROM pipeline_revenue_attribution WHERE token_address = ? AND chain = ?",
    )
    .get(tokenAddress, chain);

  if (!record) return null;

  const firstSeen = new Date(record.first_seen_at || record.created_at);
  const hours = (Date.now() - firstSeen.getTime()) / 3600000;
  const prob = STAGE_PROBABILITIES[newStage] || 0;

  db.prepare(
    `
    UPDATE pipeline_revenue_attribution
    SET current_stage = ?, stage_entered_at = datetime('now'), time_in_pipeline_hours = ?,
        conversion_probability = ?, updated_at = datetime('now')
    WHERE token_address = ? AND chain = ?
  `,
  ).run(newStage, Math.round(hours * 100) / 100, prob, tokenAddress, chain);

  return { stage: newStage, hours, probability: prob };
}

function recordAgentTouch(tokenAddress, chain, agentName) {
  const db = getDB();
  const record = db
    .prepare(
      "SELECT id, agent_touches, touch_count FROM pipeline_revenue_attribution WHERE token_address = ? AND chain = ?",
    )
    .get(tokenAddress, chain);

  if (!record) return null;

  const touches = JSON.parse(record.agent_touches || "[]");
  touches.push({ agent: agentName, at: new Date().toISOString() });

  db.prepare(
    `
    UPDATE pipeline_revenue_attribution
    SET agent_touches = ?, touch_count = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
  ).run(JSON.stringify(touches), record.touch_count + 1, record.id);

  return { touch_count: record.touch_count + 1 };
}

function calculateConversionProbability(tokenAddress, chain) {
  const db = getDB();
  const record = db
    .prepare(
      "SELECT current_stage, time_in_pipeline_hours, touch_count FROM pipeline_revenue_attribution WHERE token_address = ? AND chain = ?",
    )
    .get(tokenAddress, chain);

  if (!record) return null;

  let prob = STAGE_PROBABILITIES[record.current_stage] || 0;
  // Decay probability if stuck too long (>168 hours = 1 week per stage)
  if (record.time_in_pipeline_hours > 168) {
    prob *= Math.max(0.3, 1 - (record.time_in_pipeline_hours - 168) / 1000);
  }
  // Boost if many agent touches (engagement signal)
  if (record.touch_count > 5) {
    prob = Math.min(prob * 1.1, 1.0);
  }

  return {
    probability: Math.round(prob * 1000) / 1000,
    stage: record.current_stage,
  };
}

function getAttributionReport(filters = {}) {
  const db = getDB();

  const bySource = db
    .prepare(
      `
    SELECT discovery_source, COUNT(*) as total,
      SUM(CASE WHEN current_stage = 'listed' THEN 1 ELSE 0 END) as converted,
      AVG(time_in_pipeline_hours) as avg_hours,
      SUM(actual_revenue_usd) as total_revenue
    FROM pipeline_revenue_attribution
    GROUP BY discovery_source
  `,
    )
    .all();

  const byStage = db
    .prepare(
      `
    SELECT current_stage, COUNT(*) as count
    FROM pipeline_revenue_attribution
    GROUP BY current_stage
    ORDER BY CASE current_stage
      WHEN 'discovered' THEN 1 WHEN 'scanned' THEN 2 WHEN 'scored' THEN 3
      WHEN 'prospect' THEN 4 WHEN 'contacted' THEN 5 WHEN 'negotiating' THEN 6
      WHEN 'approved' THEN 7 WHEN 'listed' THEN 8 WHEN 'rejected' THEN 9 END
  `,
    )
    .all();

  const totals = db
    .prepare(
      `
    SELECT COUNT(*) as total, SUM(actual_revenue_usd) as total_revenue,
      AVG(conversion_probability) as avg_probability
    FROM pipeline_revenue_attribution
  `,
    )
    .get();

  return { by_source: bySource, by_stage: byStage, totals };
}

function getTopPerformingSources(limit = 5) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT discovery_source, SUM(actual_revenue_usd) as total_revenue,
      COUNT(*) as token_count,
      ROUND(AVG(conversion_probability) * 100, 1) as avg_conversion_pct
    FROM pipeline_revenue_attribution
    WHERE discovery_source IS NOT NULL
    GROUP BY discovery_source
    ORDER BY total_revenue DESC
    LIMIT ?
  `,
    )
    .all(limit);
}

module.exports = {
  trackAttribution,
  updateStage,
  recordAgentTouch,
  calculateConversionProbability,
  getAttributionReport,
  getTopPerformingSources,
};
