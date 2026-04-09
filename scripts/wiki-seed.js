#!/usr/bin/env node
/**
 * Wiki Seed Script — Karpathy Wiki Integration
 *
 * One-time bootstrap of /data/buzz/persistent/wiki/ with:
 *   - 20 entity pages from top pipeline_tokens
 *   - 12 concept pages (scoring rules)
 *   - 5 synthesis pages
 *   - 7 partnership entity pages
 *   - INDEX.md + LOG.md
 *
 * Usage:
 *   WIKI_ROOT=/data/buzz/persistent/wiki \
 *   DB=/data/buzz/persistent/buzz-api/buzz.db \
 *   node scripts/wiki-seed.js
 *
 * Safe to re-run: overwrites pages with identical schema, keeps Changelog.
 */

const path = require("path");
// Use the api/ copy of better-sqlite3 (the same build the Buzz container uses)
const Database = require(
  path.resolve(__dirname, "../api/node_modules/better-sqlite3"),
);

process.env.WIKI_ROOT = process.env.WIKI_ROOT || "/data/buzz/persistent/wiki";
const DB_PATH = process.env.DB || "/data/buzz/persistent/buzz-api/buzz.db";

// Stub the feature-flags require path so wiki-manager loads in script context
// without the full Buzz app
const wiki = require(
  path.resolve(__dirname, "../api/services/wiki/wiki-manager"),
);

const TODAY = new Date().toISOString().split("T")[0];

function log(msg) {
  process.stdout.write(`[wiki-seed] ${msg}\n`);
}

// ─────────────────────────────────────────────────────────────
// Phase 1: Entity pages from top 20 pipeline_tokens
// ─────────────────────────────────────────────────────────────
function seedEntities() {
  log("Phase 1 — top 20 entities from pipeline_tokens");
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db
    .prepare(
      `SELECT address, chain, ticker, name, score, stage,
              substr(notes,1,400) AS notes,
              substr(created_at,1,10) AS created
       FROM pipeline_tokens
       WHERE score IS NOT NULL
       ORDER BY score DESC, updated_at DESC
       LIMIT 20`,
    )
    .all();
  db.close();

  let written = 0;
  for (const t of rows) {
    const slug = wiki.slugify(t.ticker || t.address.slice(0, 8));
    if (!slug) continue;
    const verdict =
      t.score >= 85
        ? "HOT"
        : t.score >= 70
          ? "WARM"
          : t.score >= 40
            ? "WATCH"
            : "COLD";

    // Extract penalty/calibration tokens from notes
    const calibrationMatches =
      (t.notes || "").match(/calibrated: \d+->\d+ \[[^\]]+\]/g) || [];
    const lastCalibration =
      calibrationMatches[calibrationMatches.length - 1] || null;

    const content = `**Chain**: ${t.chain}
**Address**: \`${t.address}\`
**Current Buzz Score**: ${t.score} (${verdict})
**Stage**: ${t.stage}
**First Seen**: ${t.created}

### Scoring History
${lastCalibration ? `- Most recent calibration: \`${lastCalibration}\`` : "- No calibration history recorded."}
${calibrationMatches.length > 1 ? `- Total recalibrations observed: ${calibrationMatches.length}` : ""}

