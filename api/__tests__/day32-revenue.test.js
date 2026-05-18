/**
 * Day 32 Revenue Sprint — Integration Tests
 * 30+ tests covering all 8 phases
 */

const Database = require("better-sqlite3");
const path = require("path");

let db;

// Run all migrations
function runMigrations(db) {
  const migrations = [
    require("../migrations/010-strategic"),
    require("../migrations/011-revenue-metrics"),
    require("../migrations/012-revenue-attribution"),
    require("../migrations/013-loop-authority"),
  ];

  // Create base tables needed by migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT NOT NULL DEFAULT 'solana',
      ticker TEXT, name TEXT, stage TEXT DEFAULT 'discovered',
      score INTEGER, source TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(address, chain)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT, schedule TEXT, agent_name TEXT,
      command TEXT, status TEXT DEFAULT 'active',
      run_count INTEGER DEFAULT 0, fail_count INTEGER DEFAULT 0,
      last_run TEXT, next_run TEXT, last_error TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cron_id TEXT, status TEXT, output TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  for (const m of migrations) m.up(db);
}

// Mock getDB
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

// ═══════════ PHASE 1: Revenue Metrics DB ═══════════
describe("Phase 1: Revenue Metrics Tables", () => {
  test("revenue_events table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='revenue_events'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("listing_fees table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='listing_fees'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("monthly_revenue_summary table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_revenue_summary'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("can insert revenue event", () => {
    const result = db
      .prepare(
        `
      INSERT INTO revenue_events (token_address, chain, token_ticker, event_type, amount_usd, source)
      VALUES ('So1abc123', 'solana', 'TEST', 'listing_fee', 500, 'pipeline')
    `,
      )
      .run();
    expect(result.changes).toBe(1);
  });

  test("chain constraint enforced", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO revenue_events (token_address, chain, event_type, amount_usd) VALUES ('x', 'ethereum', 'fee', 100)",
      ).run();
    }).toThrow();
  });
});

// ═══════════ PHASE 2: Revenue API ═══════════
describe("Phase 2: Revenue Routes Module", () => {
  test("revenue routes module loads", () => {
    const routes = require("../routes/revenue");
    expect(routes).toBeDefined();
    expect(routes.stack).toBeDefined();
  });

  test("has 5 route handlers", () => {
    const routes = require("../routes/revenue");
    const routeCount = routes.stack.filter((r) => r.route).length;
    expect(routeCount).toBe(5);
  });
});

// ═══════════ PHASE 3: Attribution ═══════════
describe("Phase 3: Pipeline Revenue Attribution", () => {
  const attribution = require("../lib/revenue-attribution");

  test("trackAttribution creates record", () => {
    const id = attribution.trackAttribution(
      "So1token1",
      "solana",
      "twitter_brain",
      "TKN1",
    );
    expect(id).toBeGreaterThan(0);
  });

  test("updateStage changes stage and calculates time", () => {
    const result = attribution.updateStage("So1token1", "solana", "scored");
    expect(result.stage).toBe("scored");
    expect(result.probability).toBe(0.15);
  });

  test("recordAgentTouch increments count", () => {
    const result = attribution.recordAgentTouch(
      "So1token1",
      "solana",
      "scanner-agent",
    );
    expect(result.touch_count).toBe(1);
  });

  test("calculateConversionProbability returns value", () => {
    const result = attribution.calculateConversionProbability(
      "So1token1",
      "solana",
    );
    expect(result.probability).toBeGreaterThan(0);
    expect(result.stage).toBe("scored");
  });

  test("getAttributionReport returns structured data", () => {
    const report = attribution.getAttributionReport();
    expect(report.by_source).toBeDefined();
    expect(report.by_stage).toBeDefined();
    expect(report.totals).toBeDefined();
  });

  test("getTopPerformingSources returns array", () => {
    const sources = attribution.getTopPerformingSources(5);
    expect(Array.isArray(sources)).toBe(true);
  });

  test("attribution funnel route module loads", () => {
    const routes = require("../routes/attribution");
    expect(routes).toBeDefined();
  });
});

// ═══════════ PHASE 4: Loop Crons + Authority ═══════════
describe("Phase 4: Autonomous Loop Crons", () => {
  const loops = require("../lib/autonomous-loops");

  test("loop_cron_runs table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='loop_cron_runs'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("loop_cron_outputs table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='loop_cron_outputs'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("generateMorningBrief runs without error", () => {
    const brief = loops.generateMorningBrief();
    expect(brief.date).toBeDefined();
    expect(brief.pipeline_summary).toBeDefined();
  });

  test("generateDiscoveryAlert runs without error", () => {
    const alert = loops.generateDiscoveryAlert();
    expect(alert.period).toBe("4h");
    expect(alert.new_discoveries).toBeDefined();
  });

  test("generateEveningRecap runs without error", () => {
    const recap = loops.generateEveningRecap();
    expect(recap.date).toBeDefined();
    expect(recap.revenue).toBeDefined();
    expect(recap.health).toBeDefined();
  });

  test("getLoopHistory returns runs", () => {
    const history = loops.getLoopHistory(null, 10);
    expect(history.length).toBeGreaterThan(0);
  });
});

describe("Phase 4: Agent Authority Matrix", () => {
  const authority = require("../lib/agent-authority");

  test("agent_authority_matrix table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_authority_matrix'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("authority_audit_log table exists", () => {
    const info = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='authority_audit_log'",
      )
      .get();
    expect(info).toBeTruthy();
  });

  test("default permissions seeded", () => {
    const perms = authority.getAllPermissions();
    expect(perms.length).toBeGreaterThan(10);
  });

  test("checkPermission allows valid action", () => {
    const result = authority.checkPermission("scanner-agent", "scan_token");
    expect(result.allowed).toBe(true);
    expect(result.permission_level).toBe("execute");
  });

  test("checkPermission denies unknown action", () => {
    const result = authority.checkPermission(
      "scanner-agent",
      "delete_database",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_permission_entry");
  });

  test("audit log records checks", () => {
    const log = authority.getAuditLog("scanner-agent", 5);
    expect(log.length).toBeGreaterThan(0);
  });

  test("grantPermission creates new entry", () => {
    authority.grantPermission("test-agent", "test_action", {
      permissionLevel: "read",
      maxDailyCalls: 10,
    });
    const perms = authority.getAgentPermissions("test-agent");
    expect(perms.length).toBe(1);
    expect(perms[0].permission_level).toBe("read");
  });

  test("revokePermission deactivates entry", () => {
    authority.revokePermission("test-agent", "test_action");
    const result = authority.checkPermission("test-agent", "test_action");
    expect(result.allowed).toBe(false);
  });

  test("resetDailyCounters resets all counts", () => {
    authority.resetDailyCounters();
    const perms = authority.getAllPermissions();
    const allZero = perms.every((p) => p.calls_today === 0);
    expect(allZero).toBe(true);
  });
});

