/**
 * CoinGecko Routes — Intel Source #23 (REST API v3)
 * 6 endpoints for price, trending, history, markets, search, status
 */
const express = require("express");
const router = express.Router();
const cg = require("../services/coingecko-cli");

router.get("/price/:coinId", async (req, res) => {
  const result = await cg.getPrice(req.params.coinId);
  res.json({ source: "coingecko-rest", intel: 23, ...result });
});

router.get("/trending", async (req, res) => {
  const result = await cg.getTrending();
  res.json({ source: "coingecko-rest", intel: 23, ...result });
});

router.get("/history/:coinId", async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const result = await cg.getHistory(req.params.coinId, days);
  res.json({ source: "coingecko-rest", intel: 23, ...result });
});

router.get("/markets", async (req, res) => {
  const total = parseInt(req.query.total) || 100;
  const result = await cg.getMarkets(total);
  res.json({ source: "coingecko-rest", intel: 23, ...result });
});

router.get("/search/:query", async (req, res) => {
  const result = await cg.searchCoin(req.params.query);
  res.json({ source: "coingecko-rest", intel: 23, ...result });
});

router.get("/status", (req, res) => {
  res.json(cg.getStatus());
});

module.exports = router;
