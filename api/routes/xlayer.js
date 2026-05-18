/**
 * X Layer x402 Routes — BaaS Payment Layer
 * POST /api/v1/xlayer/score — x402 gated scoring
 * GET /api/v1/xlayer/quote — Price quote
 * GET /api/v1/xlayer/transactions — History
 * GET /api/v1/xlayer/verify/:txHash — Verify payment
 * GET /api/v1/xlayer/stats — Stats
 */
const express = require("express");
const router = express.Router();
const xlayer = require("../services/xlayer-x402");

router.post("/score", xlayer.x402Middleware, async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "address required" });

  const verification = await xlayer.verifyPayment(req.paymentTx);
  if (!verification.verified) {
    return res
      .status(402)
      .json({ error: "payment_not_verified", details: verification });
  }

  const result = await xlayer.runPaidScore(address, req.paymentTx);
  res.json({ payment_verified: true, tx_hash: req.paymentTx, score: result });
});

router.get("/quote", (req, res) => {
  res.json(xlayer.getQuote(req.query.service || "score-token"));
});

router.get("/transactions", (req, res) => {
  const { getDB } = require("../db");
  const db = getDB();
  const limit = parseInt(req.query.limit) || 50;
  const rows = db
    .prepare(
      "SELECT * FROM xlayer_transactions ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit);
  res.json({ count: rows.length, transactions: rows });
});

router.get("/verify/:txHash", async (req, res) => {
  const result = await xlayer.verifyPayment(req.params.txHash);
  res.json(result);
});

router.get("/stats", (req, res) => {
  const { getDB } = require("../db");
  const db = getDB();
  const stats = db
    .prepare(
      `
    SELECT COUNT(*) as total_tx, 
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(amount_usdc) as total_revenue,
      MAX(created_at) as last_tx
    FROM xlayer_transactions
  `,
    )
    .get();
  res.json({
    ...stats,
    chain: "xlayer",
    chain_id: xlayer.CHAIN_ID,
    wallet: xlayer.BUZZ_WALLET,
    price_per_score: 0.5,
  });
});

module.exports = router;
