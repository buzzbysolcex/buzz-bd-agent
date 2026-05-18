/**
 * WebSocket Status Routes
 * GET /api/v1/ws/okx/status
 * GET /api/v1/ws/helius/status
 */
const express = require("express");
const router = express.Router();

router.get("/okx/status", (req, res) => {
  try {
    const okxWs = require("../services/okx-websocket");
    const status = okxWs.getStatus();
    const { getDB } = require("../db");
    const db = getDB();
    const tickerCount = db
      .prepare("SELECT COUNT(*) as count FROM okx_live_tickers")
      .get();
    const recentTicker = db
      .prepare(
        "SELECT inst_id, last_price, updated_at FROM okx_live_tickers ORDER BY updated_at DESC LIMIT 1",
      )
      .get();
    const btcTicker = db
      .prepare(
        "SELECT last_price, high_24h, low_24h, open_24h, vol_24h, updated_at FROM okx_live_tickers WHERE inst_id = 'BTC-USDT'",
      )
      .get();
    const ethTicker = db
      .prepare(
        "SELECT last_price FROM okx_live_tickers WHERE inst_id = 'ETH-USDT'",
      )
      .get();
    const solTicker = db
      .prepare(
        "SELECT last_price FROM okx_live_tickers WHERE inst_id = 'SOL-USDT'",
      )
      .get();
    res.json({
      ...status,
      tickersInDb: tickerCount?.count || 0,
      mostRecent: recentTicker || null,
      btcPrice: btcTicker?.last_price || 0,
      ethPrice: ethTicker?.last_price || 0,
      solPrice: solTicker?.last_price || 0,
      btcTicker: btcTicker || null,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

router.get("/helius/status", (req, res) => {
  try {
    const heliusWs = require("../services/helius-websocket");
    const status = heliusWs.getStatus();
    const { getDB } = require("../db");
    const db = getDB();
    const eventCount = db
      .prepare("SELECT COUNT(*) as count FROM helius_events")
      .get();
    const recentEvent = db
      .prepare(
        "SELECT event_type, slot, created_at FROM helius_events ORDER BY created_at DESC LIMIT 1",
      )
      .get();
    res.json({
      ...status,
      eventsInDb: eventCount?.count || 0,
      mostRecent: recentEvent || null,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

module.exports = router;
