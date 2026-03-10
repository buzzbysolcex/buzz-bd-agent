/**
 * Buzz BD Agent — Skill Reflection Engine
 * v7.3.1 | Learning Loop — Hermes-inspired
 *
 * Reviews pipeline patterns every 12h, auto-creates/patches
 * skills based on scoring, safety, outreach, tool failure,
 * and velocity patterns.
 *
 * Called by cron "skill-reflect" (every 12 hours)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createSkill, patchSkill, listSkills } = require('./tools/skill-create');

const MEMORY_DIR = '/data/workspace/memory';
const PIPELINE_DIR = path.join(MEMORY_DIR, 'pipeline');
const REFLECT_LOG = path.join(MEMORY_DIR, 'skill-reflect-log.json');

// Pattern thresholds
const MIN_SAMPLES = 3;
const SCORE_DRIFT_THRESHOLD = 15;   // avg score change to trigger skill
const SAFETY_FAIL_THRESHOLD = 3;    // consecutive safety fails
const OUTREACH_BOUNCE_THRESHOLD = 3; // bounced/ignored outreaches
const TOOL_FAIL_THRESHOLD = 5;      // tool errors in 24h window

/**
 * Main reflection entry point — called by cron every 12h
 * @param {object} db - better-sqlite3 database instance
 * @returns {object} reflection results
 */
function reflect(db) {
  const now = new Date().toISOString();
  const results = {
    timestamp: now,
    patterns_found: 0,
    skills_created: 0,
    skills_patched: 0,
    details: []
  };

  try {
    // Pattern 1: Scoring drift — tokens consistently scoring higher/lower than expected
    const scoringPattern = analyzeScoring(db);
    if (scoringPattern) {
      results.patterns_found++;
      const r = applyPattern('scoring-drift', scoringPattern);
      if (r) { results.details.push(r); r.action === 'created' ? results.skills_created++ : results.skills_patched++; }
    }

    // Pattern 2: Safety failures — repeated safety check failures for similar tokens
    const safetyPattern = analyzeSafety(db);
    if (safetyPattern) {
      results.patterns_found++;
      const r = applyPattern('safety-red-flags', safetyPattern);
      if (r) { results.details.push(r); r.action === 'created' ? results.skills_created++ : results.skills_patched++; }
    }

    // Pattern 3: Outreach effectiveness — which email templates get responses
    const outreachPattern = analyzeOutreach(db);
    if (outreachPattern) {
      results.patterns_found++;
      const r = applyPattern('outreach-patterns', outreachPattern);
      if (r) { results.details.push(r); r.action === 'created' ? results.skills_created++ : results.skills_patched++; }
    }

    // Pattern 4: Tool failures — recurring API/tool errors
    const toolPattern = analyzeToolFailures(db);
    if (toolPattern) {
      results.patterns_found++;
      const r = applyPattern('tool-failure-workarounds', toolPattern);
      if (r) { results.details.push(r); r.action === 'created' ? results.skills_created++ : results.skills_patched++; }
    }

    // Pattern 5: Pipeline velocity — how fast tokens move through stages
    const velocityPattern = analyzeVelocity(db);
    if (velocityPattern) {
      results.patterns_found++;
      const r = applyPattern('pipeline-velocity', velocityPattern);
      if (r) { results.details.push(r); r.action === 'created' ? results.skills_created++ : results.skills_patched++; }
    }

    // Save reflection log
    saveReflectLog(results);

  } catch (err) {
    results.error = err.message;
  }

  return results;
}

/**
 * Analyze scoring patterns from scoring_history
 */
function analyzeScoring(db) {
  try {
    const rows = db.prepare(`
      SELECT sh.token_id, sh.score, sh.factors, sh.timestamp,
             pt.chain, pt.ticker
      FROM scoring_history sh
      LEFT JOIN pipeline_tokens pt ON sh.token_id = pt.id
      WHERE sh.timestamp > datetime('now', '-24 hours')
      ORDER BY sh.timestamp DESC
      LIMIT 50
    `).all();

    if (rows.length < MIN_SAMPLES) return null;

    const avgScore = rows.reduce((s, r) => s + (r.score || 0), 0) / rows.length;
    const byChain = {};
    for (const r of rows) {
      const chain = r.chain || 'unknown';
      if (!byChain[chain]) byChain[chain] = [];
      byChain[chain].push(r.score || 0);
    }

    const chainAvgs = {};
    let driftDetected = false;
    for (const [chain, scores] of Object.entries(byChain)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      chainAvgs[chain] = Math.round(avg * 10) / 10;
      if (Math.abs(avg - 50) > SCORE_DRIFT_THRESHOLD) driftDetected = true;
    }

    if (!driftDetected) return null;

    return {
      observation: `Scoring drift detected across ${rows.length} tokens in 24h`,
      avg_score: Math.round(avgScore * 10) / 10,
      by_chain: chainAvgs,
      sample_size: rows.length
    };
  } catch (e) { return null; }
}

/**
 * Analyze safety check failures
 */
function analyzeSafety(db) {
  try {
    const rows = db.prepare(`
      SELECT address, chain, ticker, safety_status, updated_at
      FROM pipeline_tokens
      WHERE safety_status IN ('fail', 'flagged', 'honeypot', 'rug_risk')
      AND updated_at > datetime('now', '-48 hours')
      ORDER BY updated_at DESC
      LIMIT 20
    `).all();

    if (rows.length < SAFETY_FAIL_THRESHOLD) return null;

    const byReason = {};
    for (const r of rows) {
      const reason = r.safety_status || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    }

    return {
      observation: `${rows.length} safety failures in 48h`,
      by_reason: byReason,
      chains_affected: [...new Set(rows.map(r => r.chain))],
      sample_size: rows.length
    };
  } catch (e) { return null; }
}

