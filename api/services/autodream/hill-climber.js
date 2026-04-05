/**
 * Hill-Climbing Loop — AutoAgent Pattern for Scoring Rules
 * Extends autoDream from "cleanup only" to "cleanup + optimize"
 *
 * Each nightly run:
 * 1. Load current active rules as baseline
 * 2. Propose a scoring rule mutation
 * 3. Run benchmark against ground truth
 * 4. Compare results to baseline
 * 5. Keep or discard
 * 6. Log experiment
 * 7. Repeat until time budget (4 hours max, 5 iterations max)
 *
 * Feature-flagged: AUTODREAM_HILLCLIMB
 */

const { feature } = require('../../lib/feature-flags');
const { getDB } = require('../../db');
function db() { return getDB(); }

// Default scoring rules (v2_8rules + 3 new)
const DEFAULT_RULES = {
  FDV_GAP_PENALTY: { threshold: 5, penalty: -15 },
  STABLECOIN_EXCLUSION: { enabled: true },
  GHOST_TOKEN: { min_txns: 10, penalty: -20 },
  CONTRADICTORY_AUDIT: { penalty: -10 },
  SECURITY_PENALTY: { penalty: -10 },
  LIQUIDITY_CROSSREF: { min_liquidity: 10000, penalty: -25 },
  AGE_BONUS: { min_days: 30, bonus: 10 },
  VOLUME_THRESHOLD: { min_volume: 5000, penalty: -15 },
  GHOST_VOLUME: { min_volume: 5000, penalty: -15 },
  CTO_FLAG: { penalty: -15 },
  VOLUME_LIQUIDITY_RATIO: { min_ratio: 0.05, penalty: -5 },
  BLACKLIST_WALLET_MATCH: { penalty: -30 }
};

const MUTATION_TYPES = ['weight_adjust', 'threshold_shift'];

/**
 * Initialize hill-climber tables (idempotent)
 */
