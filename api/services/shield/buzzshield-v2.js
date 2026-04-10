/**
 * BuzzShield v2.0 — Multi-Layered Security Intelligence
 *
 * Layer 1: Prompt Injection Defense (@stackone/defender)
 *   - Two-tier pipeline: pattern detection (~1ms) + ML classification (~10ms)
 *   - Custom tool risk mapping for crypto intel sources
 *   - Feature flag: BUZZSHIELD_DEFENDER
 *
 * Layer 2: Supply Chain Vulnerability Scanning (OSV.dev API)
 *   - Continuous npm dependency monitoring
 *   - Feature flag: BUZZSHIELD_OSV
 *
 * Layer 3: SBOM Generation (CycloneDX)
 *   - Bill of materials snapshot per deploy
 *   - Feature flag: BUZZSHIELD_SBOM
 *
 * All layers gated behind feature flags and non-blocking.
 */

const { feature } = require("../../lib/feature-flags");
const { getDB } = require("../../db");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────
// Tool Risk Mapping — crypto-specific intel source risk tiers
// ─────────────────────────────────────────────────────────────
const TOOL_RISK_MAP = {
  // HIGH — attacker-controlled content surfaces
  gmail_read: "high",
  gmail_search: "high",
  gmail_get_message: "high",
  dexscreener_search: "high",
  dexscreener_token: "high",
  dexscreener_pairs: "high",
  // MEDIUM — semi-trusted but external
  heyanon_query: "medium",
  heyanon_protocol: "medium",
  nansen_query: "medium",
  nansen_wallets: "medium",
  github_issue: "medium",
  github_pr: "medium",
  github_comment: "medium",
  coingecko_token: "medium",
  // LOW — internal / trusted
  scoring_pipeline: "low",
  pipeline_tokens: "low",
  shield_scan: "low",
  wallet_guard: "low",
  observation_log: "low",
};

function getToolRisk(toolName) {
  const key = String(toolName || "")
    .toLowerCase()
    .replace(/[^a-z_]/g, "");
  return TOOL_RISK_MAP[key] || "medium";
}

// ─────────────────────────────────────────────────────────────
// Layer 1: Prompt Injection Defense
// ─────────────────────────────────────────────────────────────

let defenderInstance = null;

function getDefender() {
  if (!feature("BUZZSHIELD_DEFENDER")) return null;
  if (defenderInstance) return defenderInstance;
  try {
    const { createPromptDefense } = require("@stackone/defender");
    defenderInstance = createPromptDefense({
      enableML: true,
      threshold: 0.7,
    });
    return defenderInstance;
  } catch (err) {
    console.warn("[shield-v2] Defender init failed:", err.message);
    return null;
  }
}

/**
 * Scan tool result content for prompt injection attempts.
 * Non-blocking: returns { allowed, score, patterns, latency_ms } or null if disabled.
 */