### Buzz Pipeline Notes
${t.notes ? "```\n" + t.notes.replace(/```/g, "~~~") + "\n```" : "_No notes._"}

### Wiki Cross-References
This token is analyzed through [[scoring-pipeline-v2]] using rules like
[[fdv-gap-penalty]], [[ghost-volume-detection]], and [[liquidity-crossref]].
It belongs to the broader [[${t.chain}]] ecosystem tracked by Buzz.`;

    wiki.createEntityPage({
      ticker: t.ticker || slug,
      slug,
      chain: t.chain,
      score: t.score,
      title: `${t.ticker || slug} — ${t.name || "untitled"}`,
      summary: `${t.ticker || slug} on ${t.chain}. Buzz score ${t.score} (${verdict}). ${t.stage} stage.`,
      content,
      related: [
        { name: "scoring-pipeline-v2", why: "how this score was computed" },
        { name: t.chain, why: "chain ecosystem" },
      ],
      changelog: [`${TODAY}: Seeded from pipeline_tokens (score ${t.score})`],
      tags: ["token", `chain-${t.chain}`, `score-${verdict.toLowerCase()}`],
    });
    written++;
  }
  log(`  wrote ${written} entity pages`);
  return written;
}

// ─────────────────────────────────────────────────────────────
// Phase 2: 12 concept pages (scoring rules)
// ─────────────────────────────────────────────────────────────
const CONCEPTS = [
  {
    slug: "fdv-gap-penalty",
    title: "FDV Gap Penalty",
    tags: ["scoring-rule", "security", "market-structure"],
    summary:
      "Penalizes tokens where FDV is much larger than circulating market cap, signaling unlock cliffs that will dilute holders.",
    content: `### What it detects
The gap between fully diluted valuation (FDV) and circulating market cap, expressed as
\`1 - (circ_mcap / fdv)\`. Large gaps mean most supply hasn't unlocked — future emissions
will dilute current holders.

### Thresholds (as of Apr 2026)
- <30% gap → no penalty
- 30-50% → -5
- 50-75% → -10
- >75% → -15 (RED FLAG)
- >90% → -20 + MANUAL REVIEW HOLD

### Why it exists
Multiple BD prospects (TRUMP, several bsc meme forks) passed all other scoring rules
but had 70-90% FDV gaps. Listing them would have meant listing at the top of their
circulating curve with massive unlocks waiting. The penalty was added after the
Phase 2 BD Screening Workflow caught TRUMP at 77% gap and flagged it as TOO BIG.

### Source priority for circulating supply
1. DexTools Tier 1 (live on-chain circ)
2. DexScreener Tier 2
3. CoinMarketCap / CoinGecko Tier 3

### Related
- [[scoring-pipeline-v2]] — where this rule lives
- [[bd-screening-workflow]] — where TRUMP was caught
`,
    related: [
      { name: "scoring-pipeline-v2", why: "parent scoring engine" },
      { name: "security-penalty", why: "sibling risk rule" },
    ],
  },
  {
    slug: "ghost-volume-detection",
    title: "Ghost Volume Detection",
    tags: ["scoring-rule", "wash-trading", "security"],
    summary:
      "Rejects tokens whose reported volume isn't backed by real transaction counts — a wash-trading fingerprint.",
    content: `### What it detects
Tokens reporting large 24h volume with suspiciously few transactions, or with
\`volume / liquidity\` ratios incompatible with organic flow. The canonical signature
is >$1M reported 24h volume but <50 on-chain transactions — which is only possible if
a single address is repeatedly wash-trading.

### Triggers
- Tx count < 50 and reported volume > $1M → AUTO-EXCLUDE
- Volume/liquidity ratio > 100 → investigate
- DEX-pair-count = 0 → PHANTOM token, reject (see [[phantom-token-exclusion]])

### Why it exists
Three tokens in March 2026 had >$1M reported 24h volume but 0 real transactions when
we cross-checked Solscan. All were wash-trading loops designed to trigger trending
listings. Penalty is -25 flat; paired with [[phantom-token-exclusion]] for complete
catch.

### Related
- [[phantom-token-exclusion]] — the full PIPPIN prevention pipeline
- [[volume-liquidity-ratio]] — sibling market-structure rule
`,
    related: [
      { name: "phantom-token-exclusion", why: "PIPPIN lesson twin rule" },
      { name: "volume-liquidity-ratio", why: "sibling" },
    ],
  },
  {
    slug: "cto-flag-analysis",
    title: "CTO Flag Analysis",
    tags: ["scoring-rule", "governance", "security"],
    summary:
      "Flags tokens under Community Takeover — an abandoned-team signal that doubles as a rug catalyst or a revival opportunity depending on state.",
    content: `### What it detects
Tokens whose original dev has rage-quit or walked away and where holders now run
socials and liquidity (Community Takeover = CTO). DexScreener, DexTools and Twitter
bios often carry a "CTO" badge.

### Scoring treatment
- CTO status known → investigate before penalizing
- If CTO happened AFTER rug attempt → -20 and drop to WATCH
- If CTO is community-led with clean on-chain handoff → no penalty, note in wiki
- Always cross-ref with [[blacklist-wallet-match]] for original deployer

### Why it exists
CTO is ambiguous — some are legitimate revivals (community buying out abandoned
meme), others are post-rug distractions. The rule triggers a hold rather than a
blanket penalty.

### Related
- [[rug-pull-patterns]]
- [[scoring-pipeline-v2]]
`,
    related: [{ name: "rug-pull-patterns", why: "CTO often follows a rug" }],
  },
  {
    slug: "volume-liquidity-ratio",
    title: "Volume / Liquidity Ratio",
    tags: ["scoring-rule", "market-structure"],
    summary:
      "Measures how much 24h volume moves through each dollar of pool liquidity — high ratios indicate wash trading or dangerous imbalance.",
    content: `### What it detects
The ratio \`volume_24h / liquidity_usd\`. Healthy tokens cycle 0.2x - 5x their pool in
a day. Ratios >20x are statistically incompatible with organic trading and almost
always indicate bot loops or wash farms.

### Penalties
- <5x → healthy, no penalty
- 5-20x → -5 watch
- 20-100x → -15 flag
- >100x → -25 + add to [[ghost-volume-detection]] candidate list

### Example catches
\`Max\` (Giga Maxxing) — v/l ratio 0.046 triggered a \`dead_util_-5\` calibration drop
from 95 to 10 after pump.fun penalty and mcap floor also hit. See entity page
[[Max]] for the full recalibration trace.

### Related
- [[ghost-volume-detection]]
- [[liquidity-crossref]]
`,
    related: [
      { name: "ghost-volume-detection", why: "sibling wash-trading rule" },
      { name: "liquidity-crossref", why: "paired validation" },
    ],
  },
  {
    slug: "security-penalty",
    title: "Security Penalty",
    tags: ["scoring-rule", "security"],
    summary:
      "Composite penalty from multiple audit sources — Token Sniffer, Go+, DEXTscore, honeypot checks. Uses the LOWER value on contradictions.",
    content: `### What it detects
Consolidated safety score across external audit sources:
- Token Sniffer: ≥70 pass, 30-69 caution, <30 fail
- Go+: 0 issues pass, 1-2 caution, 3+ fail
- DEXTscore: ≥70 pass, 50-69 caution, <50 fail
- Honeypot: any yes → AUTO-EXCLUDE
- Sell tax: 0% pass, 0.1-2% caution, >2% exclude

### Contradiction resolution
When sources disagree (classic: Token Sniffer 0/100 but DEXTscore 99), we use the
LOWER (more cautious) score and flag for manual investigation. See
[[contradictory-audit-hold]] for the full policy.

### Why it exists
VELO case: Token Sniffer returned 0/100 while DEXTscore showed 99. Neither was
wrong — different methodologies — but the divergence was the signal. Rule catches
such contradictions and routes to human review rather than auto-listing.

### Related
- [[contradictory-audit-hold]]
- [[scoring-pipeline-v2]]
`,
    related: [{ name: "contradictory-audit-hold", why: "escalation policy" }],
  },
  {
    slug: "liquidity-crossref",
    title: "Liquidity Cross-Reference",
    tags: ["scoring-rule", "market-structure"],
    summary:
      "Validates reported liquidity against multiple sources (DexScreener, DexTools, CMC) to catch staged pools and migrator scams.",
    content: `### What it detects
Discrepancies between DexScreener liquidity, DexTools liquidity, and CoinMarketCap
liquidity. Legitimate tokens agree across sources within 5%. Scams stage liquidity
on the biggest DEX while quietly draining alternate pools.

### Rule
- <5% divergence → pass
- 5-20% → caution
- >20% → penalty -15 + flag for [[phantom-token-exclusion]] check
- Zero liquidity on any "primary" DEX → EXCLUDE

### Related
- [[volume-liquidity-ratio]]
- [[phantom-token-exclusion]]
`,
    related: [{ name: "phantom-token-exclusion", why: "adjacent exclusion" }],
  },
  {
    slug: "age-bonus",
    title: "Age Bonus",
    tags: ["scoring-rule", "time"],
    summary:
      "Small bonus for tokens that have survived past common rug windows (30d, 90d, 180d).",
    content: `### What it rewards
Tokens that have existed and maintained liquidity past known rug windows:
- >30d → +2
- >90d → +5
- >180d → +8
- >365d → +12 (max)

Age is computed from first on-chain DEX pair creation, NOT token deploy, because
many projects pre-deploy and later launch. Bonus does not override fundamental
penalties — a 200-day-old rug is still a rug.

### Why it exists
Survivorship bias is real but useful at the filter stage. Tokens that lived past
the 90d window have a dramatically lower catastrophic-failure rate in our
pipeline, so we weight the signal.

### Related
- [[scoring-pipeline-v2]]
`,
    related: [],
  },
  {
    slug: "volume-threshold",
    title: "Volume Threshold",
    tags: ["scoring-rule", "market-structure"],
    summary:
      "Hard floor on 24h volume — tokens below a minimum volume are ineligible for HOT classification.",
    content: `### Rule
- Volume <$100 24h → AUTO-EXCLUDE (ghost token)
- Volume <$10K 24h → cannot reach HOT regardless of other scores
- Volume $10K-$100K → eligible but watch
- Volume >$100K → eligible for HOT

Paired with [[ghost-volume-detection]] and [[volume-liquidity-ratio]] to filter
both absolute and relative volume sickness.

### Related
- [[ghost-volume-detection]]
- [[volume-liquidity-ratio]]
`,
    related: [],
  },
  {
    slug: "stablecoin-exclusion",
    title: "Stablecoin Exclusion",
    tags: ["scoring-rule", "category"],
    summary:
      "Known stablecoins are auto-excluded from pipeline scoring — they are not BD listing candidates.",
    content: `### What it excludes
USDC, USDT, DAI, BUSD, EURC, FDUSD, and any token whose symbol, name, or on-chain
metadata identifies it as a stablecoin. These are infrastructure, not listings.

### Why it exists
EURC crept into the pipeline at score 90 during a sweep. It's Circle's euro
stablecoin — scoring it as a BD prospect made no sense. Rule added April 2026.

### Related
- [[scoring-pipeline-v2]]
`,
    related: [],
  },
  {
    slug: "contradictory-audit-hold",
    title: "Contradictory Audit Hold",
    tags: ["scoring-rule", "security", "policy"],
    summary:
      "Policy: when two audit sources disagree materially, we hold for manual investigation rather than auto-score either way.",
    content: `### Trigger
Any case where two of Token Sniffer, Go+, Quick Intel, DEXTscore return contradictory
assessments (e.g., one says CRITICAL risk, another says clean).

### Action
1. Score uses the LOWER (more cautious) value
2. Token is flagged \`audit_conflict\` in pipeline notes
3. BD Rule #25 (autonomous BD sequence) refuses to proceed to Phase 5 outreach
4. War Room notified: "AUDIT CONFLICT on <TOKEN> — <details>"

### Example
VELO: Token Sniffer 0/100, DEXTscore 99. Flagged at Phase 2, investigation revealed
Token Sniffer was testing the wrong contract. Score was manually corrected.

### Related
- [[security-penalty]]
- [[bd-screening-workflow]]
`,
    related: [{ name: "security-penalty", why: "parent rule" }],
  },
  {
    slug: "phantom-token-exclusion",
    title: "Phantom Token Exclusion",
    tags: ["scoring-rule", "security", "pippin-lesson"],
    summary:
      "Tokens with zero DexScreener pair count are immediately rejected as phantom — the PIPPIN lesson.",
    content: `### What it catches
Tokens that report a valid contract address and fake volume numbers but have ZERO
DexScreener or DexTools trading pairs. No pair = no real market = phantom token.

### Rule
\`GET /latest/dex/tokens/{address}\` must return \`pairs.length > 0\`.
If pipeline notes contain any of: \`phantom\`, \`REJECTED\`, \`not_confirmed_from_dexscreener\`,
\`no DEX pair\` → skip.

### The PIPPIN case
PIPPIN token scored 85 via external social signals but had 0 DexScreener pairs. BD
Rule #25 Phase 0 (phantom check) caught it before Phase 1 verification burned any
effort. Lesson: the phantom check runs FIRST, not last.

### Related
- [[rule-25-autonomous-bd]] — where phantom check lives as Phase 0
- [[ghost-volume-detection]]
`,
    related: [
      {
        name: "rule-25-autonomous-bd",
        why: "Phase 0 lives in the BD sequence",
      },
    ],
  },
  {
    slug: "blacklist-wallet-match",
    title: "Blacklist Wallet Match",
    tags: ["scoring-rule", "security", "intel"],
    summary:
      "Auto-exclude tokens deployed by wallets on the intel blacklist — serial ruggers, sanctioned addresses, known drainer operators.",
    content: `### What it checks
The deployer address of a token against the \`intel_blacklist_wallets\` table
(currently 0 entries — to be seeded by Phase 8 intelSync once Telegram channel
scrape goes live).

### Action on match
- Deployer matched → AUTO-EXCLUDE regardless of score
- Deployer linked via transfer graph within 2 hops → -30 penalty + manual review

### Source
Phase 8 \`intelSync\` from [[telegram-intel-pipeline]] collects blacklist evidence from
subscribed intel channels. Each entry includes source, confidence, and first-seen
date.

### Related
- [[telegram-intel-pipeline]]
- [[rug-pull-patterns]]
`,
    related: [{ name: "telegram-intel-pipeline", why: "data source" }],
  },
];