/**
 * Analyze outreach effectiveness from receipts
 */
function analyzeOutreach(db) {
  try {
    const rows = db.prepare(`
      SELECT data, created_at
      FROM receipts
      WHERE type IN ('outreach', 'email_sent', 'gmail_outreach')
      AND created_at > datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 30
    `).all();

    if (rows.length < OUTREACH_BOUNCE_THRESHOLD) return null;

    let bounced = 0, replied = 0, sent = 0;
    for (const r of rows) {
      try {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        sent++;
        if (data.status === 'bounced' || data.status === 'failed') bounced++;
        if (data.status === 'replied' || data.reply_received) replied++;
      } catch (e) { sent++; }
    }

    if (bounced < OUTREACH_BOUNCE_THRESHOLD && sent < 5) return null;

    return {
      observation: `Outreach analysis: ${sent} sent, ${replied} replied, ${bounced} bounced (7d)`,
      sent, replied, bounced,
      reply_rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0
    };
  } catch (e) { return null; }
}

/**
 * Analyze recurring tool/API failures
 */
function analyzeToolFailures(db) {
  try {
    const rows = db.prepare(`
      SELECT data, created_at
      FROM receipts
      WHERE type IN ('error', 'tool_error', 'api_error')
      AND created_at > datetime('now', '-24 hours')
      ORDER BY created_at DESC
      LIMIT 30
    `).all();

    if (rows.length < TOOL_FAIL_THRESHOLD) return null;

    const byTool = {};
    for (const r of rows) {
      try {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        const tool = data.tool || data.source || 'unknown';
        if (!byTool[tool]) byTool[tool] = { count: 0, errors: [] };
        byTool[tool].count++;
        if (data.error && byTool[tool].errors.length < 3) {
          byTool[tool].errors.push(data.error.substring(0, 100));
        }
      } catch (e) {}
    }

    return {
      observation: `${rows.length} tool failures in 24h`,
      by_tool: byTool,
      total_errors: rows.length
    };
  } catch (e) { return null; }
}

/**
 * Analyze pipeline velocity — how fast tokens progress through stages
 */
function analyzeVelocity(db) {
  try {
    const rows = db.prepare(`
      SELECT stage, COUNT(*) as count,
             AVG(julianday(updated_at) - julianday(created_at)) as avg_days
      FROM pipeline_tokens
      WHERE created_at > datetime('now', '-14 days')
      GROUP BY stage
    `).all();

    if (rows.length < 2) return null;

    const stageStats = {};
    let totalTokens = 0;
    for (const r of rows) {
      stageStats[r.stage] = { count: r.count, avg_days: Math.round((r.avg_days || 0) * 10) / 10 };
      totalTokens += r.count;
    }

    const bottleneck = rows.reduce((max, r) => r.count > (max?.count || 0) ? r : max, null);

    return {
      observation: `Pipeline velocity: ${totalTokens} tokens across ${rows.length} stages (14d)`,
      stages: stageStats,
      bottleneck: bottleneck ? { stage: bottleneck.stage, count: bottleneck.count } : null,
      total_tokens: totalTokens
    };
  } catch (e) { return null; }
}

/**
 * Apply a detected pattern — create or patch a skill
 */
function applyPattern(skillName, pattern) {
  const existing = listSkills().find(s => s.name === skillName);
  const content = `## Pattern Detected\n\n${pattern.observation}\n\n### Data\n\n\`\`\`json\n${JSON.stringify(pattern, null, 2)}\n\`\`\`\n\n### Recommended Actions\n\n- Review the pattern data above\n- Adjust scoring weights or thresholds if scoring drift\n- Update safety filters if repeated failures\n- Modify outreach templates if low reply rates\n- Add retry logic or fallbacks for tool failures\n- Investigate bottlenecks if pipeline velocity is slow\n`;

  if (existing) {
    // Patch existing skill with new observation
    const patchContent = `\n\n## Update — ${new Date().toISOString().split('T')[0]}\n\n${pattern.observation}\n\n\`\`\`json\n${JSON.stringify(pattern, null, 2)}\n\`\`\`\n`;
    const result = patchSkill({
      name: skillName,
      oldString: '---\n*Learned skill',
      newString: `${patchContent}\n---\n*Learned skill`,
      reason: `reflection-update: ${pattern.observation.substring(0, 80)}`
    });
    return result.success ? { skill: skillName, action: 'patched', pattern: pattern.observation } : null;
  } else {
    // Create new skill
    const result = createSkill({
      name: skillName,
      description: pattern.observation.substring(0, 120),
      content,
      category: 'reflection',
      session: 'skill-reflect-cron'
    });
    return result.success ? { skill: skillName, action: 'created', pattern: pattern.observation } : null;
  }
}

/**
 * Get last reflection results
 */
function getReflectStatus() {
  try {
    if (fs.existsSync(REFLECT_LOG)) {
      const log = JSON.parse(fs.readFileSync(REFLECT_LOG, 'utf8'));
      return { success: true, last_run: log[log.length - 1] || null, total_runs: log.length };
    }
  } catch (e) {}
  return { success: true, last_run: null, total_runs: 0 };
}

/**
 * Save reflection results to log
 */
function saveReflectLog(results) {
  let log = [];
  try {
    if (fs.existsSync(REFLECT_LOG)) {
      log = JSON.parse(fs.readFileSync(REFLECT_LOG, 'utf8'));
    }
  } catch (e) {}
  log.push(results);
  // Keep last 100 entries
  if (log.length > 100) log = log.slice(-100);
  const dir = path.dirname(REFLECT_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REFLECT_LOG, JSON.stringify(log, null, 2), 'utf8');
}

module.exports = { reflect, getReflectStatus };
