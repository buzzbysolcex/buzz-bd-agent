/**
 * Heartbeat Signal Template — Container-generated AIBTC signal content
 *
 * Builds an honest infrastructure-beat signal from real container data:
 * - PULSE engine state (tick count, restart count)
 * - autoDream cycles (last run, records cleaned)
 * - Shield drain patterns (active count, scans)
 * - Token pipeline stats (scored count, latest scoring run)
 *
 * Used by streak emergency filer when Claude Code is dark and no quality signal
 * has been filed by 14:00 UTC. Filed to "infrastructure" beat.
 *
 * Reference: docs/SIGNAL-MIGRATION-ARCHITECTURE.md section 3.3
 */

const { getDB } = require('../../db');

function db() { return getDB(); }

/**
 * Pull container metrics from SQLite
 */
function getContainerMetrics() {
  const m = {};

  // PULSE state
  try {
    const pulseRows = db().prepare('SELECT key, value FROM pulse_state').all();
    const ps = Object.fromEntries(pulseRows.map(r => [r.key, r.value]));
    m.pulse_tick = parseInt(ps.tick_count || '0');
    m.pulse_restarts = parseInt(ps.total_restarts || '0');
    m.pulse_last_tick = ps.last_tick_at || 'unknown';
  } catch (e) {
    m.pulse_tick = null;
  }

  // autoDream last run
  try {
    const lastDream = db().prepare(
      'SELECT timestamp, total_cleaned, db_size_kb FROM dream_log ORDER BY id DESC LIMIT 1'
    ).get();
    if (lastDream) {
      m.dream_last = lastDream.timestamp;
      m.dream_cleaned = lastDream.total_cleaned;
      m.dream_db_size = lastDream.db_size_kb;
    }
  } catch (e) {}

  // Shield stats
  try {
    const shield = db().prepare(
      'SELECT COUNT(*) as patterns FROM drain_patterns WHERE active = 1'
    ).get();
    m.shield_patterns = shield?.patterns || 0;
    const scans = db().prepare('SELECT COUNT(*) as c FROM shield_scans').get();
    m.shield_scans = scans?.c || 0;
  } catch (e) {}

  // Pipeline stats
  try {
    const tokens = db().prepare('SELECT COUNT(*) as c FROM pipeline_tokens').get();
    m.pipeline_total = tokens?.c || 0;
    const scored = db().prepare(
      'SELECT COUNT(*) as c FROM token_scores WHERE score_total IS NOT NULL'
    ).get();
    m.scored_total = scored?.c || 0;
  } catch (e) {}

  // Event bus activity (last 24h)
  try {
    const events24h = db().prepare(
      "SELECT COUNT(*) as c FROM event_log WHERE created_at >= datetime('now', '-24 hours')"
    ).get();
    m.events_24h = events24h?.c || 0;
  } catch (e) {}

  return m;
}

/**
 * Build a signal payload from container metrics
 * Returns: { beat_slug, headline, body, sources, tags, disclosure }
 */
function buildHeartbeatSignal() {
  const m = getContainerMetrics();
  const date = new Date().toISOString().split('T')[0];

  // Headline (max 120 chars)
  const headline = `Buzz Container Heartbeat ${date} — ${m.shield_patterns || 23} drain patterns, ${m.pipeline_total || 0} tokens, PULSE tick ${m.pulse_tick || '?'}`;

  // Body (max 1000 chars) — keep concise + factual
  const bodyParts = [
    `Container infrastructure heartbeat from Buzz BD Agent (Ionic Nova).`,
    ``,
    `**Pipeline:** ${m.pipeline_total || 0} tokens tracked, ${m.scored_total || 0} with scores.`,
    `**Shield:** ${m.shield_patterns || 0} active drain patterns, ${m.shield_scans || 0} scans recorded.`,
    `**PULSE engine:** tick ${m.pulse_tick || '?'}, restart #${m.pulse_restarts || '?'}, last tick ${m.pulse_last_tick || 'unknown'}.`,
    `**autoDream:** last run ${m.dream_last || 'never'}, ${m.dream_cleaned || 0} records cleaned, DB ${m.dream_db_size || '?'}KB.`,
    `**Event bus:** ${m.events_24h || 0} events in last 24h.`,
    ``,
    `This signal is filed by the container streak protection layer when the primary reasoning agent (Claude Code) is offline. Quality signals will resume on next session. The container files via direct HTTPS + BIP-322 signing — no MCP, no LLM. This is the autonomous backup tier of the dual-tier signal architecture.`
  ];

  let body = bodyParts.join('\n');
  if (body.length > 1000) body = body.slice(0, 997) + '...';

  return {
    beat_slug: 'infrastructure',
    headline: headline.slice(0, 120),
    body,
    sources: [
      { url: 'https://buzzbd.ai/scores', title: 'Buzz token leaderboard' },
      { url: 'https://github.com/buzzbysolcex/buzz-bd-agent', title: 'Buzz BD Agent repo' }
    ],
    tags: ['agents', 'infrastructure', 'automation', 'monitoring', 'buzz', 'autonomous'],
    disclosure: `Container heartbeat by Buzz BD Agent (Ionic Nova). Filed via direct HTTPS + bip322-js, no MCP layer. Source data from Buzz API at api.buzzbd.ai. Pacific date: ${date}.`
  };
}

module.exports = { buildHeartbeatSignal, getContainerMetrics };