function initHillClimberTables() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS autodream_experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_date TEXT NOT NULL,
      experiment_name TEXT NOT NULL,
      rule_changes TEXT NOT NULL,
      baseline_score REAL,
      experiment_score REAL,
      baseline_passed INTEGER,
      experiment_passed INTEGER,
      verdict TEXT NOT NULL,
      reasoning TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scoring_ground_truth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      token_name TEXT,
      actual_outcome TEXT NOT NULL,
      outcome_date TEXT,
      source TEXT,
      buzz_score_at_time REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(contract_address, chain)
    );

    CREATE TABLE IF NOT EXISTS scoring_rule_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_tag TEXT NOT NULL,
      rules_config TEXT NOT NULL,
      performance_score REAL,
      is_active BOOLEAN DEFAULT 0,
      experiment_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (experiment_id) REFERENCES autodream_experiments(id)
    );
  `);
}

/**
 * Load current active rules
 */
function loadActiveRules() {
  const active = db().prepare(
    'SELECT * FROM scoring_rule_versions WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  ).get();

  if (active) {
    return { version: active.version_tag, rules: JSON.parse(active.rules_config) };
  }

  return { version: 'v2_8rules_default', rules: { ...DEFAULT_RULES } };
}

/**
 * Propose a random mutation to the current rules
 */
function proposeMutation(currentRules) {
  const rules = JSON.parse(JSON.stringify(currentRules.rules));
  const mutationType = MUTATION_TYPES[Math.floor(Math.random() * MUTATION_TYPES.length)];
  const ruleNames = Object.keys(rules).filter(r => r !== 'STABLECOIN_EXCLUSION');
  const targetRule = ruleNames[Math.floor(Math.random() * ruleNames.length)];
  const rule = rules[targetRule];

  let description = '';

  if (mutationType === 'weight_adjust' && rule.penalty !== undefined) {
    const delta = Math.floor(Math.random() * 11) - 5; // -5 to +5
    if (delta === 0) return proposeMutation(currentRules); // retry
    const oldPenalty = rule.penalty;
    rule.penalty = Math.max(-50, Math.min(0, rule.penalty + delta));
    description = `${targetRule}: penalty ${oldPenalty} → ${rule.penalty}`;
  } else if (mutationType === 'weight_adjust' && rule.bonus !== undefined) {
    const delta = Math.floor(Math.random() * 11) - 5;
    if (delta === 0) return proposeMutation(currentRules);
    const oldBonus = rule.bonus;
    rule.bonus = Math.max(0, Math.min(30, rule.bonus + delta));
    description = `${targetRule}: bonus ${oldBonus} → ${rule.bonus}`;
  } else if (mutationType === 'threshold_shift') {
    const thresholdKeys = Object.keys(rule).filter(k => k.startsWith('min_') || k.startsWith('max_') || k === 'threshold');
    if (thresholdKeys.length === 0) return proposeMutation(currentRules);
    const key = thresholdKeys[Math.floor(Math.random() * thresholdKeys.length)];
    const multiplier = 0.5 + Math.random() * 1.5; // 0.5x to 2.0x
    const oldVal = rule[key];
    rule[key] = Math.round(rule[key] * multiplier);
    if (rule[key] === oldVal) return proposeMutation(currentRules);
    description = `${targetRule}.${key}: ${oldVal} → ${rule[key]}`;
  } else {
    return proposeMutation(currentRules);
  }

  return {
    name: `${mutationType}_${targetRule}_${Date.now()}`,
    rules,
    diff: { type: mutationType, target: targetRule, description },
    description,
    reasoning: `Testing ${mutationType} on ${targetRule}`,
    isSimpler: false
  };
}

/**
 * Score a single token with given rules (simplified benchmark scorer)
 */
function scoreWithRules(contractAddress, chain, rules) {
  let score = 50; // base

  // Apply each rule (simplified — production uses full pipeline)
  if (rules.LIQUIDITY_CROSSREF && rules.LIQUIDITY_CROSSREF.penalty) {
    // Would check actual liquidity in production
    score += 0; // neutral without live data
  }
  if (rules.AGE_BONUS && rules.AGE_BONUS.bonus) {
    score += rules.AGE_BONUS.bonus / 2; // assume moderate age
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Run benchmark against ground truth
 */
function runBenchmark(rules) {
  const groundTruth = db().prepare('SELECT * FROM scoring_ground_truth').all();
  if (groundTruth.length === 0) {
    return { passed: 0, total: 0, accuracy: 0, message: 'No ground truth data' };
  }

  let passed = 0;
  for (const token of groundTruth) {
    const score = scoreWithRules(token.contract_address, token.chain, rules);
    const predicted = score >= 70 ? 'legitimate' : 'risky';
    const actual = ['legitimate', 'success'].includes(token.actual_outcome) ? 'legitimate' : 'risky';
    if (predicted === actual) passed++;
  }

  return {
    passed,
    total: groundTruth.length,
    accuracy: groundTruth.length > 0 ? passed / groundTruth.length : 0
  };
}

/**
 * Log an experiment result
 */
function logExperiment(exp) {
  return db().prepare(`
    INSERT INTO autodream_experiments
    (run_date, experiment_name, rule_changes, baseline_score, experiment_score,
     baseline_passed, experiment_passed, verdict, reasoning, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString().split('T')[0],
    exp.name, JSON.stringify(exp.ruleChanges),
    exp.baselineScore, exp.experimentScore,
    exp.baselinePassed, exp.experimentPassed,
    exp.verdict, exp.reasoning, exp.durationMs
  );
}

/**
 * Save a new rule version
 */
function saveRuleVersion(rules, benchmarkResult, experimentId) {
  // Deactivate all current versions
  db().prepare('UPDATE scoring_rule_versions SET is_active = 0').run();

  const count = db().prepare('SELECT COUNT(*) as c FROM scoring_rule_versions').get();
  const versionTag = `v3_auto_${String(count.c + 1).padStart(3, '0')}`;

  db().prepare(`
    INSERT INTO scoring_rule_versions
    (version_tag, rules_config, performance_score, is_active, experiment_id)
    VALUES (?, ?, ?, 1, ?)
  `).run(versionTag, JSON.stringify(rules), benchmarkResult.accuracy, experimentId || null);

  return versionTag;
}

