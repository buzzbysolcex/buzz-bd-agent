# WAR ROOM DIRECTIVE — MIROFISH AUTODREAM EVOLUTION
# Phase 2: Hill-Climbing Loop + Telegram Intel + Overnight Autonomous Optimization
# Priority: HIGH | Ultrathink: YES | Subagents: YES for schema + regex + simulation code

---

## MISSION BRIEF

Wire three systems together into one autonomous overnight optimization loop:

1. **AutoAgent hill-climbing** — autoDream evolves scoring rules autonomously
2. **Telegram Channel Intel** — ZachXBT threat intelligence as negative signal
3. **Overnight autonomous run** — unattended 02:00 UTC optimization cycle

The goal: by the next morning, Buzz has tested N variations of scoring rules
against historical token data, kept only improvements, and integrated any new
threat intel from Telegram channels. Zero human intervention overnight.

---

## PART 1: TELEGRAM CHANNEL INTEL (Intel Source #33)

### Overview
Integrate public Telegram channels as threat intelligence feeds, starting with
ZachXBT's investigations channel (https://t.me/investigations).

### Critical Constraints
1. **READ-ONLY** — Buzz NEVER posts, reacts, or joins. Passive consumer only.
2. **Public channels only** — never scrape private/invite-only.
3. **Rate limit** — poll max once per 5 minutes (300s minimum).
4. **No content redistribution** — store extracted intel (wallets, project names,
   verdict) but NEVER store full message text. Our summary only, max 500 chars.
5. **Attribution** — any downstream use must cite source channel.
6. **Feature-flagged** — TELEGRAM_CHANNEL_INTEL = FALSE until Ogie approves.

### Method: Forward-to-Intake Pattern
Ogie will create a private "Buzz Intel Intake" channel and forward ZachXBT
messages to it. Buzz bot (@buzz_claude_code_bot) is admin of intake channel.
Buzz polls intake channel via getUpdates (already wired for War Room).

### New Tables (3 new → 84 total)

```sql
CREATE TABLE IF NOT EXISTS intel_telegram_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_handle TEXT UNIQUE NOT NULL,
  channel_name TEXT,
  intel_source_id INTEGER NOT NULL,
  intake_chat_id TEXT,
  poll_interval_seconds INTEGER DEFAULT 300,
  last_message_id INTEGER DEFAULT 0,
  last_polled_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intel_telegram_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  telegram_message_id INTEGER NOT NULL,
  message_date TEXT,
  entry_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  extracted_wallets TEXT,
  extracted_projects TEXT,
  extracted_chains TEXT,
  severity TEXT DEFAULT 'medium',
  scoring_applied BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(channel_id, telegram_message_id),
  FOREIGN KEY (channel_id) REFERENCES intel_telegram_channels(id)
);

CREATE TABLE IF NOT EXISTS intel_blacklist_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  chain TEXT,
  source_entry_id INTEGER NOT NULL,
  reason TEXT,
  flagged_at TEXT DEFAULT (datetime('now')),
  UNIQUE(wallet_address, chain),
  FOREIGN KEY (source_entry_id) REFERENCES intel_telegram_entries(id)
);
```

### New Module: api/services/intel/telegram-channel.js

```javascript
// Functions needed:
// pollIntakeChannel() — fetch new messages since last_message_id
// parseInvestigationMessage(message) — extract wallets, projects, verdict
//   Wallet regex: 0x[a-fA-F0-9]{40} (EVM), [1-9A-HJ-NP-Za-km-z]{32,44} (Solana),
//   (bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62} (BTC)
// applyToScoring(entry) — cross-ref wallets against pipeline tokens
// registerChannel(handle, intelSourceId) — add channel to registry
```

### New Scoring Rule #12: BLACKLIST_WALLET_MATCH
- Token deployer/owner/top-holder matches intel_blacklist_wallets → -30 points
- Auto-flag SCAM_ALERT in scoring_audit with source attribution
- Runs during scoring pipeline after DexScreener data pull

### Dynamic Cron
- Name: 'telegram-intel-poll'
- Interval: 300 seconds
- Feature flag gate: TELEGRAM_CHANNEL_INTEL
- On tick: poll active channels → parse → update blacklist

### Event Bus
- Emit: `intel.telegram.new` on new entry
- Emit: `intel.blacklist.match` when pipeline token matches blacklist
- Subscribe: scoring pipeline listens for `intel.blacklist.match`

