const express = require("express");
const router = express.Router();
const Database = require("better-sqlite3");
const DB_PATH = "/data/buzz-api/buzz.db";

// GET /api/v1/bags/tokens — list bags tokens with metadata
router.get("/tokens", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || null;
    const withMeta = req.query.withMetadata === "true";
    let sql = "SELECT * FROM bags_tokens";
    let conditions = [];
    let params = [];
    if (status) { conditions.push("status = ?"); params.push(status); }
    if (withMeta) { conditions.push("name IS NOT NULL"); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY scanned_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    var rows = db.prepare(sql).all(...params);
    var total = db.prepare("SELECT COUNT(*) as c FROM bags_tokens" + (conditions.length ? " WHERE " + conditions.join(" AND ") : "")).all(...(status ? [status] : []));
    db.close();
    res.json({ success: true, count: rows.length, total: total[0].c, response: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/bags/tokens/:mint — get single token
router.get("/tokens/:mint", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    var row = db.prepare("SELECT * FROM bags_tokens WHERE token_mint = ?").get(req.params.mint);
    db.close();
    if (!row) return res.status(404).json({ success: false, error: "Token not found" });
    res.json({ success: true, response: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/bags/stats — scan stats
router.get("/stats", (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    var stats = db.prepare("SELECT COUNT(*) as total, COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as with_metadata, COUNT(CASE WHEN twitter IS NOT NULL THEN 1 END) as with_twitter, COUNT(CASE WHEN status = 'PRE_GRAD' THEN 1 END) as pre_grad, MAX(scanned_at) as last_scan FROM bags_tokens").get();
    db.close();
    res.json({ success: true, response: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/bags/scan — trigger manual scan
router.post("/scan", async (req, res) => {
  try {
    var scanner = require("../services/bags-scanner");
    var result = await scanner.scanBagsPools();
    res.json({ success: true, response: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
