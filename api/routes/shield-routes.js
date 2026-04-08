/**
 * Buzz Shield — API Routes
 * Phase 1: Free tier endpoints (rate limited, no auth required for public endpoints)
 */

const express = require("express");
const router = express.Router();
const { apiKeyAuth } = require("../middleware/auth");
const { feature } = require("../lib/feature-flags");
const { getDB } = require("../db");
const {
  scoreProgramRisk,
  matchDrainPatterns,
  generateVerdict,
  recordScan,
  getShieldStats,
} = require("../services/shield/shield-service");
const {
  verifyPriceIntegrity,
  getSupportedSymbols,
} = require("../services/shield/pyth-oracle-verify");
const crypto = require("crypto");

// Middleware: check master switch
function shieldEnabled(req, res, next) {
  if (!feature("SHIELD_ENGINE")) {
    return res.status(503).json({
      error: "shield_disabled",
      message: "Buzz Shield is not active yet",
    });
  }
  next();
}

// GET /shield/stats — aggregate stats (public, no auth)
router.get("/stats", shieldEnabled, (req, res) => {
  const stats = getShieldStats(getDB());
  res.json(stats);
});

// GET /shield/patterns — known drain pattern feed (public, no auth)
router.get("/patterns", shieldEnabled, (req, res) => {
  if (!feature("SHIELD_PATTERN_MATCHER")) {
    return res.status(503).json({ error: "patterns_disabled" });
  }

  const patterns = getDB()
    .prepare(
      "SELECT pattern_id, name, description, severity, source, confirmed, first_seen, last_seen, match_count FROM drain_patterns WHERE active = 1 ORDER BY severity, match_count DESC",
    )
    .all();

  res.json({
    patterns,
    total_patterns: patterns.length,
    last_updated: new Date().toISOString(),
  });
});

// GET /shield/program/:programId — program risk score (public, no auth)
router.get("/program/:programId", shieldEnabled, (req, res) => {
  if (!feature("SHIELD_PROGRAM_SCORER")) {
    return res.status(503).json({ error: "scorer_disabled" });
  }

  const { programId } = req.params;
  const chain = req.query.chain || "solana";
  const startMs = Date.now();

  const programData = scoreProgramRisk(getDB(), programId, chain);
  const patternMatches = matchDrainPatterns(getDB(), programId);
  const verdict = generateVerdict(
    programData ? programData.risk_score : null,
    patternMatches,
    programData ? programData.deployer_trust : null,
  );

  const scanId = `shield_prog_${crypto.randomUUID()}`;
  const scanDuration = Date.now() - startMs;

  const result = {
    program: programId,
    chain,
    risk_score: programData ? programData.risk_score : null,
    verified: programData ? !!programData.verified : null,
    immutable: programData ? !!programData.immutable : null,
    deploy_date: programData ? programData.deploy_date : null,
    deployer: programData ? programData.deployer_address : null,
    flags:
      programData && programData.flags ? JSON.parse(programData.flags) : [],
    pattern_matches: patternMatches,
    verdict,
    scan_id: scanId,
    scanned_at: new Date().toISOString(),
  };

  // Record scan
  recordScan(getDB(), {
    scan_id: scanId,
    scan_type: "program",
    requester: req.headers["x-agent-id"] || req.ip,
    target: programId,
    chain,
    verdict,
    program_score: programData ? programData.risk_score : null,
    pattern_matches: patternMatches,
    explanation: `Program scan: ${verdict}`,
    scan_duration_ms: scanDuration,
    paid: false,
    created_at: new Date().toISOString(),
  });

  res.json(result);
});