### War Room Alert Format
```
🔴 INTEL ALERT — Source: @zachxbt
Type: [entry_type]
Summary: [our summary]
Wallets flagged: [count]
Pipeline impact: [X tokens affected / none]
```

---

## PART 2: HILL-CLIMBING LOOP (AutoAgent Pattern for Scoring Rules)

### Overview
Extend autoDream from "cleanup only" to "cleanup + optimize". Each nightly run:
1. Clean data (existing behavior — keep this)
2. Propose a scoring rule modification
3. Run MiroFish simulation as benchmark
4. Compare results to baseline
5. Keep or discard the change
6. Log the experiment
7. Repeat until time budget exhausted (max 4 hours: 02:00–06:00 UTC)

### New Tables (3 new → 87 total)

```sql
-- Experiment ledger (like AutoAgent's results.tsv)
CREATE TABLE IF NOT EXISTS autodream_experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_date TEXT NOT NULL,
  experiment_name TEXT NOT NULL,
  rule_changes TEXT NOT NULL,           -- JSON: what was modified
  baseline_score REAL,                  -- MiroFish belief convergence before
  experiment_score REAL,                -- MiroFish belief convergence after
  baseline_passed INTEGER,              -- tokens correctly classified before
  experiment_passed INTEGER,            -- tokens correctly classified after
  verdict TEXT NOT NULL,                -- 'keep' or 'discard'
  reasoning TEXT,                       -- why keep/discard
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Ground truth: known token outcomes for benchmarking
CREATE TABLE IF NOT EXISTS scoring_ground_truth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  token_name TEXT,
  actual_outcome TEXT NOT NULL,         -- 'rug_pull', 'scam', 'legitimate', 'dead', 'success'
  outcome_date TEXT,
  source TEXT,                          -- 'zachxbt', 'manual', 'dexscreener_delisted', etc.
  buzz_score_at_time REAL,             -- what Buzz scored it at the time
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(contract_address, chain)
);

-- Rule version history
CREATE TABLE IF NOT EXISTS scoring_rule_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_tag TEXT NOT NULL,            -- 'v2_8rules', 'v3_auto_001', etc.
  rules_config TEXT NOT NULL,           -- JSON: full rule configuration
  performance_score REAL,               -- benchmark accuracy
  is_active BOOLEAN DEFAULT 0,          -- currently active version
  experiment_id INTEGER,                -- link to autodream_experiments
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (experiment_id) REFERENCES autodream_experiments(id)
);
```

### The Hill-Climbing Engine: api/services/autodream/hill-climber.js

```javascript
// Core loop (runs inside autoDream after cleanup phase):

async function hillClimbLoop(maxIterations = 5, maxDurationMs = 4 * 60 * 60 * 1000) {
  const startTime = Date.now();
  
  // 1. Load current active rules as baseline
  const baseline = await loadActiveRules();
  const baselineScore = await runBenchmark(baseline);
  
  for (let i = 0; i < maxIterations; i++) {
    // Time budget check
    if (Date.now() - startTime > maxDurationMs) break;
    
    // 2. Propose a mutation
    //    Types: weight_adjust, threshold_shift, new_penalty, rule_combine
    const mutation = proposeMutation(baseline);
    
    // 3. Run MiroFish benchmark with mutated rules
    const experimentScore = await runBenchmark(mutation.rules);
    
    // 4. Keep/Discard decision
    const verdict = experimentScore.passed > baselineScore.passed ? 'keep' 
                  : experimentScore.passed === baselineScore.passed 
                    && mutation.isSimpler ? 'keep' 
                  : 'discard';
    
    // 5. Log experiment
    await logExperiment({
      name: mutation.name,
      ruleChanges: mutation.diff,
      baselineScore: baselineScore.convergence,
      experimentScore: experimentScore.convergence,
      baselinePassed: baselineScore.passed,
      experimentPassed: experimentScore.passed,
      verdict,
      reasoning: mutation.reasoning,
      durationMs: Date.now() - iterationStart,
    });
    
    // 6. If keep, update baseline for next iteration
    if (verdict === 'keep') {
      await saveRuleVersion(mutation.rules, experimentScore);
      baseline = mutation.rules;
      baselineScore = experimentScore;
      
      // War Room notification
      await sendWarRoom(`✅ AUTODREAM OPTIMIZATION — Experiment ${i+1}