function seedConcepts() {
  log("Phase 2 — 12 concept pages");
  let n = 0;
  for (const c of CONCEPTS) {
    wiki.createConceptPage({
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      content: c.content,
      tags: c.tags,
      related: c.related,
      changelog: [`${TODAY}: Seeded during wiki bootstrap`],
    });
    n++;
  }
  log(`  wrote ${n} concept pages`);
  return n;
}

// ─────────────────────────────────────────────────────────────
// Phase 3: 5 synthesis pages
// ─────────────────────────────────────────────────────────────
const SYNTHESIS = [
  {
    slug: "buzzshield-origin-story",
    title: "BuzzShield Origin Story — Sapphire Sleet → axios → BuzzShield",
    tags: ["security", "synthesis", "buzzshield"],
    summary:
      "How the Sapphire Sleet npm supply-chain attack against axios became the founding insight behind BuzzShield's 23-pattern drain detector.",
    content: `### The incident (March 2026)
North Korean threat actor [[sapphire-sleet]] compromised the \`axios\` npm package and
pushed a malicious patch release that exfiltrated environment variables and wallet
keys on \`require('axios')\`. Packages that had pinned \`axios: ^1.x\` auto-upgraded
during CI/CD and started leaking secrets within hours. Drift Protocol lost $270M.

### Our exposure
Buzz pipeline imported axios transitively through three dependencies. A pre-existing
supply-chain audit caught it during the Apr 1 cred rotation (ADR-023) before any
leak occurred. That audit became the proof that agent infrastructure needs automated,
always-on supply-chain scanning.

### From incident to product
BuzzShield was scaffolded in the 72 hours after the Sapphire Sleet disclosure. The
original 3 drain patterns became 23 (seeded from DeepMind, Anthropic SCONE-bench,
Blockaid, OWASP Agentic AI 2026). See [[buzzshield-origin-story#product]] below.

### Product
- 4-tier: Free / Pro / Business / Enterprise
- 47 crypto-specific rules in [[buzzshield-skill]]
- Public scan API: [[shield-public-api]]
- War Room integration via PULSE + autoDream Phase 7

### Related
- [[sapphire-sleet]]
- [[scoring-pipeline-v2]]
- [[rule-25-autonomous-bd]]
`,
    related: [{ name: "sapphire-sleet", why: "root cause" }],
  },
  {
    slug: "scoring-pipeline-v2",
    title: "Scoring Pipeline v2 — 12-rule honest calibration engine",
    tags: ["scoring", "synthesis", "architecture"],
    summary:
      "The 12-rule token scorer that produces HOT/WARM/WATCH/COLD classifications from 31 intel sources and dual-gate fundamental + market checks.",
    content: `### Architecture
Buzz scores tokens via a 12-rule honest calibration engine. Inputs come from 31 intel
sources (DexScreener, DexTools, CoinGecko, GitHub, Nansen, HeyAnon MCP, etc.).
Output is a 0-100 score plus a verdict: HOT (≥85), WARM (70-84), WATCH (40-69),
COLD (<40).

### Dual gate
A token must pass BOTH:
1. **Fundamental gate** (weight 65): team, contracts, security, governance, age
2. **Market gate** (weight 35): volume, liquidity, depth, concentration

This prevents scams with polished fundamentals but dead markets from getting HOT.

### The 12 rules
- [[fdv-gap-penalty]]
- [[ghost-volume-detection]]
- [[cto-flag-analysis]]
- [[volume-liquidity-ratio]]
- [[security-penalty]]
- [[liquidity-crossref]]
- [[age-bonus]]
- [[volume-threshold]]
- [[stablecoin-exclusion]]
- [[contradictory-audit-hold]]
- [[phantom-token-exclusion]]
- [[blacklist-wallet-match]]

### Recalibration history
Hill-climber (see [[scoring-rule-evolution]]) iterates rule weights against ground
truth from \`scoring_ground_truth\` (595 rows seeded Apr 9 2026 — 579 dead, 16
legitimate). First real hill-climb expected 2026-04-10 02:00 UTC.

### Related
- [[scoring-rule-evolution]]
- [[mirofish-simulation-design]]
`,
    related: [
      { name: "scoring-rule-evolution", why: "hill-climber feedback loop" },
    ],
  },
  {
    slug: "mirofish-simulation-design",
    title: "MiroFish Simulation — 10K-agent swarm architecture",
    tags: ["simulation", "synthesis", "architecture"],
    summary:
      "10,000-agent market simulation (200 LLM + 800 heuristic per wave, 20 rounds) that stress-tests token scoring under adversarial conditions.",
    content: `### Why it exists
A 12-rule scorer looks at snapshot data. MiroFish simulates how a token's market
would behave under 10K agents trading over 20 rounds with dual-brain logic
(half-cautious, half-aggressive). It's the stress test the scoring pipeline can't run.

### Architecture
- **Wave 1-20**: 1000 agents per wave (200 LLM + 800 heuristic), 20 waves
- **Per agent**: persona (degen, whale, institutional, community, technical_trader),
  risk level (5 levels), experience (2 tiers) → 5×10 variations
- **LLM backend**: Ollama \`qwen3:8b\` local-only, $0/sim (see [[microbuzz-simulation]])
- **EV formula**: \`EV = p × W - (1-p) × L\`
- **Output**: consensus, weighted average, per-agent verdicts, AMM final price

### Safety
- Sequential only (1 sim at a time)
- Never during signal filing windows (02:00-04:00 UTC)
- RAM alert at 10GB available
- Ollama model released after batch

### Related
- [[scoring-pipeline-v2]]
- [[microbuzz-simulation]]
`,
    related: [{ name: "microbuzz-simulation", why: "runtime safety rules" }],
  },
  {
    slug: "aibtc-signal-strategy",
    title:
      "AIBTC Signal Strategy — beat editor seat via agent-skills + agent-economy",
    tags: ["signal", "synthesis", "aibtc", "strategy"],
    summary:
      "Signal Factory v5.0 strategic pivot — target agent-skills + agent-economy editor seats via 24/7 + deterministic logging edge.",
    content: `### The pivot (Apr 7-8 2026)
v4.0 Genome Stack chased the quantum beat editor seat. Lost to Frosty Narwhal on
data.json proximity argument Apr 7. Rising Leviathan scout signal directly to Ionic
Nova: _"For a future beat where 24/7 availability and deterministic logging are the
primary editorial requirements, come back with a domain-specific audition."_

### New target
Two primary beats:
- **agent-skills**: we BUILD skills (token-scorer, MiroFish, BuzzShield, Wallet Guard,
  Signal Factory). Other auditioners are reviewers. We're builders.
- **agent-economy**: we OPERATE in it (x402, Bankr, AIBTC marketplace, 4 revenue streams).

### Edge
- 24/7 uptime via Hetzner CPX62 + 15 persistent agents + PULSE + aibtc-heartbeat
- Deterministic \`observation_log\` append-only trail across 105 tables
- Direct filing path (D1) that bypasses Claude Code idle dependency
- 5-day streak as of Apr 9 2026

### Filing cadence
- 4-6 signals/day, minimum 2 for streak
- 06:02 / 07:03 / 08:02 / 09:03 UTC direct-fired via \`morning-signals-v2.sh\`
- Emergency file by 16:00 UTC if \`signals_today == 0\`

### Related
- [[scoring-rule-evolution]]
- [[wallet-guard-trust-pipeline]]
`,
    related: [],
  },
  {
    slug: "wallet-guard-trust-pipeline",
    title: "Wallet Guard Trust Pipeline — Buzz → Aldo → AION",
    tags: ["security", "synthesis", "wallet-guard"],
    summary:
      "The complete trust loop: Buzz scores → Wallet Guard approves with receipt → BuzzReputation records outcome on-chain.",
    content: `### The three layers
1. **Pre-execution governance** — Buzz scores the token (see [[scoring-pipeline-v2]])
2. **Execution-time provability** — Wallet Guard (Aldo's AION API) evaluates the
   action and returns ALLOW / WARN / BLOCK + deterministic receipt
3. **Post-execution reputation** — BuzzReputation records the outcome on-chain

### Schema freeze (Apr 5 2026)
Three schemas locked with [[aldo-aion]]:
- Evaluate Request: \`{ action, target, chain, buzz_score, sim_consensus, context }\`
- Evaluate Response: \`{ decision, risk_level, reason_code, reasoning, receipt }\`
- Receipt Storage: \`wallet_guard_receipts\` table

### Demo script
\`scripts/wallet-guard-demo.sh\` walks 3 cases (ALLOW self-transfer, WARN first-time
destination, BLOCK institutional value transfer) with realtime War Room mirroring
via \`GUARD_DEMO_MODE=1\`.

### Related
- [[aldo-aion]]
- [[scoring-pipeline-v2]]
`,
    related: [{ name: "aldo-aion", why: "API counterparty" }],
  },
];