// GET /shield/health/:walletAddress — wallet exposure summary (public, no auth)
router.get("/health/:walletAddress", shieldEnabled, (req, res) => {
  if (!feature("SHIELD_FREE_TIER")) {
    return res.status(503).json({ error: "free_tier_disabled" });
  }

  const { walletAddress } = req.params;
  const chain = req.query.chain || "solana";

  // Phase 1: return skeleton with scan record
  // Phase 2+: wire to Helius for real wallet data
  const scanId = `shield_health_${crypto.randomUUID()}`;

  const result = {
    wallet: walletAddress,
    chain,
    verdict: "CAUTION",
    exposure: {
      total_value_usd: null,
      connected_dapps: null,
      risky_approvals: null,
      programs_interacted: null,
    },
    recommendations: [
      "Full wallet analysis requires Helius integration (Phase 2)",
      "Check program risk scores individually via /shield/program/:programId",
    ],
    scan_id: scanId,
    scanned_at: new Date().toISOString(),
  };

  recordScan(getDB(), {
    scan_id: scanId,
    scan_type: "wallet",
    requester: req.headers["x-agent-id"] || req.ip,
    target: walletAddress,
    chain,
    verdict: "CAUTION",
    explanation: "Phase 1 skeleton — full wallet analysis in Phase 2",
    scan_duration_ms: 1,
    paid: false,
    created_at: new Date().toISOString(),
  });

  res.json(result);
});

// POST /shield/patterns/add — add new pattern (admin only)
router.post("/patterns/add", apiKeyAuth, (req, res) => {
  const {
    pattern_id,
    name,
    description,
    instruction_sequence,
    program_addresses,
    severity,
    source,
  } = req.body;
  if (!pattern_id || !name || !severity) {
    return res.status(400).json({
      error: "missing_fields",
      message: "pattern_id, name, severity required",
    });
  }

  getDB()
    .prepare(
      `
    INSERT OR IGNORE INTO drain_patterns
    (pattern_id, name, description, instruction_sequence, program_addresses, severity, source, first_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `,
    )
    .run(
      pattern_id,
      name,
      description,
      JSON.stringify(instruction_sequence || []),
      JSON.stringify(program_addresses || []),
      severity,
      source || "manual",
    );

  res.json({ success: true, pattern_id });
});

// GET /shield/scans/recent — recent scans (admin only)
router.get("/scans/recent", apiKeyAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const scans = getDB()
    .prepare(
      "SELECT scan_id, scan_type, target, chain, verdict, program_score, scan_duration_ms, created_at FROM shield_scans ORDER BY id DESC LIMIT ?",
    )
    .all(limit);
  res.json(scans);
});

// GET /shield/oracle/verify/:symbol/:price — Pyth oracle price verification (public)
router.get("/oracle/verify/:symbol/:price", shieldEnabled, async (req, res) => {
  const { symbol, price } = req.params;
  const claimedPrice = parseFloat(price);

  if (isNaN(claimedPrice) || claimedPrice <= 0) {
    return res.status(400).json({
      error: "invalid_price",
      message: "Price must be a positive number",
    });
  }

  const result = await verifyPriceIntegrity(symbol, claimedPrice);
  res.json(result);
});

// GET /shield/oracle/symbols — list supported Pyth symbols (public)
router.get("/oracle/symbols", shieldEnabled, (req, res) => {
  res.json({
    symbols: getSupportedSymbols(),
    source: "pyth_hermes_v2",
    intel_source: 33,
  });
});

// ────────────────────────────────────────────────────────────────────────
// Public Scan API — for Noah dApp + third-party integrators (no auth)
// GET /api/v1/shield/public/scan?token={address}&chain=solana
// Rate limit: 10 requests / hour / IP (in-memory sliding window)
// Feature flag: SHIELD_PUBLIC_API
// ────────────────────────────────────────────────────────────────────────
const PUBLIC_SCAN_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_SCAN_LIMIT = 10;
const publicScanStore = new Map();
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of publicScanStore) {
      if (now - v.windowStart > PUBLIC_SCAN_WINDOW_MS * 2)
        publicScanStore.delete(k);
    }
  },
  10 * 60 * 1000,
);

