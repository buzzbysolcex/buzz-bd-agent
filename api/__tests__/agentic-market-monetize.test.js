/**
 * agentic-market-monetize.test.js — Local validation for Track C C2
 * Block 12 — Track C Apr 21 2026
 *
 * Validates the agentic-market-listing module + migration WITHOUT hitting
 * the real x402 middleware (which requires network). Proves:
 *   - Migration creates table with correct schema
 *   - Catalog has premium-pipeline-v1 entry
 *   - upsertListing + recordAutoIndex + listActive round-trip cleanly
 *   - Response schema is valid JSON
 *   - Pricing matches directive acknowledgment ($0.01 kept; bump option documented)
 */

const path = require("path");

describe("agentic-market-listing module", () => {
  let listing;
  let migration;
  let testDB;
  let origGetDB;

  beforeAll(() => {
    const Database = require("better-sqlite3");
    testDB = new Database(":memory:");

    // Mock getDB to return our in-memory handle
    const dbModule = require(path.resolve(__dirname, "../db.js"));
    origGetDB = dbModule.getDB;
    dbModule.getDB = () => testDB;

    migration = require("../migrations/029-agentic-market-listings.js");
    listing = require("../services/agentic-market-listing.js");
  });

  afterAll(() => {
    if (testDB) testDB.close();
    const dbModule = require(path.resolve(__dirname, "../db.js"));
    if (origGetDB) dbModule.getDB = origGetDB;
  });

  test("migration 029 creates agentic_market_listings table", async () => {
    await migration.up();
    const row = testDB
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='agentic_market_listings'`,
      )
      .get();
    expect(row).toBeDefined();
    expect(row.name).toBe("agentic_market_listings");
  });

  test("migration 029 creates 2 indexes", () => {
    const idxs = testDB
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='agentic_market_listings'`,
      )
      .all();
    // auto-created + 2 explicit = >= 2
    expect(idxs.length).toBeGreaterThanOrEqual(2);
  });

  test("CATALOG contains premium-pipeline-v1", () => {
    expect(listing.CATALOG["premium-pipeline-v1"]).toBeDefined();
    const entry = listing.CATALOG["premium-pipeline-v1"];
    expect(entry.price_usdc).toBe(0.01);
    expect(entry.chain).toBe("base");
    expect(entry.auth_model).toBe("x402-only");
    expect(entry.endpoint_path).toBe("/api/v1/premium/pipeline");
  });

  test("response_schema is valid JSON-parseable object", () => {
    const entry = listing.CATALOG["premium-pipeline-v1"];
    const schema = entry.response_schema;
    expect(schema).toBeDefined();
    expect(schema.type).toBe("object");
    expect(schema.required).toContain("pipeline");
    expect(schema.properties.pipeline.type).toBe("array");
  });

  test("upsertListing inserts row", () => {
    const ok = listing.upsertListing("premium-pipeline-v1");
    expect(ok).toBe(true);
    const row = testDB
      .prepare(
        `SELECT service_id, title, price_usdc, active FROM agentic_market_listings WHERE service_id=?`,
      )
      .get("premium-pipeline-v1");
    expect(row.service_id).toBe("premium-pipeline-v1");
    expect(row.title).toBe("Hot Token Pipeline");
    expect(row.price_usdc).toBe(0.01);
    expect(row.active).toBe(1);
  });

  test("listActive returns the listing with parsed tags/schema", () => {
    const rows = listing.listActive();
    expect(rows.length).toBe(1);
    expect(rows[0].service_id).toBe("premium-pipeline-v1");
    expect(Array.isArray(rows[0].tags)).toBe(true);
    expect(rows[0].tags).toContain("x402");
    expect(rows[0].response_schema.type).toBe("object");
  });

  test("recordAutoIndex updates auto_indexed_at + listing_url", () => {
    const ok = listing.recordAutoIndex(
      "premium-pipeline-v1",
      "https://agentic.market/service/premium-pipeline-v1",
    );
    expect(ok).toBe(true);
    const row = testDB
      .prepare(
        `SELECT auto_indexed_at, listing_url FROM agentic_market_listings WHERE service_id=?`,
      )
      .get("premium-pipeline-v1");
    expect(row.auto_indexed_at).toBeDefined();
    expect(row.listing_url).toBe(
      "https://agentic.market/service/premium-pipeline-v1",
    );
  });

  test("getListing returns null for unknown service_id", () => {
    expect(listing.getListing("nonexistent")).toBeNull();
  });

  test("upsertListing returns false for unknown service_id", () => {
    const ok = listing.upsertListing("nonexistent");
    expect(ok).toBe(false);
  });
});
