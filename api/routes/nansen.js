/**
 * Nansen CLI Routes — Intel Source #17
 * GET /api/v1/nansen/smart-money
 * GET /api/v1/nansen/token/:address
 * GET /api/v1/nansen/wallet/:address
 * POST /api/v1/nansen/enrich
 * GET /api/v1/nansen/stats
 */
const express = require("express");
const router = express.Router();
const nansen = require("../services/nansen-enrichment");

router.get("/smart-money", async (req, res) => {
  const chain = req.query.chain || "solana";
  const result = await nansen.getSmartMoney(chain);
  res.json(result);
});

router.get("/token/:address", async (req, res) => {
  const chain = req.query.chain || "solana";
  const result = await nansen.getTokenHolders(req.params.address, chain);
  res.json(result);
});

router.get("/wallet/:address", async (req, res) => {
  const chain = req.query.chain || "solana";
  const result = await nansen.getWalletProfile(req.params.address, chain);
  res.json(result);
});

router.post("/enrich", async (req, res) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: "address required" });
  const result = await nansen.enrichToken(address, chain || "solana");
  if (result.error) return res.status(503).json(result);
  res.json(result);
});

router.get("/stats", (req, res) => {
  const { getDB } = require("../db");
  const db = getDB();
  const stats = db
    .prepare(
      "SELECT COUNT(*) as total, COUNT(CASE WHEN enriched_at > datetime(\'now\', \'-24 hours\') THEN 1 END) as last_24h, AVG(smart_money_count) as avg_smart_money, MAX(enriched_at) as last_enrichment FROM nansen_enrichments",
    )
    .get();
  const status = nansen.getStatus();
  res.json({ ...stats, ...status });
});

module.exports = router;
