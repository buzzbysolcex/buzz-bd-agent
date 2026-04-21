/**
 * Mining Intel Routes — 15 endpoints
 * Network-level + Pool-level + Intelligence layer
 * Feature flag: MINING_INTEL
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../../db");
const { feature } = require("../../lib/feature-flags");
const { runFullCollection } = require("./mining-collector");

router.use((req, res, next) => {
  if (!feature("MINING_INTEL")) {
    return res.status(503).json({ error: "MINING_INTEL disabled" });
  }
  next();
});

// GET /api/v1/mining/snapshot — latest network snapshot
router.get("/snapshot", (req, res) => {
  try {
    const db = getDB();
    const snap = db
      .prepare("SELECT * FROM mining_snapshots ORDER BY id DESC LIMIT 1")
      .get();
    res.json(
      snap || { error: "No snapshots yet. Run POST /mining/collect first." },
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/snapshots — history
router.get("/snapshots", (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const snaps = db
      .prepare("SELECT * FROM mining_snapshots ORDER BY id DESC LIMIT ?")
      .all(limit);
    res.json({ snapshots: snaps, count: snaps.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/difficulty — current + next retarget
router.get("/difficulty", (req, res) => {
  try {
    const db = getDB();
    const snap = db
      .prepare(
        "SELECT difficulty, next_retarget_change, blocks_since_retarget, hashrate_eh FROM mining_snapshots ORDER BY id DESC LIMIT 1",
      )
      .get();
    const log = db
      .prepare("SELECT * FROM mining_difficulty_log ORDER BY id DESC LIMIT 5")
      .all();
    res.json({ current: snap, history: log });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/hashprice
router.get("/hashprice", (req, res) => {
  try {
    const db = getDB();
    const snap = db
      .prepare(
        "SELECT hashprice_usd, btc_price_usd, hashrate_eh, avg_block_reward, avg_block_fees, timestamp FROM mining_snapshots ORDER BY id DESC LIMIT 1",
      )
      .get();
    res.json(snap || { error: "No data" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/fees
router.get("/fees", (req, res) => {
  try {
    const db = getDB();
    const snap = db
      .prepare(
        "SELECT fee_rate_fast, fee_rate_medium, fee_rate_slow, mempool_tx_count, mempool_vsize_mb, timestamp FROM mining_snapshots ORDER BY id DESC LIMIT 1",
      )
      .get();
    res.json(snap || { error: "No data" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/pools — all pools with health scores
router.get("/pools", (req, res) => {
  try {
    const db = getDB();
    const pools = db
      .prepare(
        `
      SELECT * FROM mining_pools
      WHERE timestamp = (SELECT MAX(timestamp) FROM mining_pools)
      ORDER BY pool_health_score DESC
    `,
      )
      .all();
    res.json({ pools, count: pools.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/pool/:slug — single pool detail + history
router.get("/pool/:slug", (req, res) => {
  try {
    const db = getDB();
    const latest = db
      .prepare(
        `
      SELECT * FROM mining_pools WHERE slug = ? ORDER BY id DESC LIMIT 1
    `,
      )
      .get(req.params.slug);
    const history = db
      .prepare(
        `
      SELECT * FROM mining_pool_history WHERE slug = ? ORDER BY date DESC LIMIT 30
    `,
      )
      .all(req.params.slug);
    if (!latest) return res.status(404).json({ error: "Pool not found" });
    res.json({ pool: latest, history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/pool/:slug/score — health score breakdown
router.get("/pool/:slug/score", (req, res) => {
  try {
    const db = getDB();
    const pool = db
      .prepare(
        "SELECT * FROM mining_pools WHERE slug = ? ORDER BY id DESC LIMIT 1",
      )
      .get(req.params.slug);
    if (!pool) return res.status(404).json({ error: "Pool not found" });

    const breakdown = {
      total: pool.pool_health_score,
      tier: pool.pool_tier,
      components: {
        hashrate_share: { value: pool.hashrate_share, max: 30 },
        share_velocity: { value: pool.share_velocity, max: 20 },
        fee_efficiency: { value: pool.fee_efficiency, max: 20 },
        block_fullness: { empty_rate: pool.empty_block_rate, max: 15 },
        consistency: {
          blocks_24h: pool.block_count_24h,
          expected: Math.round((pool.hashrate_share || 0) * 144),
          max: 15,
        },
      },
      sentiment: pool.sentiment,
      sentiment_reason: pool.sentiment_reason,
    };
    res.json(breakdown);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/leaderboard — pools ranked by health score
router.get("/leaderboard", (req, res) => {
  try {
    const db = getDB();
    const pools = db
      .prepare(
        `
      SELECT slug, name, pool_health_score, pool_tier, hashrate_share, share_velocity, sentiment, block_count_1w
      FROM mining_pools
      WHERE timestamp = (SELECT MAX(timestamp) FROM mining_pools)
      ORDER BY pool_health_score DESC
    `,
      )
      .all();
    res.json({
      leaderboard: pools.map((p, i) => ({ rank: i + 1, ...p })),
      count: pools.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/sentiment — Mining Sentiment Index
router.get("/sentiment", (req, res) => {
  try {
    const db = getDB();
    const snap = db
      .prepare(
        "SELECT mining_sentiment_index, mining_sentiment_label, total_pools_tracked, timestamp FROM mining_snapshots ORDER BY id DESC LIMIT 1",
      )
      .get();
    const pools = db
      .prepare(
        `
      SELECT slug, sentiment, share_velocity FROM mining_pools
      WHERE timestamp = (SELECT MAX(timestamp) FROM mining_pools)
    `,
      )
      .all();
    res.json({
      index: snap?.mining_sentiment_index || 0,
      label: snap?.mining_sentiment_label || "UNKNOWN",
      pools_tracked: snap?.total_pools_tracked || 0,
      pool_sentiments: pools,
      updated: snap?.timestamp,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/concentration — HHI + centralization
router.get("/concentration", (req, res) => {
  try {
    const db = getDB();
    const pools = db
      .prepare(
        `
      SELECT slug, name, hashrate_share FROM mining_pools
      WHERE timestamp = (SELECT MAX(timestamp) FROM mining_pools)
      ORDER BY hashrate_share DESC
    `,
      )
      .all();

    const hhi = pools.reduce(
      (sum, p) => sum + Math.pow((p.hashrate_share || 0) * 100, 2),
      0,
    );
    const top1 = pools[0]?.hashrate_share || 0;
    const top3 = pools
      .slice(0, 3)
      .reduce((s, p) => s + (p.hashrate_share || 0), 0);

    res.json({
      hhi: Math.round(hhi),
      hhi_level: hhi > 2500 ? "HIGH" : hhi > 1500 ? "MODERATE" : "LOW",
      top1_share: top1,
      top3_share: top3,
      alert: top1 > 0.3 || top3 > 0.6,
      pools: pools.map((p) => ({
        slug: p.slug,
        name: p.name,
        share: p.hashrate_share,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/signals — generated signal drafts
router.get("/signals", (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const signals = db
      .prepare("SELECT * FROM mining_signals ORDER BY id DESC LIMIT ?")
      .all(limit);
    res.json({ signals, count: signals.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/mining/dashboard — full dashboard
router.get("/dashboard", (req, res) => {
  try {
    const db = getDB();
    const snapshot = db
      .prepare("SELECT * FROM mining_snapshots ORDER BY id DESC LIMIT 1")
      .get();
    const pools = db
      .prepare(
        `
      SELECT * FROM mining_pools
      WHERE timestamp = (SELECT MAX(timestamp) FROM mining_pools)
      ORDER BY pool_health_score DESC
    `,
      )
      .all();
    const signals = db
      .prepare("SELECT * FROM mining_signals ORDER BY id DESC LIMIT 5")
      .all();

    res.json({
      network: snapshot || {},
      pools: { data: pools, count: pools.length },
      sentiment: {
        index: snapshot?.mining_sentiment_index || 0,
        label: snapshot?.mining_sentiment_label || "UNKNOWN",
      },
      recent_signals: signals,
      updated: snapshot?.timestamp,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/mining/collect — manual trigger
router.post("/collect", async (req, res) => {
  try {
    const result = await runFullCollection();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/mining/analyze — manual trigger analysis
router.post("/analyze", (req, res) => {
  res.json({
    message:
      "Phase 2 — signal analysis not yet implemented. Flip MINING_SIGNALS after 24h data.",
  });
});

module.exports = router;