async function defendToolResult(toolName, content) {
  if (!feature("BUZZSHIELD_DEFENDER")) return null;
  const defender = getDefender();
  if (!defender) return null;

  const startMs = Date.now();
  try {
    const result = await defender.detect(String(content).slice(0, 10000));
    const latency = Date.now() - startMs;

    const detection = {
      tool: toolName,
      risk_tier: getToolRisk(toolName),
      allowed: !result.detected,
      score: result.score || 0,
      patterns_checked: result.patternsChecked || 6,
      ml_score: result.mlScore || 0,
      injection_detected: !!result.detected,
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    };

    // Persist detection
    try {
      getDB()
        .prepare(
          `INSERT INTO shield_detections
           (tool_name, risk_tier, allowed, score, ml_score, injection_detected, content_preview, latency_ms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          toolName,
          detection.risk_tier,
          detection.allowed ? 1 : 0,
          detection.score,
          detection.ml_score,
          detection.injection_detected ? 1 : 0,
          String(content).slice(0, 200),
          latency,
          detection.timestamp,
        );
    } catch {}

    return detection;
  } catch (err) {
    return {
      tool: toolName,
      allowed: true, // fail-open: never block on defender error
      error: err.message,
      latency_ms: Date.now() - startMs,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 2: OSV.dev Supply Chain Scanning
// ─────────────────────────────────────────────────────────────

/**
 * Scan package-lock.json dependencies against OSV.dev vulnerability DB.
 * Returns { packages_scanned, vulnerabilities, critical, high, medium, low }.
 */
async function scanDependencies() {
  if (!feature("BUZZSHIELD_OSV")) {
    return { skipped: true, reason: "BUZZSHIELD_OSV flag disabled" };
  }

  const lockPath = path.resolve(__dirname, "../../package-lock.json");
  if (!fs.existsSync(lockPath)) {
    return { skipped: true, reason: "package-lock.json not found" };
  }

  try {
    const lockfile = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const packages = lockfile.packages || lockfile.dependencies || {};
    const entries = Object.entries(packages).filter(([k]) => k && k !== "");

    const vulnerabilities = [];
    const batchSize = 50;

    // Query OSV.dev in batches
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const queries = batch
        .map(([name, info]) => {
          const pkgName = name.replace(/^node_modules\//, "");
          const version = info.version;
          if (!version) return null;
          return {
            package: { name: pkgName, ecosystem: "npm" },
            version,
          };
        })
        .filter(Boolean);

      if (!queries.length) continue;

      try {
        const res = await fetch("https://api.osv.dev/v1/querybatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queries }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          for (let j = 0; j < results.length; j++) {
            const vulns = results[j].vulns || [];
            if (vulns.length > 0) {
              const pkgName = queries[j].package.name;
              for (const v of vulns) {
                const severity = (
                  v.database_specific?.severity ||
                  v.severity?.[0]?.type ||
                  "UNKNOWN"
                )
                  .toString()
                  .toUpperCase();
                vulnerabilities.push({
                  id: v.id,
                  package: pkgName,
                  version: queries[j].version,
                  severity: severity.includes("CRITICAL")
                    ? "CRITICAL"
                    : severity.includes("HIGH")
                      ? "HIGH"
                      : severity.includes("MEDIUM")
                        ? "MEDIUM"
                        : severity.includes("LOW")
                          ? "LOW"
                          : "UNKNOWN",
                  summary: (v.summary || v.details || "").slice(0, 200),
                  aliases: v.aliases || [],
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("[shield-v2] OSV batch query error:", err.message);
      }
    }

    const result = {
      packages_scanned: entries.length,
      vulnerabilities_found: vulnerabilities.length,
      critical: vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
      high: vulnerabilities.filter((v) => v.severity === "HIGH").length,
      medium: vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
      low: vulnerabilities.filter((v) => v.severity === "LOW").length,
      vulnerabilities: vulnerabilities.slice(0, 50), // cap detail list
      scanned_at: new Date().toISOString(),
    };

    // Persist to shield_vulnerabilities
    try {
      const db = getDB();
      const insert = db.prepare(
        `INSERT OR IGNORE INTO shield_vulnerabilities
         (vuln_id, package_name, package_version, severity, summary, aliases, scanned_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const v of vulnerabilities) {
        insert.run(
          v.id,
          v.package,
          v.version,
          v.severity,
          v.summary,
          JSON.stringify(v.aliases),
          result.scanned_at,
        );
      }
    } catch {}

    return result;
  } catch (err) {
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Layer 3: SBOM Generation
// ─────────────────────────────────────────────────────────────

/**
 * Generate CycloneDX SBOM from package-lock.json.
 * Returns { generated, package_count, format, path }.
 */
function generateSBOM() {
  if (!feature("BUZZSHIELD_SBOM")) {
    return { skipped: true, reason: "BUZZSHIELD_SBOM flag disabled" };
  }

  try {
    const lockPath = path.resolve(__dirname, "../../package-lock.json");
    if (!fs.existsSync(lockPath)) {
      return { skipped: true, reason: "package-lock.json not found" };
    }

    const lockfile = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const packages = lockfile.packages || lockfile.dependencies || {};
    const entries = Object.entries(packages).filter(([k]) => k && k !== "");

    // Build minimal CycloneDX 1.5 SBOM
    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      serialNumber: `urn:uuid:${require("crypto").randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: "Buzz", name: "BuzzShield", version: "2.0" }],
        component: {
          type: "application",
          name: "buzz-bd-agent",
          version: lockfile.version || "9.3",
        },
      },
      components: entries.slice(0, 2000).map(([name, info]) => ({
        type: "library",
        name: name.replace(/^node_modules\//, ""),
        version: info.version || "unknown",
        purl: `pkg:npm/${name.replace(/^node_modules\//, "")}@${info.version || "unknown"}`,
      })),
    };

    // Write SBOM to persistent storage
    const sbomDir = "/data/buzz-api/shield-sbom";
    try {
      if (!fs.existsSync(sbomDir)) fs.mkdirSync(sbomDir, { recursive: true });
    } catch {
      // Fallback: try the persistent volume path
    }
    const sbomPath = path.join(
      fs.existsSync(sbomDir) ? sbomDir : "/tmp",
      `sbom-${new Date().toISOString().split("T")[0]}.json`,
    );
    fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2));

    // Persist summary to shield_sbom table
    try {
      getDB()
        .prepare(
          `INSERT INTO shield_sbom (sbom_date, package_count, format, file_path, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          new Date().toISOString().split("T")[0],
          sbom.components.length,
          "CycloneDX/1.5",
          sbomPath,
          new Date().toISOString(),
        );
    } catch {}

    return {
      generated: true,
      package_count: sbom.components.length,
      format: "CycloneDX/1.5",
      path: sbomPath,
      timestamp: sbom.metadata.timestamp,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Schema: create tables for v2
// ─────────────────────────────────────────────────────────────

function createShieldV2Tables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shield_detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT,
      risk_tier TEXT,
      allowed INTEGER DEFAULT 1,
      score REAL,
      ml_score REAL,
      injection_detected INTEGER DEFAULT 0,
      content_preview TEXT,
      latency_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shield_vulnerabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vuln_id TEXT UNIQUE,
      package_name TEXT,
      package_version TEXT,
      severity TEXT,
      summary TEXT,
      aliases TEXT,
      scanned_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shield_sbom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sbom_date TEXT,
      package_count INTEGER,
      format TEXT,
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─────────────────────────────────────────────────────────────
// Status summary for public API + War Room
// ─────────────────────────────────────────────────────────────

function getShieldV2Status() {
  const db = getDB();
  let defender = { enabled: feature("BUZZSHIELD_DEFENDER") };
  let osv = { enabled: feature("BUZZSHIELD_OSV") };
  let sbom = { enabled: feature("BUZZSHIELD_SBOM") };

  if (defender.enabled) {
    try {
      const stats = db
        .prepare(
          `SELECT COUNT(*) as total,
                  SUM(CASE WHEN injection_detected=1 THEN 1 ELSE 0 END) as detections,
                  AVG(latency_ms) as avg_latency
           FROM shield_detections
           WHERE created_at > datetime('now', '-24 hours')`,
        )
        .get();
      defender = {
        ...defender,
        scans_24h: stats?.total || 0,
        detections_24h: stats?.detections || 0,
        avg_latency_ms: Math.round(stats?.avg_latency || 0),
      };
    } catch {}
  }

  if (osv.enabled) {
    try {
      const latest = db
        .prepare(
          "SELECT * FROM shield_vulnerabilities ORDER BY id DESC LIMIT 1",
        )
        .get();
      const counts = db
        .prepare(
          `SELECT severity, COUNT(*) as c FROM shield_vulnerabilities GROUP BY severity`,
        )
        .all();
      const total = db
        .prepare("SELECT COUNT(*) as c FROM shield_vulnerabilities")
        .get();
      osv = {
        ...osv,
        last_scan: latest?.scanned_at || null,
        vulnerabilities_found: total?.c || 0,
        by_severity: Object.fromEntries(
          (counts || []).map((r) => [r.severity, r.c]),
        ),
      };
    } catch {}
  }

  if (sbom.enabled) {
    try {
      const latest = db
        .prepare("SELECT * FROM shield_sbom ORDER BY id DESC LIMIT 1")
        .get();
      sbom = {
        ...sbom,
        last_generated: latest?.created_at || null,
        package_count: latest?.package_count || 0,
        format: latest?.format || null,
      };
    } catch {}
  }

  // Axios pin check (Sapphire Sleet prevention)
  let axiosVersion = null;
  try {
    const lockPath = path.resolve(__dirname, "../../package-lock.json");
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      const axiosEntry =
        lock.packages?.["node_modules/axios"] || lock.dependencies?.axios;
      axiosVersion = axiosEntry?.version || null;
    }
  } catch {}

  return {
    defender,
    osv,
    sbom,
    supply_chain: {
      axios_version: axiosVersion,
      pinned: axiosVersion === "1.13.6",
      sapphire_sleet_safe: axiosVersion
        ? !axiosVersion.startsWith("1.14")
        : null,
    },
    engine_version: "v9.3-shield-v2",
  };
}

module.exports = {
  // Tool risk mapping
  TOOL_RISK_MAP,
  getToolRisk,

  // Layer 1: Prompt Injection Defense
  getDefender,
  defendToolResult,

  // Layer 2: OSV.dev scanning
  scanDependencies,

  // Layer 3: SBOM
  generateSBOM,

  // Schema
  createShieldV2Tables,

  // Status
  getShieldV2Status,
};
