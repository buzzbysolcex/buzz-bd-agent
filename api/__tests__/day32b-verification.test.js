/**
 * Day 32B Data Hardening — Verification Integration Tests
 * 15 tests covering triple verification, quarantine, and gates
 */

const Database = require("better-sqlite3");

let db;

function runMigrations(db) {
  // Base tables
  db.exec(`CREATE TABLE IF NOT EXISTS pipeline_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT NOT NULL, chain TEXT NOT NULL DEFAULT 'solana',
    ticker TEXT, name TEXT, stage TEXT DEFAULT 'discovered', score INTEGER, source TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), UNIQUE(address, chain)
  )`);

  // Day 32B verification tables
  require("../migrations/014-verification-layer").up(db);
}

jest.mock("../db", () => {
  let testDb;
  return {
    getDB: () => testDb,
    setTestDB: (d) => {
      testDb = d;
    },
    initDB: async () => {},
  };
});

// Mock fetch for DexScreener/CoinGecko
const mockFetchResponses = {};
global.fetch = jest.fn((url) => {
  const key = Object.keys(mockFetchResponses).find((k) => url.includes(k));
  if (key && mockFetchResponses[key]) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockFetchResponses[key]),
    });
  }
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: "not found" }),
  });
});

beforeAll(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  const { setTestDB } = require("../db");
  setTestDB(db);
  runMigrations(db);
});

afterAll(() => {
  db.close();
});

afterEach(() => {
  Object.keys(mockFetchResponses).forEach((k) => delete mockFetchResponses[k]);
});

const verifier = require("../lib/data-verifier");
const rules = require("../lib/verification-rules");

// ═══════ Test 1: VERIFIED for known good token ═══════
test("verifyToken returns VERIFIED when all checks pass", async () => {
  const goodAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

  mockFetchResponses["dex/tokens/EPjFWdd5"] = {
    pairs: [
      {
        chainId: "solana",
        baseToken: { name: "USD Coin", symbol: "USDC", address: goodAddress },
        marketCap: 2000000000,
        liquidity: { usd: 500000000 },
        priceUsd: "1.00",
        volume: { h24: 100000000 },
        dexId: "orca",
        pairCreatedAt: Date.now() - 365 * 86400000,
        pairAddress: "abc123",
        url: "https://dexscreener.com/solana/abc123",
      },
    ],
  };
  mockFetchResponses["contract/EPjFWdd5"] = {
    name: "USD Coin",
    symbol: "usdc",
    id: "usd-coin",
    market_data: {
      market_cap: { usd: 2100000000 },
      total_volume: { usd: 90000000 },
    },
  };

  const result = await verifier.verifyToken(goodAddress, "solana");
  expect(result.overall).toBe("VERIFIED");
  expect(result.check1_dexscreener.pass).toBe(true);
  expect(result.check2_crossref.pass).toBe(true);
  expect(result.check3_consistency.pass).toBe(true);
});

// ═══════ Test 2: QUARANTINED when name mismatch ═══════
test("verifyToken returns QUARANTINED when name mismatches between sources", async () => {
  const addr = "FakeAddr1111111111111111111111111111111111";

  mockFetchResponses["dex/tokens/FakeAddr"] = {
    pairs: [
      {
        chainId: "solana",
        baseToken: { name: "Pygmy Hippo", symbol: "HIPPO", address: addr },
        marketCap: 424000000,
        liquidity: { usd: 17000000 },
        priceUsd: "0.0004",
        dexId: "orca",
        pairCreatedAt: Date.now() - 30 * 86400000,
        pairAddress: "pair1",
      },
    ],
  };
  mockFetchResponses["contract/FakeAddr"] = {
    name: "Moo Deng",
    symbol: "moodeng",
    id: "moo-deng",
    market_data: { market_cap: { usd: 50000000 } },
  };

  const result = await verifier.verifyToken(addr, "solana");
  expect(result.overall).toBe("QUARANTINED");
  expect(result.mismatches.some((m) => m.includes("NAME_MISMATCH"))).toBe(true);
});

