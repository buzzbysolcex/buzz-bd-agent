/**
 * Feature Flags — Build-time elimination pattern
 * v9.0 | Claude Code architecture integration
 * All new features start as false, flip to true after testing
 */

// Source /data/.env.pashov at boot so PASHOV_* flags land in process.env
// BEFORE the FLAGS object is evaluated below. File is root-owned 600 and
// lives on the persistent volume so creds survive image rebuild.
(() => {
  try {
    const fs = require("fs");
    const path = "/data/.env.pashov";
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (process.env[k] == null) process.env[k] = v;
    }
  } catch {
    /* non-fatal */
  }
})();

const FLAGS = {
  MIROFISH_REALTIME: true,
  MONTECARLO: true,
  HSAAS_FREE: true,
  HSAAS_PRO: false,
  HSAAS_ENTERPRISE: false,
  BAAS_REPORT: false,
  MAILBOX: true,
  TASK_DAG: true,
  DYNAMIC_CRONS: true,
  EVENT_BUS: true,
  ELS1_PROTOCOL: false,
  BROWSER_USE_CLI: true,
  GSD_BROWSER: true,
  HERMES_SENTINEL: false,
  GPU_BURST: false,
  ILSHIELD_ENABLED: true,
  PULSE_ENGINE: true,
  PULSE_LOAD_AWARE: true,
  AUTODREAM: true,
  OBSERVATION_LOG: true,
  ANTI_DISTILLATION: false,
  AUTO_OUTREACH: true,
  TRUST_GATES: true,
  GITHUB_MONITOR: true,
  HSAAS_EVENT_WIRING: true,
  STREAK_EMERGENCY_FILER: false,
  DIRECT_SIGNAL_FILING: true,
  SILENCE_CONSENT: false,
  INBOX_MONITOR: true,
  WALLET_GUARD: true,
  ATV_IDENTITY: true,
  HEYANON_MCP: true,
  HEYANON_EXEC: false,
  PULSE_MOLTBOOK: true,
  NANSEN_MCP: true,
  NANSEN_AGENT: false,
  SOLANA_AGENT_SKILL: true,
  // Buzz Shield — Agent Security Intelligence (Phase 1)
  SHIELD_ENGINE: true,
  SHIELD_FREE_TIER: true,
  SHIELD_PAID_TIER: false,
  SHIELD_PROGRAM_SCORER: true,
  SHIELD_PATTERN_MATCHER: true,
  SHIELD_INSTRUCTION_SCANNER: false,
  SHIELD_COMMUNITY_REPORTS: false,
  SHIELD_MIROFISH_TRIGGER: false,
  SHIELD_WALLET_GUARD_LINK: false,
  SHIELD_ON_CHAIN: false,
  SHIELD_PUBLIC_API: true,
  // Karpathy LLM Wiki — persistent knowledge base at /data/buzz/persistent/wiki
  // Flipped true Apr 9 2026 06:07 UTC after Ogie reviewed seed pages
  // (fdv-gap-penalty, scoring-pipeline-v2, aldo-aion). 43 seed pages live.
  KARPATHY_WIKI: true,
  // autoDream v2 — pattern extraction + instinct system
  AUTODREAM_PATTERNS: false,
  // Buzz Shield Phase 2 — expanded detection
  SHIELD_ADDRESS_POISONING: false,
  SHIELD_TEMPORAL_ANALYSIS: false,
  SHIELD_CROSS_CHAIN: false,
  // Shield Tiers
  SHIELD_BUSINESS_TIER: false,
  SHIELD_ENTERPRISE_TIER: false,
  // Shield Integration
  SHIELD_PULSE_MONITOR: true,
  AUTODREAM_SHIELD: true,
  SHIELD_WAR_ROOM_ALERTS: true,
  SHIELD_X402_PAYMENTS: false,
  // Pyth Oracle Verification — Intel Source #33
  SHIELD_PYTH_ORACLE: true,
  // autoDream Evolution
  AUTODREAM_HILLCLIMB: true,
  TELEGRAM_CHANNEL_INTEL: true,
  AUTODREAM_WARROOM_DASHBOARD: true,
  AUTODREAM_SIGNAL_ANGLES: true,
  PULSE_BANKR_HEALTH: true,
  // Shield Phase 3 (future)
  SHIELD_ANOMALY_DETECTION: false,
  SHIELD_MEMPOOL: false,
  SHIELD_INPUT_VERIFICATION: false,
  // BuzzShield v2.0 — multi-layered defense (Apr 10 2026)
  BUZZSHIELD_DEFENDER: false, // @stackone/defender prompt injection defense — hold until ONNX memory test
  BUZZSHIELD_OSV: true, // OSV.dev supply chain vulnerability scanning — flipped Apr 10 per Ogie
  BUZZSHIELD_SBOM: true, // CycloneDX SBOM generation — flipped Apr 10 after OSV confirmed 0 critical/high
  // Marketplace Expansion (Apr 10 2026)
  MARKETPLACE_MOLTLAUNCH: true, // BuzzShield on MoltLaunch
  BANKR_X402_SHIELD: true, // BuzzShield x402 $0.10/scan (Service #9 on Bankr)
  ACP_BUZZSHIELD: true, // BuzzShield on ACP Protocol (Agent #17681)
  FW_BUZZSHIELD: false, // Flying Whale buzzshield-scan (pending proposal approval)
  PULSE_MARKETPLACE_HEALTH: true, // 6-hourly marketplace endpoint health check
  AUTODREAM_MARKETPLACE: true, // Phase 14: nightly marketplace verification
  SHIELD_ENRICHED_RESPONSE: true, // Enriched public scan response — 7 new fields, premium gate
  // BuzzShield V3 — research-driven layers (arXiv:2604.08407, CCS 2026)
  BUZZSHIELD_DRIFT_DETECTOR: false, // AC-1.b conditional delivery detection (behavioral drift)
  BUZZSHIELD_TYPOSQUAT: false, // AC-1.a package typosquat scanner (Levenshtein)
  BUZZSHIELD_INTEGRITY_BINDING: false, // Response integrity binding (on-chain hash)
  // Scoring Engine v3 — listing research gap analysis (Apr 10 2026)
  SCORING_SECURITIES_FLAG: false, // Rule 12: ROI promises, pre-utility token sales (Coinbase #1 reject)
  SCORING_TEAM_TRANSPARENCY: false, // Rule 13: deployer identity, ERC-8004 attestation, public team
  SCORING_INSIDER_CONCENTRATION: false, // Rule 14: top 10 holder distribution >80% flag
  SCORING_VESTING_RISK: false, // Rule 15: upcoming cliff unlocks within 30 days
  // Deep Research Services (Apr 10 2026)
  SERVICE_LISTING_READINESS: false, // #38: Exchange listing readiness assessment ($0.25/report)
  SERVICE_AGENT_IDENTITY: false, // #39: ERC-8004 agent identity verification ($0.10/check)
  SERVICE_MCP_SECURITY: false, // #40: MCP security scan against 49-attack taxonomy ($0.15/scan)
  SERVICE_EXCHANGE_COMPLIANCE: false, // #41: HSaaS exchange compliance pre-screen ($500)
  // Operation Ethereum Immune System (Apr 11 2026)
  BUZZSHIELD_AUDIT_ENGINE: true, // Autonomous smart contract security auditing via ETHSkills — flipped Apr 12 per Ogie directive
  BUZZSHIELD_ETHSKILLS_SYNC: true, // Auto-sync ETHSkills updates weekly via PULSE — flipped Apr 13
  BUZZSHIELD_SPEEDRUN_CHALLENGES: false, // SpeedRunETH challenge solver + auditor
  BUZZSHIELD_CHECKLIST_API: true, // Public pre-deploy security checklist API — flipped Apr 11 after smoke test
  // Chrome DevTools MCP — browser automation via CDP (Apr 12 2026)
  CHROME_DEVTOOLS_MCP: false, // Master toggle for Chrome DevTools MCP integration
  CHROME_DEVTOOLS_BD_SCREENING: false, // BD Phase 2: automated website verification via Lighthouse + screenshots
  CHROME_DEVTOOLS_SHIELD_VERIFY: false, // BuzzShield: visual contract deployer page verification
  // Stacks SIP-010 scanning (Apr 13 2026) — addresses publisher feedback on #439
  STACKS_SIP010_SCANNING: true, // Scan Stacks fungible tokens via Hiro API + DexScreener
  // Scoring Rules 16-18 — Audit-integrated scoring (Apr 13 2026)
  SCORING_AUDIT_PENALTY: true, // Rule 16: -3/-8/-15 for medium/high/critical audit findings — flipped Apr 13 after smoke test
  SCORING_AUDIT_BONUS: true, // Rule 17: +5 clean audit, +3 score >= 80 — flipped Apr 13 after smoke test
  SCORING_VULN_MATCH: true, // Rule 18: -10 for known vulnerability match — flipped Apr 13 after smoke test
  // TimesFM Predictive Intelligence — Phase 0 data collection (Apr 13 2026)
  TOKEN_TIMESERIES: true, // Snapshot cron: every 4h for tokens score >= 50
  TIMESFM_FORECAST: false, // TimesFM model service — DEFER to post-May 11
  // AIXBT Intel Source #34 — @aixbt_agent narrative signals (Apr 14 2026)
  AIXBT_INTEL: true, // Master switch: GSD browser scrape + PULSE 7c + autoDream Phase 17
  AIXBT_SCORING: false, // Scoring modifier: BULLISH +3..+7, BEARISH -5..-10 — flip after 1 week validation
  // Mining Intelligence Engine v2.0 — mempool.space pool scoring (Apr 14 2026)
  MINING_INTEL: true, // Master switch: collector + routes + PULSE 6c
  MINING_SNAPSHOTS: true, // Network-level data collection
  MINING_POOLS: true, // Pool-level scoring (100-point health scores)
  MINING_SIGNALS: true, // Signal generation — flipped Apr 17 per Ogie (4 snapshots + 42 daily trend rows confirmed, Kai meeting 16:00 Jeddah)
  // Skill.BTC — Bitcoin knowledge wiki for AI agents (Apr 16 2026)
  // Flipped true Apr 16 per Ogie after scaffold + 5 seed pages deployed.
  // Phase 2 expansion Apr 17-20. Revenue Phase 5: 50 sats/query via x402, post-May 11.
  SKILL_BTC: process.env.SKILL_BTC !== "false",
  // OBLITERATUS Patterns v9.3.2 (Apr 16 2026)
  // Cashtag monitor — PULSE 8a polls @BuzzBySolCex mentions every 3 min,
  // auto-replies to $TICKER mentions with scan card. Flipped true Apr 16
  // 2026 after smoke test (20 mentions fetched, 0 cashtag matches — safe).
  X_CASHTAG_SIGNAL: process.env.X_CASHTAG_SIGNAL !== "false",
  AGENTCASH_ENABLED: process.env.AGENTCASH_ENABLED === "true" || false,
  PRE_SCREEN_ANALYSIS: process.env.PRE_SCREEN_ANALYSIS === "true" || false,
  ANTI_OUROBOROS: process.env.ANTI_OUROBOROS === "true" || false,
  // Signal Factory telemetry — flipped true Apr 16 per Ogie (zero-risk passive logging)
  SIGNAL_PERFORMANCE_LOG: process.env.SIGNAL_PERFORMANCE_LOG !== "false",
  // Pipeline stage names — flipped true Apr 16 per Ogie (cosmetic War Room readability)
  PIPELINE_STAGE_NAMES: process.env.PIPELINE_STAGE_NAMES !== "false",
  // Tweet Image Cards — BuzzShield visual layer (Apr 16 2026)
  // Flipped true Apr 16 after V2 design approved (big-rating right panel).
  // Graceful fallback: if image pipeline fails, tweet sends as text-only.
  TWEET_IMAGE_CARDS: process.env.TWEET_IMAGE_CARDS !== "false",
  // ZachXBT Investigations intel — Intel Source #37 (Apr 17 2026)
  // Registered to feed intel_telegram_entries + intel_blacklist_wallets
  // from the Telegram channel Investigations by ZachXBT (-1001963527562).
  // Pipeline already live (PULSE priority telegram-intel-poll + parser v2
  // handles truncated addresses + expanded classifier).
  ZACHXBT_INTEL: process.env.ZACHXBT_INTEL !== "false",
  // Pashov integration (V4 Portal — Apr 16 2026)
  // Flags sourced from /data/.env.pashov via the IIFE at top of this file.
  // Master switch; audit engine endpoints gated on this.
  PASHOV_ENABLED: process.env.PASHOV_ENABLED === "true",
  PASHOV_AUTO_ON_HOT_TOKEN: process.env.PASHOV_AUTO_ON_HOT_TOKEN === "true",
  PASHOV_XRAY_ON_PIPELINE: process.env.PASHOV_XRAY_ON_PIPELINE === "true",
  PASHOV_SCORING_ENABLED: process.env.PASHOV_SCORING_ENABLED === "true",
  // BuzzShield V4 Portal endpoints (Phase 1 — blocks Kite AI May 6)
  BUZZSHIELD_V4_AUDIT_API: process.env.BUZZSHIELD_V4_AUDIT_API !== "false",
  // Discord OPS + INTEL Dashboard (Phase 1b Wave 1 — Apr 19 2026)
  // Default FALSE. Flip requires explicit Ogie War Room authorization per
  // buzz-trust-governance-feature-flags.md (Trust Level 0). When true,
  // api/lib/discord-notify.send() actually posts; when false it no-ops.
  // Flipped 2026-04-23 per Ogie msg 4519 Day 22 Discord diagnostic —
  // DB set this flag to true on 2026-04-21 14:47:53 (stage-4-retry-post-
  // phase-3-deploy) but the hardcoded default kept runtime silent. Aligns
  // the source default with the already-approved DB state so dual-route
  // Discord path actually posts.
  DISCORD_OPS_DASHBOARD: true,
};

function feature(name) {
  return FLAGS[name] === true;
}
function allFlags() {
  return { ...FLAGS };
}
module.exports = { feature, allFlags, FLAGS };
