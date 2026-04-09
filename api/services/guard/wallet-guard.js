// Wallet Guard Integration — AION Guard Lite
// Feature flag: WALLET_GUARD
// Aldo (CODÉ) — first tester access granted April 2, 2026

const { feature } = require("../../lib/feature-flags");
const { emit } = require("../events/event-bus");
const mailbox = require("../mailbox/mailbox");

// AION API endpoint (local or remote — configured via env)
const AION_ENDPOINT =
  process.env.AION_GUARD_URL || "http://localhost:7700/api/v1/evaluate";

// Evaluate an action before execution
async function evaluate(action) {
  if (!feature("WALLET_GUARD")) {
    return {
      decision: "ALLOW",
      bypassed: true,
      reason: "WALLET_GUARD flag disabled",
    };
  }

  try {
    const response = await fetch(AION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_type: action.type, // 'outreach' | 'escrow' | 'listing' | 'transfer'
        target: action.target, // email, contract address, etc.
        value: action.value || null, // amount if financial
        context: action.context || {}, // token data, score, etc.
        agent: action.agent || "buzz-bd-agent",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const result = await response.json();
    const decision = result.decision || "WARN"; // Default to WARN if unclear

    // Emit appropriate event
    const eventType =
      decision === "ALLOW"
        ? "guard.allow"
        : decision === "BLOCK"
          ? "guard.block"
          : "guard.warn";

    emit("wallet-guard", eventType, {
      action: action.type,
      target: action.target,
      decision,
      receipt: result.receipt || null,
      reason: result.reason || "No reason provided",
    });

    // WARN and BLOCK → notify War Room
    if (decision !== "ALLOW") {
      mailbox.send("wallet-guard", "bd-agent", "ALERT", {
        type: `GUARD_${decision}`,
        action: action.type,
        target: action.target,
        reason: result.reason,
        message: `Wallet Guard ${decision}: ${action.type} to ${action.target} — ${result.reason}`,
      });
    }

    return {
      decision,
      // Pass through ALL raw AION fields so guard-routes can persist them
      receipt: result.receipt || {
        id: result.receipt_id || null,
        hash: result.receipt_hash || null,
        path: result.receipt_path || null,
      },
      reason: result.reason || (result.reasons || []).join(", ") || null,
      reasoning: result.reasoning || null,
      riskLevel: result.aml_summary?.signal || result.risk_level || null,
      reasonCode: result.reason_code || (result.reasons || [])[0] || null,
      counterfactual_summary: result.counterfactual_summary || null,
      normalized: result.normalized || null,
      receipt_path: result.receipt_path || null,
      aml_summary: result.aml_summary || null,
      bypassed: false,
    };
  } catch (error) {
    // AION unreachable → fallback to trust gates only (don't block on API failure)
    console.warn("[wallet-guard] AION API unreachable:", error.message);
    return {
      decision: "ALLOW",
      bypassed: true,
      reason: `AION API unreachable: ${error.message}. Falling back to trust gates.`,
      error: error.message,
    };
  }
}

// Map AION response to Buzz action (frozen interface — 3 states)
function mapDecision(wgResponse) {
  const map = {
    ALLOW: "PROCEED",
    WARN: "WAR_ROOM_REVIEW",
    BLOCK: "STOP",
  };
  return {
    action: map[wgResponse.decision] || "WAR_ROOM_REVIEW",
    decision: wgResponse.decision,
    reasoning: wgResponse.reasoning,
    consequence: wgResponse.consequence,
    riskLevel: wgResponse.riskLevel,
    reasonCode: wgResponse.reasonCode,
    ruleHits: wgResponse.ruleHits || [],
    recommendedAction: wgResponse.recommendedAction,
    receipt: wgResponse.receipt,
  };
}

module.exports = { evaluate, mapDecision };