Rule: ${mutation.name}
Change: ${mutation.description}
Improvement: ${baselineScore.passed} → ${experimentScore.passed} passed
Verdict: KEEP`);
    }
  }
  
  // Summary report
  await sendWarRoom(`📊 AUTODREAM OVERNIGHT SUMMARY
Experiments run: ${i}
Rules improved: ${keepCount}
Current version: ${activeVersion}
Best accuracy: ${bestScore}%
Duration: ${formatDuration(Date.now() - startTime)}`);
}
```

### Mutation Types (what the hill-climber can modify)

```javascript
const MUTATION_TYPES = {
  // Adjust existing rule weights (±1 to ±5 points)
  weight_adjust: {
    targets: ['FDV_GAP', 'GHOST_VOLUME', 'CTO_FLAG', 'VOLUME_LIQUIDITY_RATIO',
              'SECURITY_PENALTY', 'LIQUIDITY_CROSSREF', 'AGE_BONUS', 'VOLUME_THRESHOLD',
              'BLACKLIST_WALLET_MATCH'],
    range: [-5, +5],
  },
  
  // Shift thresholds (e.g., volume minimum from 10K to 15K)
  threshold_shift: {
    targets: ['min_volume', 'min_liquidity', 'fdv_gap_ratio', 'vol_liq_ratio_max'],
    range: [0.5, 2.0], // multiplier
  },
  
  // Combine two rules into compound rule
  rule_combine: {
    // e.g., GHOST_VOLUME + VOLUME_LIQUIDITY_RATIO → FAKE_MARKET_PENALTY
  },
  
  // Add new derived penalty from existing signals
  new_penalty: {
    // e.g., holder_concentration > 80% AND age < 7d → WHALE_DUMP_RISK
  },
};
```

### Benchmark Function: runBenchmark()

```javascript
async function runBenchmark(rules) {
  // 1. Load ground truth tokens (known outcomes)
  const groundTruth = await db.all('SELECT * FROM scoring_ground_truth');
  
  // 2. Score each token with the candidate rules
  let passed = 0;
  let total = groundTruth.length;
  
  for (const token of groundTruth) {
    const score = await scoreWithRules(token.contract_address, token.chain, rules);
    
    // Did the score correctly predict the outcome?
    const predicted = score >= 70 ? 'legitimate' : 'risky';
    const actual = ['legitimate', 'success'].includes(token.actual_outcome) 
                   ? 'legitimate' : 'risky';
    
    if (predicted === actual) passed++;
  }
  
  // 3. Run MiroFish 1K sim for belief convergence metric
  const simResult = await fetch('http://localhost:5000/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agents: 1000, rules }),
  }).then(r => r.json());
  
  return {
    passed,
    total,
    accuracy: passed / total,
    convergence: simResult.final_belief,
    institutional: simResult.institutional_belief,
  };
}
```

### Feature Flags (2 new → 33 total)
- `AUTODREAM_HILLCLIMB` = FALSE (flip when ground truth seeded)
- `TELEGRAM_CHANNEL_INTEL` = FALSE (flip when intake channel created)

---

## PART 3: OVERNIGHT AUTONOMOUS FLOW

### Timeline: 02:00–06:00 UTC (every night)

```
02:00 — autoDream wakes up (existing PULSE cron)
  │
  ├── Phase 1: CLEANUP (existing — keep unchanged)
  │   ├── Compress observation_log into daily summaries
  │   ├── Archive dead tokens + completed tasks
  │   ├── SQLite VACUUM
  │   └── dreamRanToday() dedup check
  │
  ├── Phase 2: INTEL SYNC (NEW)
  │   ├── Poll all active Telegram intel channels
  │   ├── Parse new messages → extract wallets, projects
  │   ├── Update intel_blacklist_wallets table
  │   ├── Cross-reference pipeline tokens against new blacklist entries
  │   ├── Emit intel.blacklist.match events if hits found
  │   └── War Room alert if high/critical severity entries
  │
  ├── Phase 3: HILL-CLIMBING OPTIMIZATION (NEW)
  │   ├── Load active scoring rules as baseline
  │   ├── Load ground truth from scoring_ground_truth table
  │   ├── Run benchmark with current rules
  │   ├── Loop (max 5 iterations, max 4 hours):
  │   │   ├── Propose mutation (weight_adjust, threshold_shift, etc.)
  │   │   ├── Run benchmark with mutated rules
  │   │   ├── Compare: if passed improved → KEEP, else → DISCARD
  │   │   ├── Log to autodream_experiments
  │   │   └── If KEEP: save new rule version, update baseline
  │   └── Generate overnight summary report
  │
  └── Phase 4: MORNING REPORT (NEW)
      └── War Room summary:
          ├── Intel: X new entries, Y wallets flagged, Z pipeline impacts
          ├── Optimization: N experiments, M kept, accuracy X% → Y%
          └── Active rule version: v3_auto_XXX

06:00 — ARIA daily scan (existing cron, unmodified)
```