function publicScanRateLimit(req, res, next) {
  const key = req.ip || req.headers["x-forwarded-for"] || "anon";
  const now = Date.now();
  let data = publicScanStore.get(key);
  if (!data || now - data.windowStart > PUBLIC_SCAN_WINDOW_MS) {
    data = { windowStart: now, count: 0 };
    publicScanStore.set(key, data);
  }
  data.count++;
  res.setHeader("X-RateLimit-Limit", PUBLIC_SCAN_LIMIT);
  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, PUBLIC_SCAN_LIMIT - data.count),
  );
  res.setHeader(
    "X-RateLimit-Reset",
    Math.ceil((data.windowStart + PUBLIC_SCAN_WINDOW_MS) / 1000),
  );
  if (data.count > PUBLIC_SCAN_LIMIT) {
    return res.status(429).json({
      error: "rate_limited",
      message: `Public scan rate limit: ${PUBLIC_SCAN_LIMIT} requests/hour. Upgrade to Pro for 100/day.`,
      retry_after_ms: data.windowStart + PUBLIC_SCAN_WINDOW_MS - now,
      upgrade: "https://buzzbd.ai/shield#pro",
    });
  }
  next();
}

// CORS for public scan endpoint — permissive for third-party dApps
function publicScanCors(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}

router.options("/public/scan", publicScanCors, (req, res) => res.status(204).end());

