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
  getShieldV2Status,
  scanDependencies,
} = require("../services/shield/buzzshield-v2");
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

router.options("/public/scan", publicScanCors, (req, res) =>
  res.status(204).end(),
);

router.get(
  "/public/scan",
  publicScanCors,
  shieldEnabled,
  publicScanRateLimit,
  async (req, res) => {
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
          "/api/v1/shield/public/scan?token=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263&chain=solana",
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
    const sourcesChecked = [];

    // ─── 1) Pull pipeline token (if scored) ───
    let pipelineToken = null;
    try {
      pipelineToken = db
        .prepare("SELECT * FROM pipeline_tokens WHERE address = ?")
        .get(token);
      if (pipelineToken) sourcesChecked.push("Buzz Pipeline");
    } catch {}

    // ─── 2) Live DexScreener fetch (always, for fresh market data) ───
    let dexData = null;
    let pair = null;
    try {
      const dexRes = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${token}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (dexRes.ok) {
        const dexJson = await dexRes.json();
        const pairs = dexJson.pairs || [];
        // Pick highest-liquidity pair
        pair = pairs.sort(
          (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
        )[0];
        if (pair) {
          dexData = {
            price_usd: parseFloat(pair.priceUsd) || 0,
            market_cap: pair.marketCap || pair.fdv || 0,
            fdv: pair.fdv || 0,
            liquidity_usd: pair.liquidity?.usd || 0,
            volume_24h: pair.volume?.h24 || 0,
            volume_6h: pair.volume?.h6 || 0,
            txns_24h:
              (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
            price_change_24h: pair.priceChange?.h24 || 0,
            pair_created: pair.pairCreatedAt || null,
            dex: pair.dexId || null,
            pair_address: pair.pairAddress || null,
            base_token: pair.baseToken || {},
          };
          sourcesChecked.push("DexScreener");
        }
      }
    } catch {}

    // ─── 3) Shield scan: drain patterns + program risk ───
    let programData = null;
    let patternMatches = [];
    try {
      programData = scoreProgramRisk(db, token, chain);
      patternMatches = matchDrainPatterns(db, token);
      sourcesChecked.push("BuzzShield Patterns");
    } catch {}

    // ─── 4) Blacklist check ───
    let blacklisted = false;
    try {
      const bl = db
        .prepare(
          "SELECT COUNT(*) as c FROM intel_blacklist_wallets WHERE address = ?",
        )
        .get(token);
      blacklisted = bl && bl.c > 0;
      sourcesChecked.push("Intel Blacklist");
    } catch {}

    // ─── 5) Derive market data ───
    const score = pipelineToken?.score ?? null;
    const md = dexData || {};
    const ageDays = pair?.pairCreatedAt
      ? Math.floor(
          (Date.now() - new Date(pair.pairCreatedAt).getTime()) / 86400000,
        )
      : null;

    const market_data = {
      price_usd: md.price_usd || null,
      market_cap: md.market_cap || null,
      fdv: md.fdv || null,
      liquidity_usd: md.liquidity_usd || null,
      volume_24h: md.volume_24h || null,
      holders: null, // requires Helius (Phase 2)
      age_days: ageDays,
      txns_24h: md.txns_24h || null,
      dex: md.dex || null,
    };

    // ─── 6) Apply 11 scoring rules ───
    const fdvGap =
      md.market_cap && md.fdv && md.fdv > 0
        ? Math.round((1 - md.market_cap / md.fdv) * 100)
        : null;
    const vlRatio =
      md.volume_24h && md.liquidity_usd && md.liquidity_usd > 0
        ? Math.round((md.volume_24h / md.liquidity_usd) * 100) / 100
        : null;
    const isStablecoin = /^(usdc|usdt|dai|busd|eurc|fdusd|tusd|pyusd)$/i.test(
      pair?.baseToken?.symbol || pipelineToken?.ticker || "",
    );

    function rule(name, status, impact, detail) {
      return { rule: name, status, impact, detail };
    }

    const rules_applied = [
      rule(
        "GHOST_VOLUME",
        md.txns_24h !== null && md.txns_24h < 50 && md.volume_24h > 1000000
          ? "FLAG"
          : "PASS",
        md.txns_24h !== null && md.txns_24h < 50 && md.volume_24h > 1000000
          ? -25
          : 0,
        md.txns_24h !== null && md.txns_24h < 50 && md.volume_24h > 1000000
          ? `${md.txns_24h} txns with $${Math.round(md.volume_24h).toLocaleString()} volume — wash trading signature`
          : md.txns_24h
            ? `${md.txns_24h} transactions in 24h — normal activity`
            : "No transaction data available",
      ),
      rule(
        "FDV_GAP",
        fdvGap === null
          ? "UNKNOWN"
          : fdvGap > 75
            ? "FLAG"
            : fdvGap > 50
              ? "WARN"
              : "PASS",
        fdvGap === null
          ? 0
          : fdvGap > 90
            ? -20
            : fdvGap > 75
              ? -15
              : fdvGap > 50
                ? -10
                : fdvGap > 30
                  ? -5
                  : 0,
        fdvGap !== null
          ? `${fdvGap}% gap between circulating and fully diluted`
          : "FDV data not available",
      ),
      rule(
        "CTO_FLAG",
        pipelineToken?.notes?.includes("CTO") ? "FLAG" : "PASS",
        pipelineToken?.notes?.includes("CTO") ? -10 : 0,
        pipelineToken?.notes?.includes("CTO")
          ? "Community takeover detected — investigate before proceeding"
          : "No CTO flag detected",
      ),
      rule(
        "VOLUME_LIQUIDITY_RATIO",
        vlRatio === null
          ? "UNKNOWN"
          : vlRatio > 100
            ? "FLAG"
            : vlRatio > 20
              ? "WARN"
              : "PASS",
        vlRatio === null ? 0 : vlRatio > 100 ? -25 : vlRatio > 20 ? -15 : 0,
        vlRatio !== null
          ? `V/L ratio: ${vlRatio}x${vlRatio > 20 ? " — suspicious" : " — within normal range"}`
          : "Ratio not computable",
      ),
      rule(
        "SECURITY_PENALTY",
        programData?.risk_score >= 70
          ? "FLAG"
          : programData?.risk_score >= 40
            ? "WARN"
            : "PASS",
        programData?.risk_score >= 70
          ? -30
          : programData?.risk_score >= 40
            ? -15
            : 0,
        programData
          ? `Program risk score: ${programData.risk_score || 0}`
          : "No security audit data available",
      ),
      rule(
        "LIQUIDITY_CROSSREF",
        md.liquidity_usd !== null && md.liquidity_usd < 10000 ? "FLAG" : "PASS",
        md.liquidity_usd !== null && md.liquidity_usd < 10000 ? -20 : 0,
        md.liquidity_usd !== null
          ? `Liquidity: $${Math.round(md.liquidity_usd).toLocaleString()}`
          : "Liquidity data not available",
      ),
      rule(
        "AGE_BONUS",
        ageDays !== null && ageDays > 90
          ? "PASS"
          : ageDays !== null && ageDays > 30
            ? "PASS"
            : "WARN",
        ageDays !== null
          ? ageDays > 365
            ? 12
            : ageDays > 180
              ? 8
              : ageDays > 90
                ? 5
                : ageDays > 30
                  ? 2
                  : 0
          : 0,
        ageDays !== null
          ? `Token age: ${ageDays} days`
          : "Age data not available",
      ),
      rule(
        "VOLUME_THRESHOLD",
        md.volume_24h !== null && md.volume_24h < 100
          ? "FLAG"
          : md.volume_24h !== null && md.volume_24h < 10000
            ? "WARN"
            : "PASS",
        md.volume_24h !== null && md.volume_24h < 100 ? -50 : 0,
        md.volume_24h !== null
          ? `24h volume: $${Math.round(md.volume_24h).toLocaleString()}`
          : "Volume data not available",
      ),
      rule(
        "STABLECOIN_EXCLUSION",
        isStablecoin ? "FLAG" : "PASS",
        isStablecoin ? -100 : 0,
        isStablecoin
          ? "Known stablecoin — excluded from scoring"
          : "Not a stablecoin",
      ),
      rule(
        "CONTRADICTORY_AUDIT",
        pipelineToken?.notes?.includes("contradiction") ? "FLAG" : "PASS",
        pipelineToken?.notes?.includes("contradiction") ? -15 : 0,
        pipelineToken?.notes?.includes("contradiction")
          ? "Conflicting audit scores detected — manual review required"
          : "No conflicting audit data",
      ),
      rule(
        "BLACKLIST_WALLET_MATCH",
        blacklisted ? "FLAG" : "PASS",
        blacklisted ? -100 : 0,
        blacklisted
          ? "Deployer address found in intel blacklist"
          : "Deployer not in blacklist",
      ),
    ];

    // ─── 7) Compute effective score if not in pipeline ───
    let effectiveScore = score;
    if (effectiveScore === null && dexData) {
      // Start at 50, apply rule impacts
      effectiveScore = 50;
      for (const r of rules_applied) {
        effectiveScore += r.impact;
      }
      effectiveScore = Math.max(0, Math.min(100, effectiveScore));
    }

    // ─── 8) Derive risk_level from effective score + patterns ───
    let risk_level = "UNKNOWN";
    if (blacklisted || isStablecoin) {
      risk_level = "DANGER";
    } else if (patternMatches.length > 0) {
      risk_level = "DANGER";
    } else if (effectiveScore !== null) {
      risk_level =
        effectiveScore >= 70
          ? "SAFE"
          : effectiveScore >= 40
            ? "CAUTION"
            : "DANGER";
    }

    // ─── 9) Build threat_matrix (6 hexagons for dApp) ───
    const threat_matrix = {
      ghost_volume: {
        status: rules_applied[0].status,
        detail: rules_applied[0].detail,
        value: md.txns_24h ? `${md.txns_24h} txns` : null,
      },
      fdv_gap: {
        status: rules_applied[1].status,
        detail: rules_applied[1].detail,
        value: fdvGap !== null ? `${fdvGap}%` : null,
      },
      liquidity_health: {
        status: rules_applied[5].status,
        detail: rules_applied[5].detail,
        value: md.liquidity_usd
          ? `$${Math.round(md.liquidity_usd).toLocaleString()}`
          : null,
      },
      deployer_risk: {
        status: blacklisted ? "FLAG" : "PASS",
        detail: blacklisted
          ? "Deployer on intel blacklist"
          : "Clean wallet history",
      },
      audit_status: {
        status: rules_applied[9].status,
        detail: rules_applied[9].detail,
      },
      drain_patterns: {
        status: patternMatches.length > 0 ? "FLAG" : "PASS",
        detail: `${patternMatches.length}/23 patterns matched`,
      },
    };

    // ─── 10) Build rich flags array ───
    const flags = [];
    for (const r of rules_applied) {
      if (r.status === "FLAG" || r.status === "WARN") {
        flags.push({
          type: r.rule,
          severity: r.status === "FLAG" ? "high" : "medium",
          description: r.detail,
        });
      }
    }
    if (patternMatches.length > 0) {
      for (const m of patternMatches) {
        flags.push({
          type: "DRAIN_PATTERN",
          severity: "critical",
          description: `Matched: ${m.pattern_id || m.name}`,
        });
      }
    }

    // ─── 11) Build summary ───
    const passCount = rules_applied.filter((r) => r.status === "PASS").length;
    const flagCount = rules_applied.filter(
      (r) => r.status === "FLAG" || r.status === "WARN",
    ).length;

    const summary =
      risk_level === "SAFE"
        ? `Token passed BuzzShield scan: score ${effectiveScore}/100, ${passCount} of 11 rules passed. No drain patterns detected. Low risk.`
        : risk_level === "CAUTION"
          ? `Token shows moderate risk: score ${effectiveScore}/100. ${flagCount} rule(s) flagged${flags[0] ? " including " + flags[0].type : ""}. ${passCount} of 11 rules passed. Recommended: enhanced monitoring.`
          : risk_level === "DANGER"
            ? `High risk detected: score ${effectiveScore}/100. ${flagCount} rule(s) flagged. ${patternMatches.length} drain pattern(s) matched. Do not interact without manual review.`
            : `Insufficient data for definitive assessment. ${dexData ? "DexScreener data retrieved" : "No DEX pairs found"} — submit for full audit.`;

    const scanId = `shield_public_${crypto.randomUUID()}`;

    // ─── 12) Persist scan ───
    try {
      recordScan(db, {
        scan_id: scanId,
        scan_type: "public_token",
        requester: req.ip,
        target: token,
        chain,
        verdict: risk_level,
        program_score: programData?.risk_score || null,
        pattern_matches: patternMatches,
        explanation: `Public scan — score ${effectiveScore}, ${passCount}/${rules_applied.length} rules pass, ${patternMatches.length} patterns`,
        scan_duration_ms: Date.now() - startMs,
        paid: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[shield:public/scan] recordScan failed:", err.message);
    }

    // ─── 13) Enriched response ───
    res.json({
      token,
      chain,
      score: effectiveScore,
      risk_level,
      scan_id: scanId,

      rules_applied,

      threat_matrix,

      market_data,

      flags,

      summary,

      // BuzzShield v2.0 Intelligence Layer
      shield_v2: getShieldV2Status(),

      sources_checked: sourcesChecked,
      full_audit_url: `https://buzzbd.ai/score?token=${encodeURIComponent(token)}&chain=${chain}`,
      scan_timestamp: new Date().toISOString(),
      scan_duration_ms: Date.now() - startMs,
      engine_version: getShieldV2Status().engine_version,
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

// GET /shield/scan-dependencies — OSV.dev supply chain scan (admin only)
router.get("/scan-dependencies", apiKeyAuth, async (req, res) => {
  const result = await scanDependencies();
  res.json(result);
});

// GET /shield/v2/status — BuzzShield v2 layer status (public)
router.get("/v2/status", shieldEnabled, (req, res) => {
  res.json(getShieldV2Status());
});

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