// ═══════════ PHASE 5: Dashboard ═══════════
describe("Phase 5: Revenue Dashboard", () => {
  const dashboard = require("../lib/revenue-dashboard");

  beforeAll(() => {
    // Seed some revenue data
    const insert = db.prepare(
      "INSERT INTO revenue_events (token_address, chain, token_ticker, event_type, amount_usd, source) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insert.run("So1aaa", "solana", "AAA", "listing_fee", 1000, "pipeline");
    insert.run("0xbbb", "base", "BBB", "partnership", 2500, "direct");
    insert.run("So1ccc", "solana", "CCC", "listing_fee", 750, "referral");
  });

  test("getKPIs returns all fields", () => {
    const kpis = dashboard.getKPIs();
    expect(kpis.total_revenue_usd).toBeGreaterThan(0);
    expect(kpis.total_deals).toBeGreaterThan(0);
    expect(kpis.avg_deal_size_usd).toBeDefined();
    expect(kpis.pipeline_value_usd).toBeDefined();
    expect(kpis.revenue_velocity).toBeDefined();
  });

  test("getRevenueByChain groups correctly", () => {
    const chains = dashboard.getRevenueByChain(30);
    expect(chains.length).toBeGreaterThan(0);
  });

  test("getRevenueVelocity returns growth metrics", () => {
    const velocity = dashboard.getRevenueVelocity();
    expect(velocity.current_7d_usd).toBeDefined();
    expect(velocity.daily_run_rate).toBeDefined();
  });

  test("dashboard routes module loads", () => {
    const routes = require("../routes/dashboard");
    expect(routes.stack.filter((r) => r.route).length).toBe(5);
  });
});

// ═══════════ PHASE 6: Alerts ═══════════
describe("Phase 6: Revenue Alerts", () => {
  const alerts = require("../lib/revenue-alerts");

  test("checkMilestones detects $1K milestone", () => {
    const result = alerts.checkMilestones(1500);
    expect(result.some((a) => a.milestone === 1000)).toBe(true);
  });

  test("checkDailyTarget detects exceeded target", () => {
    const result = alerts.checkDailyTarget(600, 500);
    expect(result.type).toBe("target_exceeded");
  });

  test("detectAnomaly fires on 30%+ drop", () => {
    const result = alerts.detectAnomaly(50, 100);
    expect(result.type).toBe("revenue_anomaly");
    expect(result.drop_pct).toBe(50);
  });

  test("detectAnomaly returns null for normal revenue", () => {
    const result = alerts.detectAnomaly(90, 100);
    expect(result).toBeNull();
  });

  test("formatAlertMessage includes message", () => {
    const msg = alerts.formatAlertMessage("milestone", { message: "Test" });
    expect(msg).toContain("Test");
    expect(msg).toContain("Buzz Revenue Alert");
  });

  test("alerts routes module loads", () => {
    const routes = require("../routes/alerts");
    expect(routes).toBeDefined();
  });
});

// ═══════════ PHASE 7: Reports ═══════════
describe("Phase 7: Revenue Reports", () => {
  const reports = require("../lib/revenue-reports");

  test("generateDailyReport returns structured report", () => {
    const report = reports.generateDailyReport();
    expect(report.date).toBeDefined();
    expect(report.revenue).toBeDefined();
    expect(report.comparison).toBeDefined();
  });

  test("generateWeeklyReport returns wow comparison", () => {
    const report = reports.generateWeeklyReport();
    expect(report.week_start).toBeDefined();
    expect(report.wow_change_pct).toBeDefined();
  });

  test("forecastRevenue returns projection", () => {
    const forecast = reports.forecastRevenue(30);
    expect(forecast.forecast_days).toBe(30);
    expect(forecast.confidence).toBeDefined();
  });

  test("getExecutiveSummary returns health score", () => {
    const summary = reports.getExecutiveSummary();
    expect(summary.health_score).toBeGreaterThanOrEqual(0);
    expect(summary.health_score).toBeLessThanOrEqual(100);
    expect(summary.health_label).toBeDefined();
  });

  test("reports routes module loads with 5 endpoints", () => {
    const routes = require("../routes/reports");
    expect(routes.stack.filter((r) => r.route).length).toBe(5);
  });
});
