/**
 * Audit Request Endpoint — Public intake for paid audits
 * POST /request — public (no auth)
 * GET /requests — admin only (apiKeyAuth)
 *
 * HSaaS Pricing:
 *   Quick Scan    — $500
 *   Full Analysis — $1,500
 *   Swarm Audit   — $2,500
 *
 * Buzz BD Agent | SolCex Exchange
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { apiKeyAuth } = require("../middleware/auth");

// ─── Tier pricing map ────────────────────────────────
const TIER_PRICING = {
  quick_scan: 500,
  full_analysis: 1500,
  swarm_audit: 2500,
};

// ─── Create table on load ────────────────────────────
try {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE NOT NULL,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_twitter TEXT,
      tier TEXT NOT NULL CHECK(tier IN ('quick_scan', 'full_analysis', 'swarm_audit')),
      price INTEGER NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'received' CHECK(status IN (
        'received', 'reviewing', 'in_progress', 'completed', 'rejected', 'refunded'
      )),
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      score INTEGER,
      report_url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_requests(status);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_requests(created_at);
  `);
} catch (e) {
  console.error("[audit-request] Table init deferred:", e.message);
}

// ─── POST /request — Public audit intake ─────────────
router.post("/request", (req, res) => {
  try {
    const db = getDB();
    const {
      token_address,
      chain,
      contact_email,
      contact_twitter,
      tier,
      message,
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!token_address) missing.push("token_address");
    if (!chain) missing.push("chain");
    if (!contact_email) missing.push("contact_email");
    if (!tier) missing.push("tier");

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing,
        required: ["token_address", "chain", "contact_email", "tier"],
        tiers: Object.keys(TIER_PRICING),
      });
    }

    // Validate tier
    if (!TIER_PRICING[tier]) {
      return res.status(400).json({
        error: "Invalid tier",
        provided: tier,
        valid_tiers: {
          quick_scan: "$500 — 11-factor scoring + basic report",
          full_analysis: "$1,500 — Deep analysis + Monte Carlo simulation",
          swarm_audit:
            "$2,500 — 1,000-agent adversarial swarm + on-chain proof",
        },
      });
    }

    // Validate email format (basic)
    if (!contact_email.includes("@") || !contact_email.includes(".")) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Generate request ID
    const request_id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const price = TIER_PRICING[tier];

    // Insert
    db.prepare(
      `
      INSERT INTO audit_requests (request_id, token_address, chain, contact_email, contact_twitter, tier, price, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      request_id,
      token_address,
      chain,
      contact_email,
      contact_twitter || null,
      tier,
      price,
      message || null,
    );

    res.status(201).json({
      request_id,
      tier,
      price,
      status: "received",
      message: "Audit request received. We'll respond within 24h via email.",
      provider: "Buzz BD Agent | SolCex Exchange",
    });
  } catch (err) {
    console.error("[audit-request] Error:", err.message);
    res.status(500).json({ error: "Internal error", message: err.message });
  }
});

// ─── GET /requests — Admin-only list ─────────────────
router.get("/requests", apiKeyAuth, (req, res) => {
  try {
    const db = getDB();
    const { status, limit } = req.query;

    let sql = "SELECT * FROM audit_requests";
    const params = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    if (limit) {
      sql += " LIMIT ?";
      params.push(parseInt(limit) || 50);
    }

    const requests = db.prepare(sql).all(...params);

    res.json({
      count: requests.length,
      requests,
      revenue_potential: requests.reduce((sum, r) => sum + (r.price || 0), 0),
    });
  } catch (err) {
    console.error("[audit-request] Error:", err.message);
    res.status(500).json({ error: "Internal error", message: err.message });
  }
});

module.exports = router;
