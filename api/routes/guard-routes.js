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
      const dur = Date.now() - started;
      const msg =
        `${icon} *Wallet Guard ${result.decision}* (${dur}ms)\n` +
        `action: \`${req.body.action || req.body.type || "—"}\`\n` +
        `target: \`${(req.body.target || "—").toString().slice(0, 64)}\`\n` +
        `reason: ${result.reason || result.reasoning || "—"}\n` +
        (result.receipt?.hash
          ? `receipt: \`${result.receipt.hash.slice(0, 16)}…\``
          : result.bypassed
            ? `_bypassed: ${result.reason}_`
            : "");
      sendTelegram(msg).catch(() => {});
    } catch (err) {
      console.warn("[guard] demo log failed:", err.message);
    }
  }

  res.json(result);
});

module.exports = router;