function seedSynthesis() {
  log("Phase 3 — 5 synthesis pages");
  let n = 0;
  for (const s of SYNTHESIS) {
    wiki.createSynthesisPage({
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      content: s.content,
      tags: s.tags,
      related: s.related,
      changelog: [`${TODAY}: Seeded during wiki bootstrap`],
    });
    n++;
  }
  log(`  wrote ${n} synthesis pages`);
  return n;
}

// ─────────────────────────────────────────────────────────────
// Phase 4: 7 partnership entity pages
// ─────────────────────────────────────────────────────────────
const PARTNERS = [
  {
    slug: "aldo-aion",
    title: "Aldo — CODÉ / AION",
    tags: ["partner", "security", "wallet-guard"],
    summary:
      "CODÉ founder. Built aion-guard-lite, the execution-time policy engine Buzz integrates as Wallet Guard. First tester access granted April 2 2026.",
    content: `### Who
Aldo runs CODÉ and is the author of the AION (aion-guard-lite) policy engine.
AION provides deterministic, receipt-producing decisions for irreversible actions.

### Integration
Wallet Guard POST /evaluate → AION endpoint → {decision, receipt, reasoning}.
Three schemas frozen with Aldo Apr 5 2026: Evaluate Request, Evaluate Response,
Receipt Storage. Full protocol in [[wallet-guard-trust-pipeline]].

### Constraints
- AION is closed-core — we call the API, don't see internals
- Currently Windows-first, EVM-first — Linux/Solana compatibility in progress
- Schema changes require both Aldo + Ogie approval

### Related
- [[wallet-guard-trust-pipeline]]
- [[scoring-pipeline-v2]]
`,
    related: [{ name: "wallet-guard-trust-pipeline", why: "the integration" }],
  },
  {
    slug: "gary-palmer-atv",
    title: "Gary Palmer — ATV.eth",
    tags: ["partner", "identity"],
    summary:
      "Builder of ATV.eth identity verification layer. Slot 1 of the Buzz trust stack.",
    content: `### Who
Gary Palmer, author of ATV.eth. ATV is a cryptographic identity verification
primitive Buzz uses as the first layer of its trust stack (before BuzzShield scan,
11-rule scoring, MiroFish simulation, Wallet Guard gate, BuzzReputation record).

### Integration
ATV identity verification runs pre-scan. If identity cannot be verified, the token
is flagged for manual review regardless of other scores.

### Related
- [[scoring-pipeline-v2]]
- [[wallet-guard-trust-pipeline]]
`,
    related: [],
  },
  {
    slug: "noah-ai",
    title: "Noah — dApp builder (BuzzShield integrator)",
    tags: ["partner", "integration", "buzzshield"],
    summary:
      "Independent dApp builder integrating BuzzShield's public scan API. Driving the Apr 9 SHIELD_PUBLIC_API ship.",
    content: `### Who
Noah is an independent developer building a wallet-adjacent dApp that needs
pre-interaction token risk signals. Requested a public (no-auth) BuzzShield scan
endpoint with CORS for browser calls.

### Integration (Apr 9 2026)
Shipped \`GET /api/v1/shield/public/scan?token={addr}&chain={chain}\`:
- No auth
- CORS \`*\`
- Rate limit 10/hr/IP
- Response: \`{token, chain, score, risk_level, flags[], summary, full_audit_url}\`

See commit \`1b72a16\` + \`4a0ec75\` (shield early-mount fix).

### Related
- [[buzzshield-origin-story]]
`,
    related: [{ name: "buzzshield-origin-story", why: "product context" }],
  },
  {
    slug: "flying-whale",
    title: "Flying Whale — intel partner",
    tags: ["partner", "intel"],
    summary:
      "Intel partner contributing blacklist data and adversarial signal samples to the pipeline.",
    content: `### Who
Flying Whale is an intel partner providing blacklisted wallet samples, known drainer
addresses, and adversarial social intel into Buzz's [[telegram-intel-pipeline]].

### Integration
Phase 8 intelSync (autoDream) will consume Flying Whale's data feed once wired.
Currently 0 entries in \`intel_telegram_entries\` and \`intel_blacklist_wallets\` —
pipeline ready, source not yet connected.

### Related
- [[blacklist-wallet-match]]
- [[telegram-intel-pipeline]]
`,
    related: [{ name: "blacklist-wallet-match", why: "downstream consumer" }],
  },
  {
    slug: "heyanon",
    title: "HeyAnon — MCP intel source",
    tags: ["partner", "intel", "mcp"],
    summary:
      "HeyAnon MCP provides cross-chain intelligence across 19 chains and 51 protocols. Intel source #32 in the Buzz stack.",
    content: `### Who
HeyAnon ships an MCP server exposing 19 chains and 51 protocols of DeFi activity
data. Integrated as Buzz intel source #32 alongside Nansen, DexScreener, CoinGecko,
GitHub, AIXBT momentum, etc.

### Usage
Buzz queries HeyAnon for cross-chain token footprint, LP movement, and protocol-level
activity during BD screening. Feature flag \`HEYANON_MCP\` is TRUE.

### Notes
Execution flag \`HEYANON_EXEC\` remains false — read-only until Ogie + HeyAnon review
the execution surface.

### Related
- [[scoring-pipeline-v2]]
`,
    related: [],
  },
  {
    slug: "nansen",
    title: "Nansen — wallet intel",
    tags: ["partner", "intel", "mcp"],
    summary:
      "Nansen MCP integration for wallet tagging and whale flow analysis. Intel source #32b.",
    content: `### Who
Nansen's MCP exposes labeled wallet data, smart-money flow, and entity tagging.
\`NANSEN_MCP\` flag is TRUE (read-only).

### Usage
BD screening Phase 2 cross-references deployer addresses against Nansen labels.
Known-scam labels contribute to [[security-penalty]] and [[blacklist-wallet-match]].

### Notes
Full agent integration \`NANSEN_AGENT\` is still false pending rate-limit review.

### Related
- [[blacklist-wallet-match]]
- [[security-penalty]]
`,
    related: [],
  },
  {
    slug: "bankr",
    title: "Bankr — x402 payment counterparty",
    tags: ["partner", "payments", "x402"],
    summary:
      "Bankr CLI + x402 health monitor (PULSE GAP-3) — tracks Bankr x402 endpoint availability and fee flow for agent-economy revenue.",
    content: `### Who
Bankr runs an x402-native payment layer Buzz uses for agent-economy revenue
attribution. The PULSE engine includes a Bankr x402 health monitor (GAP-3) that
tracks endpoint availability.

### Integration
- \`check_relay_health\` MCP tool polls Bankr relay status
- PULSE BAN-3 logs availability to \`observation_log\` every 60s
- Revenue attribution routes Bankr fees into \`revenue_events\` table

### Related
- [[aibtc-signal-strategy]]
`,
    related: [{ name: "aibtc-signal-strategy", why: "revenue context" }],
  },
];