// ═══════ Test 3: QUARANTINED when mcap diverges >20% ═══════
test("verifyToken returns QUARANTINED when mcap differs >20% between sources", async () => {
  const addr = "McapTest11111111111111111111111111111111111";

  mockFetchResponses["dex/tokens/McapTest"] = {
    pairs: [
      {
        chainId: "solana",
        baseToken: { name: "TestToken", symbol: "TEST", address: addr },
        marketCap: 100000000,
        liquidity: { usd: 5000000 },
        priceUsd: "1.00",
        dexId: "orca",
        pairCreatedAt: Date.now() - 90 * 86400000,
        pairAddress: "pair2",
      },
    ],
  };
  mockFetchResponses["contract/McapTest"] = {
    name: "TestToken",
    symbol: "test",
    id: "test-token",
    market_data: { market_cap: { usd: 50000000 } }, // 50% off
  };

  const result = await verifier.verifyToken(addr, "solana");
  expect(result.overall).toBe("QUARANTINED");
  expect(result.mismatches.some((m) => m.includes("MCAP_DIVERGENCE"))).toBe(
    true,
  );
});

// ═══════ Test 4: UNVERIFIED when CoinGecko missing ═══════
test("verifyToken returns UNVERIFIED when CoinGecko has no data", async () => {
  const addr = "NoGecko111111111111111111111111111111111111";

  mockFetchResponses["dex/tokens/NoGecko"] = {
    pairs: [
      {
        chainId: "solana",
        baseToken: { name: "NewCoin", symbol: "NEW", address: addr },
        marketCap: 500000,
        liquidity: { usd: 50000 },
        priceUsd: "0.01",
        dexId: "raydium",
        pairCreatedAt: Date.now() - 7 * 86400000,
        pairAddress: "pair3",
      },
    ],
  };
  // No CoinGecko response (will return ok:false from mock)

  const result = await verifier.verifyToken(addr, "solana");
  expect(result.overall).toBe("UNVERIFIED");
  expect(result.check2_crossref.pass).toBe(false);
});

// ═══════ Test 5: QUARANTINED when contract format wrong ═══════
test("verifyToken flags invalid contract format for chain", async () => {
  const addr = "0xinvalidsolanaaddress";

  const result = await verifier.verifyToken(addr, "solana");
  expect(result.check3_consistency.pass).toBe(false);
  expect(
    result.check3_consistency.warnings.some((w) =>
      w.includes("CONTRACT_FORMAT_INVALID"),
    ),
  ).toBe(true);
});

// ═══════ Test 6: Pump.fun detection ═══════
test("isPumpFun detects pump.fun tokens", () => {
  expect(
    verifier.isPumpFun("EUfRMccYw5E8Jv7NFmcpgKVFABqTr3QVputRQrbZpump"),
  ).toBe(true);
  expect(
    verifier.isPumpFun("2FcsqRrhvgSfYxJWh32xW873vyqBZ9jmMyXqYSPgNtuZ"),
  ).toBe(false);
  expect(
    verifier.isPumpFun("FZvhhggPbBn5j1CiSRUvy4iD9cENpWdWtAFF9KAupump"),
  ).toBe(true);
});

