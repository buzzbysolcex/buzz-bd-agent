/**
 * Feature Flags — Build-time elimination pattern
 * v9.0 | Claude Code architecture integration
 * All new features start as false, flip to true after testing
 */

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
  BUZZSHIELD_SBOM: false, // CycloneDX SBOM generation — flip after OSV confirms clean
};

function feature(name) {
  return FLAGS[name] === true;
}
function allFlags() {
  return { ...FLAGS };
}
module.exports = { feature, allFlags, FLAGS };
