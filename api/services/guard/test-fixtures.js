// Locked runtime-aligned test fixtures from Aldo (AION)
// Date: April 3, 2026
// Source: Validated local runtime output
// DO NOT MODIFY — these are the frozen interface contract

const BLOCK_EXAMPLE = {
  decision: "BLOCK",
  reasoning:
    "Institutional policy blocked non-self value transfer. | reasonCode=INSTITUTIONAL_VALUE_TRANSFER_BLOCKED | riskLevel=CRITICAL",
  consequence:
    "This request has been blocked by constitutional execution policy.",
  reasonCode: "INSTITUTIONAL_VALUE_TRANSFER_BLOCKED",
  riskLevel: "CRITICAL",
  ruleHits: ["VALUE_TRANSFER", "POLICY_PACK_INSTITUTIONAL"],
  recommendedAction: "STOP",
  receipt: {
    id: "c7a68a9e-90bf-4d5d-a92a-eb199c541f38",
    hash: "bc711cb810bb6e7f7759ee307510417085617d0ab019480a15c76a7b84ddb810",
    reproducible: true,
    timestamp: "2026-04-02T18:28:52.056Z",
    policyVersion: "kine.v7.impact-intelligence",
    ruleHits: ["VALUE_TRANSFER", "POLICY_PACK_INSTITUTIONAL"],
    overrideRequired: false,
    overrideUsed: false,
    txFingerprint:
      "bc711cb810bb6e7f7759ee307510417085617d0ab019480a15c76a7b84ddb810",
    requestId: "buzz-escrow-0001",
    integrator: "Buzz",
    flow: "confirm_escrow",
  },
};

const WARN_EXAMPLE = {
  decision: "WARN",
  reasoning:
    "First-time interaction with destination address. | reasonCode=FIRST_TIME_DESTINATION | riskLevel=HIGH",
  consequence: "Manual War Room review required before escrow confirmation.",
  reasonCode: "FIRST_TIME_DESTINATION",
  riskLevel: "HIGH",
  ruleHits: ["VALUE_TRANSFER", "FIRST_TIME_DESTINATION"],
  recommendedAction: "WAR_ROOM_REVIEW",
  receipt: {
    id: "test-warn-receipt-001",
    hash: "warn-hash-placeholder",
    reproducible: true,
    timestamp: "2026-04-03T00:00:00.000Z",
    policyVersion: "kine.v7.impact-intelligence",
    ruleHits: ["VALUE_TRANSFER", "FIRST_TIME_DESTINATION"],
    overrideRequired: false,
    overrideUsed: false,
    txFingerprint: "warn-fingerprint-placeholder",
    requestId: "buzz-escrow-0001",
    integrator: "Buzz",
    flow: "confirm_escrow",
  },
};

const ALLOW_EXAMPLE = {
  decision: "ALLOW",
  reasoning:
    "Self-transfer detected | reasonCode=SELF_TRANSFER | riskLevel=LOW",
  consequence: "This request may proceed through the guarded flow.",
  reasonCode: "SELF_TRANSFER",
  riskLevel: "LOW",
  ruleHits: ["SELF_TRANSFER"],
  recommendedAction: "PROCEED",
  receipt: {
    id: "test-allow-receipt-001",
    hash: "allow-hash-placeholder",
    reproducible: true,
    timestamp: "2026-04-03T00:00:00.000Z",
    policyVersion: "kine.v7.impact-intelligence",
    ruleHits: ["SELF_TRANSFER"],
    overrideRequired: false,
    overrideUsed: false,
    txFingerprint: "allow-fingerprint-placeholder",
    requestId: "buzz-escrow-0001",
    integrator: "Buzz",
    flow: "confirm_escrow",
  },
};

module.exports = { BLOCK_EXAMPLE, WARN_EXAMPLE, ALLOW_EXAMPLE };
