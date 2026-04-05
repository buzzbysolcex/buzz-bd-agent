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
  // autoDream v2 — pattern extraction + instinct system
  AUTODREAM_PATTERNS: false,
};

function feature(name) { return FLAGS[name] === true; }
function allFlags() { return { ...FLAGS }; }
module.exports = { feature, allFlags, FLAGS };
