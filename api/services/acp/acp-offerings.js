/**
 * ACP Protocol — Buzz Agent Offerings
 * Agent #17681 on Virtuals ACP marketplace
 * Feature flag: ACP_BUZZSHIELD
 */

const { feature } = require("../../lib/feature-flags");

const ACP_AGENT_ID = 17681;

const OFFERINGS = [
  {
    offering_id: "buzzshield-scan",
    service: "Token Security Scan",
    price: "$0.10/call",
    input: {
      token_address: "string (required)",
      chain: "string (solana|base|ethereum|bnb, default: solana)",
    },
    output:
      "BuzzShield V2 security intelligence report (score, rules, threat_matrix, market_data, shield_v2, flags, summary)",
    category: "Security",
    enabled: () => feature("ACP_BUZZSHIELD"),
  },
];

function getOfferings() {
  return OFFERINGS.filter((o) =>
    typeof o.enabled === "function" ? o.enabled() : true,
  );
}

function getAgentInfo() {
  return {
    agent_id: ACP_AGENT_ID,
    name: "Buzz BD Agent",
    identity: "Ionic Nova",
    offerings: getOfferings(),
    status: "active",
  };
}

module.exports = { OFFERINGS, getOfferings, getAgentInfo, ACP_AGENT_ID };