// ═══════ Test 7: Verification gate blocks unverified ═══════
test("requireVerified middleware blocks unverified token", () => {
  const { requireVerified } = require("../middleware/verification-gate");
  const req = {
    body: {
      token_address: "UnverifiedAddr1111111111111111111111111",
      chain: "solana",
    },
    query: {},
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  requireVerified(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(422);
});

// ═══════ Test 8: Quarantined token blocked by gate ═══════
test("requireVerified blocks quarantined tokens", () => {
  // Insert quarantine record
  db.prepare(
    "INSERT INTO quarantined_tokens (contract_address, chain, reason, quarantined_at) VALUES (?, ?, ?, datetime('now'))",
  ).run("QuarantinedAddr111111111111111111111111", "solana", "test quarantine");

  const { requireVerified } = require("../middleware/verification-gate");
  const req = {
    body: {
      token_address: "QuarantinedAddr111111111111111111111111",
      chain: "solana",
    },
    query: {},
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  requireVerified(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ error: "TOKEN_QUARANTINED" }),
  );
});

// ═══════ Test 9: Stale data detection ═══════
test("isDataStale correctly identifies old data", () => {
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
  const fiveMinAgo = new Date(Date.now() - 300000).toISOString();

  expect(rules.isDataStale(twoHoursAgo)).toBe(true);
  expect(rules.isDataStale(fiveMinAgo)).toBe(false);
  expect(rules.isDataStale(null)).toBe(true);
});

// ═══════ Test 10: Audit trail records attempts ═══════
test("verification log records every attempt", async () => {
  const countBefore = db
    .prepare("SELECT COUNT(*) as c FROM verification_log")
    .get().c;

  // This will fail (no mock set up) but should still log
  await verifier.verifyToken(
    "AuditTest111111111111111111111111111111111",
    "solana",
  );

  const countAfter = db
    .prepare("SELECT COUNT(*) as c FROM verification_log")
    .get().c;
  expect(countAfter).toBeGreaterThan(countBefore);
});

// ═══════ Test 11: Verified snapshot expires ═══════
test("verified snapshot expires after max age", () => {
  // Use SQLite-compatible datetime format (no T, no Z)
  const expiredAt = new Date(Date.now() - 3600000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
  const verifiedAt = new Date(Date.now() - 7200000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  db.prepare(
    `
    INSERT OR REPLACE INTO verified_snapshots (contract_address, chain, token_name, token_symbol, mcap, liquidity, verified_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "ExpiredAddr1111111111111111111111111111111",
    "solana",
    "Old Token",
    "OLD",
    1000,
    500,
    verifiedAt,
    expiredAt,
  );

  const result = verifier.isVerified(
    "ExpiredAddr1111111111111111111111111111111",
    "solana",
  );
  expect(result.verified).toBe(false);
});

// ═══════ Test 12: Cross-reference catches name mismatch ═══════
test("internal consistency catches name mismatch between DexScreener and CoinGecko", async () => {
  const dexData = {
    pass: true,
    data: { name: "Pygmy Hippo", mcap: 424000000 },
    warnings: [],
  };
  const cgData = {
    pass: true,
    data: { name: "Moo Deng", mcap: 50000000 },
    warnings: [],
  };

  // Use valid Solana base58 address to avoid early return on format check
  const validAddr = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const result = await verifier.verifyInternalConsistency(
    validAddr,
    "solana",
    dexData,
    cgData,
  );
  expect(result.pass).toBe(false);
  expect(result.warnings.some((w) => w.includes("NAME_MISMATCH"))).toBe(true);
});

// ═══════ Test 13: Chain format validation ═══════
test("contract format validation works per chain", () => {
  expect(
    rules.validateContractFormat(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "solana",
    ).valid,
  ).toBe(true);
  expect(
    rules.validateContractFormat(
      "0x1234567890abcdef1234567890abcdef12345678",
      "base",
    ).valid,
  ).toBe(true);
  expect(rules.validateContractFormat("0xinvalid", "base").valid).toBe(false);
  expect(
    rules.validateContractFormat("EPjFWdd5AufqSSqeM2qN", "ethereum").valid,
  ).toBe(false);
});

// ═══════ Test 14: Quarantine resolution ═══════
test("resolveQuarantine marks token as resolved", () => {
  db.prepare(
    "INSERT OR REPLACE INTO quarantined_tokens (contract_address, chain, reason, quarantined_at) VALUES (?, ?, ?, datetime('now'))",
  ).run("ResolveMe11111111111111111111111111111111", "solana", "test");

  verifier.resolveQuarantine(
    "ResolveMe11111111111111111111111111111111",
    "solana",
    "ogie",
  );

  const q = db
    .prepare("SELECT * FROM quarantined_tokens WHERE contract_address = ?")
    .get("ResolveMe11111111111111111111111111111111");
  expect(q.resolved_at).not.toBeNull();
  expect(q.resolved_by).toBe("ogie");
});

// ═══════ Test 15: Verification stats ═══════
test("getVerificationStats returns correct counts", () => {
  const stats = verifier.getVerificationStats();
  expect(stats.total_checks).toBeGreaterThan(0);
  expect(typeof stats.pass_rate).toBe("number");
  expect(stats).toHaveProperty("verified");
  expect(stats).toHaveProperty("quarantined");
  expect(stats).toHaveProperty("active_quarantines");
});