router.get(
  "/public/scan",
  publicScanCors,
  shieldEnabled,
  publicScanRateLimit,
  (req, res) => {
    if (!feature("SHIELD_PUBLIC_API")) {
      return res.status(503).json({
        error: "public_api_disabled",
        message: "Buzz Shield Public API is not yet active",
      });
    }

    const token = (req.query.token || "").toString().trim();
    const chain = (req.query.chain || "solana").toString().toLowerCase();

    if (!token) {
      return res.status(400).json({
        error: "missing_token",
        message: "Query param 'token' (contract address) required",
        example:
          "/api/v1/shield/public/scan?token=EUQoSgsGZzipuayB8AnZHXUMRtLwwy5SuRi4YgFXiogd&chain=solana",
      });
    }
    if (!["solana", "base", "ethereum", "bitcoin"].includes(chain)) {
      return res.status(400).json({
        error: "unsupported_chain",
        message: "chain must be one of: solana, base, ethereum, bitcoin",
      });
    }

    const startMs = Date.now();
    const db = getDB();

    // 1) Pull pipeline token (if scored)
    let pipelineToken = null;
    try {
      pipelineToken = db
        .prepare("SELECT * FROM pipeline_tokens WHERE address = ?")
        .get(token);
    } catch {}

    // 2) Run program-level shield scan
    let programData = null;
    let patternMatches = [];
    try {
      programData = scoreProgramRisk(db, token, chain);
      patternMatches = matchDrainPatterns(db, token);
    } catch {}

    const score = pipelineToken?.score ?? null;
    const riskScore = programData?.risk_score ?? null;

    // 3) Derive risk_level + flags
    let risk_level = "UNKNOWN";
    const flags = [];
    if (patternMatches.length > 0) {
      risk_level = "DANGER";
      flags.push(
        ...patternMatches.map((m) => `drain_pattern:${m.pattern_id || m.name}`),
      );
    } else if (riskScore !== null && riskScore >= 70) {
      risk_level = "DANGER";
      flags.push("program_risk_high");
    } else if (riskScore !== null && riskScore >= 40) {
      risk_level = "CAUTION";
      flags.push("program_risk_medium");
    } else if (score !== null && score >= 70) {
      risk_level = "SAFE";
    } else if (score !== null && score >= 40) {
      risk_level = "CAUTION";
    } else if (score !== null) {
      risk_level = "DANGER";
      flags.push("pipeline_score_low");
    }
    if (programData) {
      if (!programData.verified) flags.push("unverified_source");
      if (!programData.immutable) flags.push("upgradeable");
      try {
        const extraFlags = programData.flags
          ? JSON.parse(programData.flags)
          : [];
        flags.push(...extraFlags);
      } catch {}
    }

    // 4) Summary string for dApp UIs
    const summary =
      risk_level === "SAFE"
        ? `Token passed BuzzShield scan: score ${score}/100, no drain patterns matched.`
        : risk_level === "CAUTION"
          ? `Use caution: ${flags[0] || "medium risk"}. Full report recommended.`
          : risk_level === "DANGER"
            ? `Do not interact: ${flags[0] || "high risk"}. ${patternMatches.length} drain pattern(s) matched.`
            : `No data yet. Submit for full audit.`;

    const scanId = `shield_public_${crypto.randomUUID()}`;

    // 5) Persist scan for audit trail
    try {
      recordScan(db, {
        scan_id: scanId,
        scan_type: "public_token",
        requester: req.ip,
        target: token,
        chain,
        verdict: risk_level,
        program_score: riskScore,
        pattern_matches: patternMatches,
        explanation: `Public API scan — ${flags.join(", ") || "clean"}`,
        scan_duration_ms: Date.now() - startMs,
        paid: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[shield:public/scan] recordScan failed:", err.message);
    }

    // 6) Response — stable contract for Noah dApp
    res.json({
      token,
      chain,
      score,
      risk_level,
      flags,
      summary,
      full_audit_url: `https://buzzbd.ai/score?token=${encodeURIComponent(token)}&chain=${chain}`,
      scan_id: scanId,
      scanned_at: new Date().toISOString(),
      provider: "Buzz Shield",
      tier: "public",
      rate_limit: {
        limit: PUBLIC_SCAN_LIMIT,
        window: "1h",
        upgrade: "https://buzzbd.ai/shield#pro",
      },
    });
  },
);

// GET /shield/info — product page data (public, no auth)
router.get("/info", shieldEnabled, (req, res) => {
  const stats = getShieldStats(getDB());

  res.json({
    product: "Buzz Shield",
    tagline: "Agent Security Intelligence",
    motto: "Security before performance. Intelligence before execution.",
    version: "1.5",
    stats,
    tiers: {
      free: {
        price: "$0",
        features: [
          "Wallet health check (10/day)",
          "Public pattern feed",
          "Shield stats",
          "Public leaderboard",
        ],
        cta: "Start scanning free",
      },
      pro: {
        price: "$99/month or $0.10/scan (x402)",
        features: [
          "Full deep scan (100/day)",
          "All 23+ patterns",
          "Address poisoning detection",
          "Temporal analysis",
          "Token score API",
          "Email alerts on DANGER",
        ],
        cta: "Upgrade to Pro",
      },
      business: {
        price: "$499/month or $0.05/scan (x402)",
        features: [
          "Everything in Pro",
          "MiroFish simulation (100 agents)",
          "Cross-chain bridge verification",
          "Wallet Guard integration",
          "Custom patterns (up to 10)",
          "Weekly threat briefing",
          "1,000 scans/day",
        ],
        cta: "Contact for Business",
      },
      enterprise: {
        price: "$2,500/month (custom)",
        features: [
          "Everything in Business",
          "MiroFish swarm (1K-10K agents)",
          "Anomaly detection engine",
          "Unlimited scans",
          "Full BD screening pipeline",
          "On-call incident response",
          "Quarterly security audit",
          "White-label option",
        ],
        cta: "Contact for Enterprise",
      },
    },
    trust_stack: [
      "ATV.eth identity verification",
      "BuzzShield drain pattern scan (23+ patterns)",
      "11-rule honest scoring engine",
      "MiroFish swarm simulation (1K-10K agents)",
      "Wallet Guard execution gate (BLOCK/WARN/ALLOW)",
      "BuzzReputation on-chain verification",
    ],
    research: {
      adr: "ADR-025",
      deepmind_coverage: "4/6 categories covered (was 3/6)",
      sources:
        "DeepMind, Anthropic SCONE-bench, Drift $270M, Blockaid, OWASP Agentic AI 2026",
      gap_analysis: "15 vectors identified, 3 P0 implemented",
    },
    links: {
      scan: "https://buzzbd.ai/score",
      leaderboard: "https://buzzbd.ai/scores",
      api: "https://api.buzzbd.ai/api/v1/shield",
      github: "https://github.com/buzzbysolcex/buzz-bd-agent",
    },
  });
});

module.exports = router;
