/**
 * Buzz Shield — Agent Security Intelligence Service
 * "Security before performance. Intelligence before execution."
 *
 * Phase 1: Program risk scoring + drain pattern matching + free endpoints
 */

const crypto = require('crypto');
const { feature } = require('../../lib/feature-flags');

/**
 * Score a Solana program's risk (0-100, 100 = safest)
 */
function scoreProgramRisk(db, programAddress, chain = 'solana') {
  if (!feature('SHIELD_PROGRAM_SCORER')) return null;

  // Check cache first
  const cached = db.prepare(
    'SELECT * FROM program_risk_cache WHERE program_address = ? AND chain = ?'
  ).get(programAddress, chain);

  if (cached && cached.last_checked) {
    const age = Date.now() - new Date(cached.last_checked).getTime();
    if (age < 3600000) { // 1 hour cache
      db.prepare('UPDATE program_risk_cache SET check_count = check_count + 1 WHERE id = ?').run(cached.id);
      return cached;
    }
  }

  // TODO Phase 2: Fetch program data from Helius/on-chain
  // For now, return cache or null
  return cached || null;
}

/**
 * Match transaction/program against known drain patterns
 */
function matchDrainPatterns(db, target) {
  if (!feature('SHIELD_PATTERN_MATCHER')) return [];

  const patterns = db.prepare(
    'SELECT * FROM drain_patterns WHERE active = 1'
  ).all();

  const matches = [];
  for (const pattern of patterns) {
    const addrs = pattern.program_addresses ? JSON.parse(pattern.program_addresses) : [];
    if (addrs.includes(target)) {
      matches.push({
        pattern_id: pattern.pattern_id,
        name: pattern.name,
        severity: pattern.severity,
        confidence: 1.0,
        description: pattern.description
      });
      db.prepare('UPDATE drain_patterns SET match_count = match_count + 1, last_seen = datetime(\'now\') WHERE id = ?').run(pattern.id);
    }
  }

  return matches;
}

/**
 * Generate Shield verdict from combined scores
 */
function generateVerdict(programScore, patternMatches, deployerTrust) {
  // Any critical pattern match = DANGER
  if (patternMatches.some(m => m.severity === 'critical')) return 'DANGER';
  if (patternMatches.some(m => m.severity === 'high')) return 'WARNING';

  if (programScore !== null) {
    if (programScore >= 80) return 'SAFE';
    if (programScore >= 60) return 'CAUTION';
    if (programScore >= 40) return 'WARNING';
    return 'DANGER';
  }

  return 'CAUTION'; // Unknown = caution
}

/**
 * Generate receipt hash for verification
 */
function generateReceipt(scanId, verdict, target, timestamp) {
  const data = `${scanId}:${verdict}:${target}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Record a scan in the database
 */
function recordScan(db, scan) {
  const receiptHash = generateReceipt(scan.scan_id, scan.verdict, scan.target, scan.created_at);

  db.prepare(`
    INSERT INTO shield_scans
    (scan_id, scan_type, requester, target, chain, verdict, program_score,
     instruction_flags, pattern_matches, deployer_trust, context_risk,
     explanation, receipt_hash, scan_duration_ms, paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scan.scan_id, scan.scan_type, scan.requester, scan.target,
    scan.chain || 'solana', scan.verdict, scan.program_score,
    JSON.stringify(scan.instruction_flags || []),
    JSON.stringify(scan.pattern_matches || []),
    scan.deployer_trust, scan.context_risk,
    scan.explanation, receiptHash, scan.scan_duration_ms,
    scan.paid ? 1 : 0
  );

  // Update daily stats
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO shield_stats (date, total_scans, free_scans, paid_scans,
      safe_count, caution_count, warning_count, danger_count, patterns_matched, unique_agents)
    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(date) DO UPDATE SET
      total_scans = total_scans + 1,
      free_scans = free_scans + excluded.free_scans,
      paid_scans = paid_scans + excluded.paid_scans,
      safe_count = safe_count + excluded.safe_count,
      caution_count = caution_count + excluded.caution_count,
      warning_count = warning_count + excluded.warning_count,
      danger_count = danger_count + excluded.danger_count,
      patterns_matched = patterns_matched + excluded.patterns_matched
  `).run(
    today,
    scan.paid ? 0 : 1, scan.paid ? 1 : 0,
    scan.verdict === 'SAFE' ? 1 : 0,
    scan.verdict === 'CAUTION' ? 1 : 0,
    scan.verdict === 'WARNING' ? 1 : 0,
    scan.verdict === 'DANGER' ? 1 : 0,
    (scan.pattern_matches || []).length
  );

  return receiptHash;
}

/**
 * Get aggregate shield stats
 */
function getShieldStats(db) {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(total_scans), 0) as total_scans,
      COALESCE(SUM(danger_count), 0) as dangers_blocked,
      COALESCE(SUM(patterns_matched), 0) as patterns_matched,
      COALESCE(SUM(unique_agents), 0) as agents_served
    FROM shield_stats
  `).get();

  const patternCount = db.prepare('SELECT COUNT(*) as count FROM drain_patterns WHERE active = 1').get();

  return {
    total_scans: totals.total_scans,
    dangers_blocked: totals.dangers_blocked,
    patterns_known: patternCount.count,
    agents_served: totals.agents_served,
    patterns_matched: totals.patterns_matched
  };
}

module.exports = {
  scoreProgramRisk,
  matchDrainPatterns,
  generateVerdict,
  generateReceipt,
  recordScan,
  getShieldStats
};
