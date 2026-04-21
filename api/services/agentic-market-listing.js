/**
 * agentic-market-listing.js — Service catalog metadata for Agentic.Market
 * Block 12 — Track C Apr 21 2026
 *
 * Companion layer to x402Paywall middleware. Provides the discovery-side
 * metadata that Agentic.Market auto-indexer consumes on first self-call.
 *
 * Does NOT wrap or replace x402Paywall — the payment flow is unchanged.
 * This module exposes:
 *   - Service catalog object (title, description, tags, pricing, schema)
 *   - getListing(serviceId): lookup function
 *   - recordAutoIndex(serviceId, url): mark when Agentic.Market picked up
 *   - listActive(): return all active listings for /services-catalog endpoint
 *
 * Buzz BD Agent | Agentic.Market | Base L2
 */

const { getDB } = require("../db");

// ── Static catalog (the SOURCE of service metadata) ──────────────

const CATALOG = {
  // First listing — simplest x402 endpoint, DB-only dependencies
  "premium-pipeline-v1": {
    service_id: "premium-pipeline-v1",
    endpoint_path: "/api/v1/premium/pipeline",
    endpoint_url: "https://api.buzzbd.ai/api/v1/premium/pipeline",
    title: "Hot Token Pipeline",
    description:
      "Real-time feed of tokens scoring ≥85 on Buzz's 100-point composite across 36 intel sources. Returns contract, ticker, chain, score, stage, and last-update timestamp. No accounts, no API keys, x402 payment only.",
    tags: ["pipeline", "scoring", "token-intelligence", "base", "x402"],
    price_usdc: 0.01,
    chain: "base",
    chain_id: 8453,
    payment_token: "USDC",
    payment_token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    response_schema: {
      type: "object",
      required: ["success", "count", "pipeline"],
      properties: {
        success: { type: "boolean" },
        count: { type: "integer" },
        pipeline: {
          type: "array",
          items: {
            type: "object",
            required: ["address", "ticker", "chain", "score"],
            properties: {
              address: { type: "string" },
              ticker: { type: "string" },
              name: { type: "string" },
              chain: { type: "string" },
              score: { type: "integer", minimum: 85, maximum: 100 },
              stage: { type: "string" },
              source: { type: "string" },
              updated_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    auth_model: "x402-only",
    admin_key_bypass: true,
    rate_limit: "per-call paid (no rate limit)",
    provider: "Buzz BD Agent (SolCex)",
    provider_wallet:
      process.env.ACP_OWNER_ADDRESS ||
      "0x2Dc03124091104E7798C0273D96FC5ED65F05aA9",
  },
};

// ── Listing table helpers ────────────────────────────────────────

function getListing(serviceId) {
  return CATALOG[serviceId] || null;
}

function listActive() {
  const db = getDB();
  try {
    const rows = db
      .prepare(
        `SELECT service_id, endpoint_path, endpoint_url, title, description,
                tags, price_usdc, chain, response_schema, auto_indexed_at, active
         FROM agentic_market_listings WHERE active = 1`,
      )
      .all();
    return rows.map((r) => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
      response_schema: r.response_schema ? JSON.parse(r.response_schema) : null,
    }));
  } catch {
    return [];
  }
}

function upsertListing(serviceId) {
  const entry = CATALOG[serviceId];
  if (!entry) return false;
  const db = getDB();
  try {
    db.prepare(
      `INSERT OR REPLACE INTO agentic_market_listings
         (service_id, endpoint_path, endpoint_url, title, description,
          tags, price_usdc, chain, response_schema, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ).run(
      entry.service_id,
      entry.endpoint_path,
      entry.endpoint_url,
      entry.title,
      entry.description,
      JSON.stringify(entry.tags),
      entry.price_usdc,
      entry.chain,
      JSON.stringify(entry.response_schema),
    );
    return true;
  } catch (err) {
    console.warn(`[agentic-market] upsertListing failed: ${err.message}`);
    return false;
  }
}

function recordAutoIndex(serviceId, listingUrl) {
  const db = getDB();
  try {
    db.prepare(
      `UPDATE agentic_market_listings
         SET auto_indexed_at = datetime('now'),
             listing_url = ?
       WHERE service_id = ?`,
    ).run(listingUrl, serviceId);
    return true;
  } catch (err) {
    console.warn(`[agentic-market] recordAutoIndex failed: ${err.message}`);
    return false;
  }
}

module.exports = {
  CATALOG,
  getListing,
  listActive,
  upsertListing,
  recordAutoIndex,
};