/**
 * Main hill-climbing loop
 * @param {number} maxIterations - max experiments per run (default 5)
 * @param {number} maxDurationMs - time budget in ms (default 4 hours)
 */
async function hillClimbLoop(maxIterations = 5, maxDurationMs = 4 * 60 * 60 * 1000) {
  if (!feature('AUTODREAM_HILLCLIMB')) {
    return { skipped: true, reason: 'AUTODREAM_HILLCLIMB=false' };
  }

  const startTime = Date.now();
  let keepCount = 0;
  let discardCount = 0;
  let current = loadActiveRules();
  let currentBenchmark = runBenchmark(current.rules);

  if (currentBenchmark.total === 0) {
    return { skipped: true, reason: 'No ground truth data — seed scoring_ground_truth first' };
  }

  const results = [];

  for (let i = 0; i < maxIterations; i++) {
    if (Date.now() - startTime > maxDurationMs) break;

    const iterStart = Date.now();
    const mutation = proposeMutation(current);
    const experimentBenchmark = runBenchmark(mutation.rules);

    const verdict = experimentBenchmark.passed > currentBenchmark.passed ? 'keep'
      : experimentBenchmark.passed === currentBenchmark.passed && mutation.isSimpler ? 'keep'
      : 'discard';

    const expResult = logExperiment({
      name: mutation.name,
      ruleChanges: mutation.diff,
      baselineScore: currentBenchmark.accuracy,
      experimentScore: experimentBenchmark.accuracy,
      baselinePassed: currentBenchmark.passed,
      experimentPassed: experimentBenchmark.passed,
      verdict,
      reasoning: `${mutation.description} — ${verdict === 'keep' ? 'improved' : 'no improvement'}`,
      durationMs: Date.now() - iterStart
    });

    if (verdict === 'keep') {
      const newVersion = saveRuleVersion(mutation.rules, experimentBenchmark, expResult.lastInsertRowid);
      current = { version: newVersion, rules: mutation.rules };
      currentBenchmark = experimentBenchmark;
      keepCount++;
    } else {
      discardCount++;
    }

    results.push({
      iteration: i + 1,
      mutation: mutation.description,
      verdict,
      accuracy: experimentBenchmark.accuracy
    });
  }

  return {
    experiments_run: results.length,
    kept: keepCount,
    discarded: discardCount,
    active_version: current.version,
    best_accuracy: currentBenchmark.accuracy,
    duration_ms: Date.now() - startTime,
    results
  };
}

/**
 * Seed ground truth from pipeline history
 */
function seedGroundTruth() {
  let seeded = 0;

  // Dead tokens (score < 30, older than 14 days)
  try {
    const result = db().prepare(`
      INSERT OR IGNORE INTO scoring_ground_truth (contract_address, chain, token_name, actual_outcome, source, buzz_score_at_time)
      SELECT address, chain, name, 'dead', 'pipeline_dead', score
      FROM pipeline_tokens
      WHERE score IS NOT NULL AND score < 30 AND address IS NOT NULL AND address != 'unknown'
      AND updated_at < datetime('now', '-14 days')
    `).run();
    seeded += result.changes;
  } catch (e) { /* skip */ }

  // Legitimate tokens (score >= 70, older than 30 days, still has liquidity)
  try {
    const result = db().prepare(`
      INSERT OR IGNORE INTO scoring_ground_truth (contract_address, chain, token_name, actual_outcome, source, buzz_score_at_time)
      SELECT address, chain, name, 'legitimate', 'pipeline_stable', score
      FROM pipeline_tokens
      WHERE score IS NOT NULL AND score >= 70 AND address IS NOT NULL AND address != 'unknown'
      AND updated_at < datetime('now', '-30 days')
    `).run();
    seeded += result.changes;
  } catch (e) { /* skip */ }

  return seeded;
}

module.exports = {
  initHillClimberTables,
  loadActiveRules,
  proposeMutation,
  runBenchmark,
  hillClimbLoop,
  seedGroundTruth,
  saveRuleVersion,
  DEFAULT_RULES
};