function seedPartners() {
  log("Phase 4 — 7 partner entity pages");
  let n = 0;
  for (const p of PARTNERS) {
    wiki.createEntityPage({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      content: p.content,
      tags: p.tags,
      related: p.related,
      changelog: [`${TODAY}: Seeded during wiki bootstrap`],
    });
    n++;
  }
  log(`  wrote ${n} partner entity pages`);
  return n;
}

// ─────────────────────────────────────────────────────────────
// Phase 5: INDEX.md + LOG.md
// ─────────────────────────────────────────────────────────────
function seedIndexAndLog(counts) {
  log("Phase 5 — generate INDEX.md + LOG.md");
  wiki.generateIndex();
  wiki.appendLog(
    "seed",
    `Initial wiki bootstrap — ${counts.entities + counts.partners} entities, ${counts.concepts} concepts, ${counts.synthesis} synthesis pages from Buzz v9.3 state`,
    [],
  );
  log("  INDEX.md + LOG.md ready");
}

// ─────────────────────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────────────────────
function main() {
  log(`root = ${process.env.WIKI_ROOT}`);
  wiki.ensureWikiRoot();

  const counts = {
    entities: seedEntities(),
    concepts: seedConcepts(),
    synthesis: seedSynthesis(),
    partners: seedPartners(),
  };
  seedIndexAndLog(counts);

  const stats = wiki.wikiStats();
  log(`final stats: ${JSON.stringify(stats)}`);
  log("DONE");
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error("[wiki-seed] FATAL:", err);
    process.exit(1);
  }
}
