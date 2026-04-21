/**
 * Migration 029: agentic_market_listings
 * Block 12 — Track C Apr 21 2026
 *
 * Table for tracking services listed on Agentic.Market.
 * Companion to x402_payments (payment side) and existing premium routes.
 */

const { getDB } = require("../db");

async function up() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS agentic_market_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT UNIQUE NOT NULL,
      endpoint_path TEXT NOT NULL,
      endpoint_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      tags TEXT,
      price_usdc REAL NOT NULL,
      chain TEXT DEFAULT 'base',
      response_schema TEXT,
      auto_indexed_at TEXT,
      listing_url TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agentic_market_listings_service_id
      ON agentic_market_listings(service_id);

    CREATE INDEX IF NOT EXISTS idx_agentic_market_listings_active
      ON agentic_market_listings(active);
  `);

  console.log(
    "[migration 029] agentic_market_listings table + 2 indexes created",
  );
}

async function down() {
  const db = getDB();
  db.exec(`DROP TABLE IF EXISTS agentic_market_listings`);
}

module.exports = { up, down };

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
