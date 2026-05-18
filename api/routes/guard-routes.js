// Wallet Guard API routes — receipts + stats
const express = require("express");
const router = express.Router();
const { apiKeyAuth } = require("../middleware/auth");
const { getDB } = require("../db");

router.use(apiKeyAuth);

// GET /api/v1/guard/receipts — recent receipts
router.get("/receipts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const receipts = getDB()
    .prepare(
      "SELECT * FROM wallet_guard_receipts ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit);
  res.json({ receipts, count: receipts.length });
});

// GET /api/v1/guard/stats — aggregate stats
router.get("/stats", (req, res) => {
  const stats = getDB()
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN decision = 'ALLOW' THEN 1 ELSE 0 END) as allowed,
      SUM(CASE WHEN decision = 'WARN' THEN 1 ELSE 0 END) as warned,
      SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked
    FROM wallet_guard_receipts
  `,
    )
    .get();
  res.json(stats);
});

// POST /api/v1/guard/evaluate — manual evaluation (War Room trigger)
router.post("/evaluate", async (req, res) => {
  const { evaluate } = require("../services/guard/wallet-guard");
  const started = Date.now();
  const result = await evaluate(req.body);
  const dur = Date.now() - started;

  // Persist receipt (non-blocking — never fail the response on DB error)
  try {
    const r = result || {};
    const receipt = r.receipt || {};
    const ctx = req.body.context || {};
    getDB()
      .prepare(
        `INSERT INTO wallet_guard_receipts (
          request_id, decision, risk_level, reason_code, reasoning,
          receipt_hash, receipt_json, tx_fingerprint, policy_version,
          override_required, override_used,
          token_address, token_chain, buzz_score, sim_consensus, sim_ev,
          screening_class, counterfactual_summary, normalized, receipt_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        receipt.requestId || receipt.id || `evalreq_${Date.now()}`,
        r.decision || "UNKNOWN",
        r.riskLevel || r.risk_level || null,
        r.reasonCode || r.reason_code || null,
        r.reasoning || r.reason || null,
        receipt.hash || null,
        JSON.stringify(receipt),
        receipt.txFingerprint || receipt.tx_fingerprint || null,
        receipt.policyVersion || receipt.policy_version || null,
        receipt.overrideRequired || receipt.override_required ? 1 : 0,
        receipt.overrideUsed || receipt.override_used ? 1 : 0,
        req.body.target || ctx.token_address || null,
        req.body.chain || ctx.chain || null,
        req.body.buzz_score ?? ctx.buzz_score ?? null,
        req.body.sim_consensus ?? ctx.sim_consensus ?? null,
        ctx.sim_ev ?? null,
        ctx.screening_class || null,
        typeof (r.counterfactual_summary || r.counterfactualSummary) ===
          "object"
          ? JSON.stringify(r.counterfactual_summary || r.counterfactualSummary)
          : r.counterfactual_summary || r.counterfactualSummary || null,
        typeof r.normalized === "object"
          ? JSON.stringify(r.normalized)
          : r.normalized || null,
        r.receipt_path || r.receiptPath || receipt.path || null,
      );
  } catch (err) {
    console.warn("[guard] receipt persist failed:", err.message);
  }

  // Realtime War Room logging for Aldo demo (toggle via GUARD_DEMO_MODE=1)
  if (process.env.GUARD_DEMO_MODE === "1") {
    try {
      const { sendTelegram } = require("../lib/telegram-notify");
      const icon =
        result.decision === "ALLOW"
          ? "✅"
          : result.decision === "WARN"
            ? "⚠️"
            : result.decision === "BLOCK"
              ? "🛑"
              : "❓";
      const cfPreview =
        result.counterfactual_summary || result.counterfactualSummary;
      const msg =
        `${icon} *Wallet Guard ${result.decision}* (${dur}ms)\n` +
        `action: \`${req.body.action || req.body.type || "—"}\`\n` +
        `target: \`${(req.body.target || "—").toString().slice(0, 64)}\`\n` +
        `reason: ${result.reason || result.reasoning || "—"}\n` +
        (result.receipt?.hash
          ? `receipt: \`${result.receipt.hash.slice(0, 16)}…\`\n`
          : result.bypassed
            ? `_bypassed: ${result.reason}_\n`
            : "") +
        (cfPreview ? `counterfactual: ${String(cfPreview).slice(0, 120)}` : "");
      sendTelegram(msg).catch(() => {});
    } catch (err) {
      console.warn("[guard] demo log failed:", err.message);
    }
  }

  res.json(result);
});

module.exports = router;