---

## PART 4: GROUND TRUTH SEEDING

The hill-climber needs known outcomes to benchmark against. Seed from:

### Immediate Sources (can populate today)
1. **Pipeline tokens scored < 30 that got delisted** → actual_outcome = 'dead'
2. **Tokens flagged by ZachXBT** → actual_outcome = 'scam' or 'rug_pull'
3. **Tokens that survived 90+ days with stable liquidity** → actual_outcome = 'legitimate'
4. **Known rug pulls from DexScreener delisted data** → actual_outcome = 'rug_pull'

### Bootstrap Script
```sql
-- Seed from existing pipeline data
INSERT INTO scoring_ground_truth (contract_address, chain, token_name, actual_outcome, source, buzz_score_at_time)
SELECT contract_address, chain, name, 
  CASE 
    WHEN status = 'DEAD' OR liquidity_usd < 1000 THEN 'dead'
    WHEN age_days > 90 AND liquidity_usd > 50000 THEN 'legitimate'
    ELSE 'unknown'
  END,
  'pipeline_history',
  final_score
FROM token_scores 
WHERE final_score IS NOT NULL
AND contract_address IS NOT NULL;

-- Remove unknowns (only keep tokens with clear outcomes)
DELETE FROM scoring_ground_truth WHERE actual_outcome = 'unknown';
```

---

## IMPLEMENTATION ORDER

1. Create 6 new tables (84 + 6 = 87* total)
   - intel_telegram_channels, intel_telegram_entries, intel_blacklist_wallets
   - autodream_experiments, scoring_ground_truth, scoring_rule_versions
2. Create api/services/intel/telegram-channel.js
3. Create api/services/autodream/hill-climber.js
4. Add BLACKLIST_WALLET_MATCH as scoring rule #12
5. Add 2 feature flags: TELEGRAM_CHANNEL_INTEL, AUTODREAM_HILLCLIMB
6. Wire telegram-intel-poll dynamic cron (300s)
7. Extend autoDream nightly with Phase 2 (intel sync) and Phase 3 (hill-climb)
8. Wire event bus: intel.telegram.new, intel.blacklist.match
9. Create morning report formatter for War Room
10. Seed scoring_ground_truth from pipeline history
11. Test with manual message forward to intake channel
12. Test single hill-climb iteration manually

*Note: verify current table count before adding. Skills say 81, 
may have changed since last count. Use: 
SELECT COUNT(*) FROM sqlite_master WHERE type='table';

## DO NOT FLIP FLAGS
Report when scaffolded. Ogie will:
1. Create private Telegram intake channel
2. Add @buzz_claude_code_bot as admin
3. Forward first ZachXBT messages
4. Verify ground truth seed quality
5. Flip TELEGRAM_CHANNEL_INTEL = TRUE
6. Flip AUTODREAM_HILLCLIMB = TRUE
7. Monitor first overnight run

## SAFETY CHECKLIST
- [ ] Bot never posts to external channels
- [ ] No full message text stored (summary only)
- [ ] Attribution on every downstream use
- [ ] Feature flags OFF by default
- [ ] Rate limit enforced (300s minimum)
- [ ] Hill-climber has time budget (4 hour max)
- [ ] Hill-climber has iteration cap (5 max per night)
- [ ] Rule changes logged with full diff in autodream_experiments
- [ ] Active rules can be rolled back to any previous version
- [ ] Ground truth seeding reviewed before first optimization run
- [ ] dreamRanToday() prevents double-run (existing, verify still works)
- [ ] PULSE load-aware throttling still respected during optimization

## ULTRATHINK: YES (architecture + scoring + security)
## SUBAGENT: YES for schema design, wallet regex, simulation wiring, ground truth seeding
## SESSION NAME: feature-autodream-evolution

Bismillah. The kitchen learns to cook better overnight.
