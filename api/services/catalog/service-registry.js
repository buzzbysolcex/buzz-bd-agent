/**
 * Service Catalog — 41 Buzz BD Agent Services
 * 6 categories: scoring, execution, automation, orchestration, marketplace, intelligence
 * Wired into PULSE and autoDream (Phase 14: marketplace health)
 */

const SERVICES = [
  {
    id: 1,
    name: "Token Scorer",
    category: "scoring",
    status: "live",
    featureFlag: null,
    priceTiers: { t1: 600 },
    description: "Composite token scoring across 31 sources on 19 chains",
  },
  {
    id: 2,
    name: "MiroFish 10K Sim",
    category: "scoring",
    status: "ready",
    featureFlag: "MIROFISH_REALTIME",
    priceTiers: { t2: 2500 },
    description: "1000-agent swarm simulation with dual-brain AMM",
  },
  {
    id: 3,
    name: "Smart Money Tracker",
    category: "scoring",
    status: "pending",
    featureFlag: "NANSEN_MCP",
    priceTiers: { t2: 2500 },
    description: "Nansen-powered smart money flow detection",
  },
  {
    id: 4,
    name: "CEX Listing Gap",
    category: "scoring",
    status: "ready",
    featureFlag: "HEYANON_MCP",
    priceTiers: { t1: 600 },
    description: "Identify tokens listed on DEX but missing from CEX",
  },
  {
    id: 5,
    name: "DeFi Safety Audit",
    category: "scoring",
    status: "ready",
    featureFlag: null,
    priceTiers: { t1: 600, t2: 2500, t3: 5000, t4: 25000 },
    description: "Multi-tier DeFi protocol safety audit with on-chain proof",
  },
  {
    id: 6,
    name: "PumpFun Creator Intel",
    category: "scoring",
    status: "ready",
    featureFlag: null,
    priceTiers: { t1: 600 },
    description: "Creator history and pattern analysis for PumpFun launches",
  },
  {
    id: 7,
    name: "Yield Comparison",
    category: "scoring",
    status: "ready",
    featureFlag: "HEYANON_MCP",
    priceTiers: { t1: 600 },
    description: "Cross-protocol yield comparison via HeyAnon",
  },
  {
    id: 8,
    name: "Wallet Portfolio",
    category: "scoring",
    status: "ready",
    featureFlag: "HEYANON_MCP",
    priceTiers: { t1: 600 },
    description: "Wallet portfolio analysis across 18 chains",
  },
  {
    id: 9,
    name: "Score-to-Swap",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Score a token then execute swap in one pipeline",
  },
  {
    id: 10,
    name: "Perps Trading",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t3: 5000 },
    description: "Perpetuals trading across supported DEXs",
  },
  {
    id: 11,
    name: "Meteora LP",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Meteora liquidity pool position management",
  },
  {
    id: 12,
    name: "Cross-Chain Bridge",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t1: 600 },
    description: "Cross-chain token bridging via HeyAnon routing",
  },
  {
    id: 13,
    name: "LST Staking",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Liquid staking token operations",
  },
  {
    id: 14,
    name: "Lending Router",
    category: "execution",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Optimal lending rate routing across protocols",
  },
  {
    id: 15,
    name: "Price Triggers",
    category: "automation",
    status: "ready",
    featureFlag: null,
    priceTiers: { t1: 600 },
    description: "Automated alerts on price threshold breaches",
  },
  {
    id: 16,
    name: "DCA Automation",
    category: "automation",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Dollar-cost averaging automation",
  },
  {
    id: 17,
    name: "Yield Protection",
    category: "automation",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t2: 2500 },
    description: "Automated yield protection and rebalancing",
  },
  {
    id: 18,
    name: "Full Pipeline",
    category: "orchestration",
    status: "pre_frontier",
    featureFlag: null,
    priceTiers: { t4: 25000 },
    description: "End-to-end token analysis to execution pipeline",
  },
  {
    id: 19,
    name: "Multi-Step DeFi",
    category: "orchestration",
    status: "pre_frontier",
    featureFlag: "HEYANON_EXEC",
    priceTiers: { t3: 5000 },
    description: "Multi-step DeFi strategy execution",
  },
  {
    id: 20,
    name: "Wallet Guard",
    category: "orchestration",
    status: "with_aldo",
    featureFlag: "WALLET_GUARD",
    priceTiers: { t2: 2500 },
    description: "Real-time wallet monitoring and protection",
  },
  {
    id: 21,
    name: "ERC-8004 Reputation",
    category: "orchestration",
    status: "ready",
    featureFlag: null,
    priceTiers: { t1: 600 },
    description: "On-chain reputation scoring via ERC-8004 standard",
  },
  {
    id: 22,
    name: "Solana Agent Skill",
    category: "orchestration",
    status: "live",
    featureFlag: "SOLANA_AGENT_SKILL",
    priceTiers: { free: 0 },
    description:
      "Public SKILL.md for AI agent consumption via Solana Skills directory",
  },
  {
    id: 23,
    name: "Shield Health Check",
    category: "scoring",
    status: "live",
    featureFlag: "SHIELD_FREE_TIER",
    priceTiers: { free: 0 },
    description: "Free wallet health check — basic exposure summary",
  },
  {
    id: 24,
    name: "Shield Full Scan",
    category: "scoring",
    status: "live",
    featureFlag: "SHIELD_ENGINE",
    priceTiers: { t1: 1000 },
    description:
      "Full deep scan — all 23+ patterns, address poisoning, temporal analysis ($0.10/scan)",
  },
  {
    id: 25,
    name: "Shield Program Risk",
    category: "scoring",
    status: "live",
    featureFlag: "SHIELD_PROGRAM_SCORER",
    priceTiers: { t1: 1000 },
    description:
      "Program risk scoring 0-100 — verified, immutable, age, deployer ($0.10/scan)",
  },
  {
    id: 26,
    name: "Shield Bridge Verify",
    category: "scoring",
    status: "pending",
    featureFlag: "SHIELD_CROSS_CHAIN",
    priceTiers: { t2: 500 },
    description:
      "Cross-chain bridge verification — registry lookup, gateway proof check ($0.05/scan)",
  },
  {
    id: 27,
    name: "Shield Custom Pattern",
    category: "scoring",
    status: "planned",
    featureFlag: "SHIELD_ENTERPRISE_TIER",
    priceTiers: { custom: 0 },
    description:
      "Enterprise custom drain pattern development — tailored to client operations",
  },
  {
    id: 28,
    name: "PULSE Engine",
    category: "infrastructure",
    status: "live",
    featureFlag: "PULSE_ENGINE",
    priceTiers: { internal: 0 },
    description:
      "KAIROS-class heartbeat tick loop with load-aware scheduling, streak protection, and event-driven agent wake. Persists across reboots via pulse_state table.",
  },
  {
    id: 29,
    name: "autoDream",
    category: "infrastructure",
    status: "live",
    featureFlag: "AUTODREAM",
    priceTiers: { internal: 0 },
    description:
      "Nightly memory consolidation engine. 4-phase cycle: scan, identify stale data, consolidate/archive, optimize indexes. Runs at 02:00 UTC with reboot-safe dedup.",
  },
  {
    id: 30,
    name: "HSaaS Funnel",
    category: "orchestration",
    status: "live",
    featureFlag: "HSAAS_FREE",
    priceTiers: { free: 0, t1: 500, t2: 1500, t3: 2500 },
    description:
      "Honest Scoring as a Service unified funnel. Free score → audit upsell. Wires Token Scorer (#1), DeFi Safety Audit (#5), Score-to-Swap (#9). Event-driven via token.scored subscription.",
  },
  // Marketplace Expansion — BuzzShield V2 (Apr 10 2026)
  {
    id: 31,
    name: "BuzzShield on MoltLaunch",
    category: "marketplace",
    status: "live",
    featureFlag: "MARKETPLACE_MOLTLAUNCH",
    priceTiers: { free: 0, pro: 1000 },
    description: "BuzzShield Token Scanner listed on MoltLaunch marketplace",
  },
  {
    id: 32,
    name: "BuzzShield x402 Scan",
    category: "marketplace",
    status: "live",
    featureFlag: "BANKR_X402_SHIELD",
    priceTiers: { t1: 1000 },
    description: "x402-gated BuzzShield V2 scan ($0.10/scan, USDC on Base)",
  },
  {
    id: 33,
    name: "BuzzShield on ACP",
    category: "marketplace",
    status: "live",
    featureFlag: "ACP_BUZZSHIELD",
    priceTiers: { t1: 1000 },
    description: "Token Security Scan via ACP seller runtime ($0.10/call)",
  },
  {
    id: 34,
    name: "BuzzShield on Flying Whale",
    category: "marketplace",
    status: "pending",
    featureFlag: "FW_BUZZSHIELD",
    priceTiers: { sats: 1000 },
    description:
      "buzzshield-scan skill on AIBTC marketplace (1000 sats/query, 70/30)",
  },
  // BuzzShield V3 — research-driven layers (CCS 2026)
  {
    id: 35,
    name: "Shield Drift Detector",
    category: "scoring",
    status: "planned",
    featureFlag: "BUZZSHIELD_DRIFT_DETECTOR",
    priceTiers: { t2: 2500 },
    description:
      "AC-1.b conditional delivery detection — behavioral drift monitoring for LLM router warm-up evasion",
  },
  {
    id: 36,
    name: "Shield Typosquat Scanner",
    category: "scoring",
    status: "planned",
    featureFlag: "BUZZSHIELD_TYPOSQUAT",
    priceTiers: { t1: 1000 },
    description:
      "AC-1.a package typosquat scanner — Levenshtein distance check against canonical package names",
  },
  {
    id: 37,
    name: "Shield Integrity Binding",
    category: "scoring",
    status: "planned",
    featureFlag: "BUZZSHIELD_INTEGRITY_BINDING",
    priceTiers: { t2: 2500 },
    description:
      "On-chain response integrity binding — SHA-256 hash of every scan result stored via ScoreStorage",
  },
  // Deep Research Services (Apr 10 2026 — Phase 1 + Phase 2)
  {
    id: 38,
    name: "Listing Readiness Assessment",
    category: "intelligence",
    status: "planned",
    featureFlag: "SERVICE_LISTING_READINESS",
    priceTiers: { x402: 2500 },
    description:
      "Exchange listing readiness report — scores token against 7 exchange criteria, identifies gaps, recommends path (wiki: listing-readiness-checklist)",
  },
  {
    id: 39,
    name: "Agent Identity Verification",
    category: "scoring",
    status: "planned",
    featureFlag: "SERVICE_AGENT_IDENTITY",
    priceTiers: { x402: 1000 },
    description:
      "Check ERC-8004 registration, verified deployer, multisig, timelock (wiki: onchain-agent-identity)",
  },
  {
    id: 40,
    name: "MCP Security Scan",
    category: "scoring",
    status: "planned",
    featureFlag: "SERVICE_MCP_SECURITY",
    priceTiers: { x402: 1500 },
    description:
      "Assess MCP server configuration against MCP-DPT 49-attack taxonomy, 6 architectural layers (wiki: mcp-dpt-paper)",
  },
  {
    id: 41,
    name: "Exchange Compliance Pre-Screen",
    category: "intelligence",
    status: "planned",
    featureFlag: "SERVICE_EXCHANGE_COMPLIANCE",
    priceTiers: { hsaas: 50000 },
    description:
      "HSaaS $500 pre-screen against Binance/Coinbase/OKX requirements with gap analysis (wiki: listing-scoring-alignment)",
  },
];

function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

function getByCategory(category) {
  return SERVICES.filter((s) => s.category === category);
}

function getReady() {
  return SERVICES.filter((s) => s.status === "live" || s.status === "ready");
}

function getStats() {
  return {
    total: SERVICES.length,
    live: SERVICES.filter((s) => s.status === "live").length,
    ready: SERVICES.filter((s) => s.status === "ready").length,
    pending: SERVICES.filter((s) => s.status === "pending").length,
    pre_frontier: SERVICES.filter((s) => s.status === "pre_frontier").length,
    infrastructure: SERVICES.filter((s) => s.category === "infrastructure")
      .length,
  };
}

module.exports = { SERVICES, getService, getByCategory, getReady, getStats };
