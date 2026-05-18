/**
 * BuzzShield V5 Portal — Audit API endpoints (Phase 1, Apr 16 2026)
 *
 * Mounted at /api/v1/shield/audit (server.js) BEFORE the /api/v1 apiKeyAuth
 * catchall so free-tier endpoints are reachable without an API key.
 *
 * Phase 1 (before May 1 — blocks Kite AI):
 *   POST /full                     — queue audit (V3 sync for free, V3+pashov for paid)
 *   GET  /:audit_id                — full result
 *   GET  /:audit_id/stream         — SSE progress
 *   GET  /example/bananas31        — Kite demo permalink (pashov_audits row 1)
 *
 * All tier gating lives in middleware/tier-gate.js. x402 untouched —
 * that stays on /api/v1/premium/*.
 */

const express = require("express");
const router = express.Router();
const { randomUUID } = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { feature } = require("../lib/feature-flags");
const { getDB } = require("../db");
const { tierGate } = require("../middleware/tier-gate");
const { x402Paywall } = require("../middleware/x402-paywall");

// Paid-tier paywall — applied only when the POST body declares tier="paid"
// AND the caller is not already admin-authed. $0.50 per deep audit matches
// the pashov runtime + Claude token cost profile. Discoverable via
// `awal x402 details` for wallet-enabled agents.
const shieldPaidPaywall = x402Paywall({
  price: "500000", // $0.50 USDC
  resource: "/api/v1/shield/audit/full",
  method: "POST",
  description:
    "BuzzShield V5 paid-tier deep audit via Pashov Audit Group solidity-auditor v2 + x-ray v1. EVM contracts all chains. ~5-10 min. Full findings JSON + markdown report.",
  category: "crypto-intelligence",
  tags: ["security-audit", "deep-audit", "evm", "pashov", "paid"],
});

// GET probe handler — Bazaar + 402index crawlers discover with GET, shield
// audit requires POST. Always trigger the paywall so a GET lands on 402
// (including the bazaar extensions) rather than 404. If a caller somehow
// gets past the paywall via GET (admin key, localhost), tell them to POST.
router.get("/full", (req, res) => {
  return shieldPaidPaywall(req, res, () => {
    res.status(405).json({
      error: "method_not_allowed",
      message:
        "Paid audits require POST with body.tier='paid', body.address, body.chain.",
      usage: {
        method: "POST",
        contentType: "application/json",
        body: {
          tier: "paid",
          address: "0x...",
          chain: "base",
        },
      },
    });
  });
});

function shieldPaidGate(req, res, next) {
  const tier = (req.body && req.body.tier) || "free";
  if (tier !== "paid") return next();
  return shieldPaidPaywall(req, res, () => {
    // Paywall accepted (admin bypass, localhost bypass, or valid X-PAYMENT).
    // Elevate tier for the downstream auth check so the handler stops
    // rejecting with 401 tier_insufficient. Admin stays admin.
    if (!req.tier || req.tier === "free") req.tier = "pro";
    next();
  });
}

// Container-side queue paths. These mount from the host at
// /data/buzz/persistent/pashov-queue (see docker-compose.yml buzz-data volume
// binding /data). The shim at /data/pashov-queue/bin/buzz-audit-evm writes
// to inbox; the host-side pashov-runner.py daemon drops results into outbox.
const PASHOV_SHIM = "/data/pashov-queue/bin/buzz-audit-evm";
const PASHOV_OUTBOX = "/data/pashov-queue/outbox";
const PASHOV_AUDIT_SSE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
const PASHOV_AUDIT_SSE_POLL_MS = 2000;

// Idempotent: read the runner's outbox file for audit_id (if present) and
// UPDATE the pashov_audits row with parsed findings. Returns the parsed JSON
// on success, null if the outbox file is not yet written.
function commitPashovOutbox(db, audit_id) {
  const outFile = path.join(PASHOV_OUTBOX, `${audit_id}.out.json`);
  if (!fs.existsSync(outFile)) return null;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(outFile, "utf8"));
  } catch (e) {
    return null;
  }
  // Clamp to schema CHECKs so a bad daemon payload cannot crash the UPDATE.
  const verdictAllowed = new Set([
    "CLEAN",
    "LOW_RISK",
    "MEDIUM_RISK",
    "HIGH_RISK",
    "CRITICAL",
    "INCONCLUSIVE",
  ]);
  const statusAllowed = new Set(["pending", "running", "complete", "failed"]);
  const verdict = verdictAllowed.has(parsed.verdict)
    ? parsed.verdict
    : "INCONCLUSIVE";
  const status = statusAllowed.has(parsed.status) ? parsed.status : "failed";
  try {
    db.prepare(
      `UPDATE pashov_audits
         SET status = ?,
             verdict = ?,
             contract_name = COALESCE(?, contract_name),
             compiler_version = COALESCE(?, compiler_version),
             findings_count = ?,
             findings_high = ?,
             findings_medium = ?,
             findings_low = ?,
             leads_count = ?,
             findings_json = ?,
             runtime_seconds = ?,
             recommendation = ?,
             report_markdown_path = COALESCE(?, report_markdown_path),
             completed_at = COALESCE(completed_at, datetime('now'))
       WHERE audit_id = ?`,
    ).run(
      status,
      verdict,
      parsed.contract_name || null,
      parsed.compiler || null,
      parsed.findings_count || 0,
      parsed.findings_high || 0,
      parsed.findings_medium || 0,
      parsed.findings_low || 0,
      parsed.leads_count || 0,
      JSON.stringify(parsed.findings_json || []),
      parsed.runtime_seconds || 0,
      (parsed.recommendation || "").slice(0, 500),
      parsed.report_path || null,
      audit_id,
    );
  } catch (e) {
    return null;
  }
  return parsed;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function notEnabled(res) {
  return res.status(503).json({
    error: "portal_disabled",
    message: "BuzzShield V5 audit portal is not active",
    flag: "BUZZSHIELD_V4_AUDIT_API",
  });
}

// Pashov attribution string — LOCKED by Ogie 2026-04-16 21:31 UTC.
// Return on every /audit response. Noah is wiring the identical text on UI.
const PASHOV_ATTRIBUTION = {
  text: "Deep scan powered by Pashov Audit Group's open-source solidity-auditor v2 + x-ray v1 — MIT licensed. Pashov Audit Group audits Aave, Uniswap, Pendle, LayerZero.",
  source: "Pashov Audit Group",
  skills: ["solidity-auditor v2", "x-ray v1"],
  license: "MIT",
  url: "https://github.com/pashov/skills",
  clients: ["Aave", "Uniswap", "Pendle", "LayerZero"],
};

function serializeAudit(row) {
  if (!row) return null;
  // Parse JSON blobs back to objects, surface stable shape for the frontend.
  const parseJson = (s, d) => {
    if (!s) return d;
    try {
      return JSON.parse(s);
    } catch {
      return d;
    }
  };
  return {
    audit_id: row.audit_id,
    status: row.status,
    contract: {
      address: row.contract_address,
      chain_id: row.chain_id,
      chain_name: row.chain_name,
      name: row.contract_name,
      compiler_version: row.compiler_version,
      license: row.license,
      proxy: !!row.proxy,
      implementation_address: row.implementation_address,
      source_bytes: row.source_bytes,
      total_lines: row.total_lines,
    },
    engine: {
      skill_used: row.skill_used,
      mode: row.mode,
      confidence_threshold: row.confidence_threshold,
      agents_spawned: row.agents_spawned,
      runtime_seconds: row.runtime_seconds,
      token_budget: row.token_budget,
    },
    findings: {
      count: row.findings_count,
      high: row.findings_high,
      medium: row.findings_medium,
      low: row.findings_low,
      detail: parseJson(row.findings_json, []),
    },
    leads: {
      count: row.leads_count,
      detail: parseJson(row.leads_json, []),
    },
    result: {
      verdict: row.verdict,
      recommendation: row.recommendation,
      buzz_score_at_audit: row.buzz_score_at_audit,
      report_markdown_path: row.report_markdown_path,
    },
    triggered_by: row.triggered_by,
    created_at: row.created_at,
    completed_at: row.completed_at,
    attribution: PASHOV_ATTRIBUTION,
  };
}

// ─── GET /example/bananas31 ─── Kite demo permalink ─────────────────────
// DO NOT break this URL. Backed by pashov_audits row id=1.
router.get("/example/bananas31", tierGate("free"), (req, res) => {
  if (!feature("BUZZSHIELD_V4_AUDIT_API")) return notEnabled(res);
  try {
    const db = getDB();
    const row = db.prepare("SELECT * FROM pashov_audits WHERE id = 1").get();
    if (!row) {
      return res.status(404).json({
        error: "example_missing",
        message: "BANANAS31 example audit (row 1) not found",
      });
    }
    res.json({
      ok: true,
      example: "bananas31",
      demo: true,
      kite_permalink: true,
      ...serializeAudit(row),
    });
  } catch (e) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
});

// ─── GET /:audit_id ─── full audit result ───────────────────────────────
router.get("/:audit_id", tierGate("free"), (req, res) => {
  if (!feature("BUZZSHIELD_V4_AUDIT_API")) return notEnabled(res);
  const { audit_id } = req.params;
  if (!audit_id || audit_id.length < 4 || audit_id.length > 128) {
    return res.status(400).json({
      error: "bad_audit_id",
      message: "audit_id must be 4-128 chars",
    });
  }
  try {
    const db = getDB();
    // Self-heal: if SSE dropped before DB sync, reconcile from outbox before read.
    commitPashovOutbox(db, audit_id);
    const row = db
      .prepare("SELECT * FROM pashov_audits WHERE audit_id = ?")
      .get(audit_id);
    if (!row) {
      return res.status(404).json({
        error: "not_found",
        message: `No audit found for id ${audit_id}`,
      });
    }
    res.json({ ok: true, ...serializeAudit(row) });
  } catch (e) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
});

// ─── POST /full ─── queue a new audit ──────────────────────────────────
// Free tier: V3 scan only, returns synchronously (~2s).
// Paid tier: V3 + pashov full run (~5-10 min), returns audit_id immediately
// and frontend subscribes to /:audit_id/stream for progress.
router.post("/full", tierGate("free"), shieldPaidGate, async (req, res) => {
  if (!feature("BUZZSHIELD_V4_AUDIT_API")) return notEnabled(res);
  const { address, chain_id, tier = "free" } = req.body || {};

  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json({ error: "bad_address", message: "address (string) required" });
  }
  if (chain_id == null || !Number.isFinite(Number(chain_id))) {
    return res
      .status(400)
      .json({ error: "bad_chain_id", message: "chain_id (number) required" });
  }

  // Requested tier must be <= caller's authorized tier
  const requestedRank = tier === "paid" ? 1 : tier === "free" ? 0 : 0;
  const callerRank =
    req.tier === "admin"
      ? 99
      : req.tier === "pro"
        ? 1
        : req.tier === "business"
          ? 2
          : req.tier === "enterprise"
            ? 3
            : 0;
  if (requestedRank > callerRank) {
    return res.status(401).json({
      error: "tier_insufficient_for_request",
      message: `tier='${tier}' requires Pro+ auth; caller is '${req.tier}'`,
      upgrade_url: "https://buzzbd.ai/pricing",
    });
  }

  const audit_id = `audit-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const db = getDB();

  // Free tier — synchronous V3 scan (quick, no pashov)
  if (tier === "free") {
    const chainSlug = chainIdToSlug(Number(chain_id));
    const V3_SUPPORTED = new Set(["solana", "base", "ethereum", "bitcoin"]);
    if (!V3_SUPPORTED.has(chainSlug)) {
      return res.status(400).json({
        error: "unsupported_chain_free_tier",
        message: `Free-tier V3 scan supports: ${Array.from(V3_SUPPORTED).join(", ")}. Paid tier (pashov) covers all EVM chains including bsc/polygon/arbitrum/optimism.`,
        chain_requested: chainSlug,
        upgrade_url: "https://buzzbd.ai/pricing",
      });
    }
    try {
      const axios = require("axios");
      const scanUrl = `http://localhost:3000/api/v1/shield/public/scan?token=${encodeURIComponent(address)}&chain=${encodeURIComponent(chainSlug)}`;
      const scan = await axios.get(scanUrl, { timeout: 20000 });

      // ── BuzzShield V5 upgrade (Ogie msg 5361-5363, Apr 30) ──
      // Compose individual pattern findings into chains, search the
      // 21-exploit post-mortem corpus for analogous historical incidents.
      // Synthesize a findings[] array from scan.data fields the chain
      // detector + RAG search both expect (pattern_id, category, description,
      // chain). Failure here is non-fatal — still return the V3 scan.
      let v5 = null;
      try {
        const {
          detectExploitChains,
        } = require("../services/shield/exploit-chain");
        const {
          searchSimilarExploits,
        } = require("../services/shield/writeup-rag");
        const findings = [];
        // pattern_matches → findings (V3 shape: { pattern_id, severity, … })
        for (const pm of scan.data?.pattern_matches || []) {
          findings.push({
            pattern_id: pm.pattern_id || pm.id || "",
            category: pm.category || pm.pattern_type || "",
            description: pm.description || pm.title || "",
            chain: chainSlug,
          });
        }
        // flags → findings (V3 shape: each flag is a reason string)
        for (const flag of scan.data?.flags || []) {
          findings.push({
            pattern_id:
              typeof flag === "string"
                ? flag.toLowerCase().replace(/\s+/g, "_")
                : "",
            category: "flag",
            description:
              typeof flag === "string" ? flag : flag.description || "",
            chain: chainSlug,
          });
        }
        const auditResults = { findings };
        const exploit_chains = detectExploitChains(auditResults);
        const similar_exploits = searchSimilarExploits(findings);

        v5 = {};
        if (exploit_chains.length > 0) {
          v5.exploit_chains = exploit_chains;
          v5.chain_risk = exploit_chains.some(
            (c) => c.verdict === "HIGH_CONFIDENCE",
          )
            ? "CRITICAL"
            : "WARNING";
          // Score penalty: 20 per HIGH_CONFIDENCE chain
          const chainPenalty =
            exploit_chains.filter((c) => c.verdict === "HIGH_CONFIDENCE")
              .length * 20;
          if (chainPenalty > 0 && typeof scan.data?.score === "number") {
            v5.score_pre_chain_penalty = scan.data.score;
            v5.score = Math.max(0, scan.data.score - chainPenalty);
            v5.chain_penalty_applied = chainPenalty;
          }
        }
        if (similar_exploits.length > 0) {
          v5.similar_exploits = similar_exploits;
          const totalLost = similar_exploits.reduce((sum, e) => {
            const n =
              parseFloat(String(e.amount_lost || "").replace(/[^0-9.]/g, "")) ||
              0;
            return sum + n;
          }, 0);
          v5.historical_warning = `This contract shares patterns with ${similar_exploits.length} past exploit(s) totaling $${totalLost.toLocaleString()} in losses.`;
        }
        if (Object.keys(v5).length === 0) v5 = null;
      } catch (v5err) {
        console.warn("[shield-v5] non-fatal:", v5err.message);
      }

      // Map V3 risk_level → pashov_audits verdict CHECK constraint
      const riskRaw = (scan.data?.risk_level || "UNKNOWN").toUpperCase();
      const verdictMap = {
        LOW: "LOW_RISK",
        MEDIUM: "MEDIUM_RISK",
        HIGH: "HIGH_RISK",
        CRITICAL: "CRITICAL",
        SAFE: "CLEAN",
        CLEAN: "CLEAN",
      };
      let verdict = verdictMap[riskRaw] || "INCONCLUSIVE";
      // V5 escalation: a HIGH_CONFIDENCE exploit chain promotes verdict to CRITICAL
      if (v5 && v5.chain_risk === "CRITICAL") verdict = "CRITICAL";
      // skill_used CHECK constraint only allows x-ray/solidity-auditor/both —
      // label free tier as 'x-ray' (lightweight scan, semantic match) with
      // mode='free-tier-v3' for disambiguation at read time.
      db.prepare(
        `INSERT INTO pashov_audits
         (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
          findings_count, findings_high, findings_medium, findings_low, leads_count,
          verdict, recommendation, buzz_score_at_audit, triggered_by, status, created_at, completed_at)
         VALUES (?, ?, ?, ?, 'x-ray', 'free-tier-v3',
          0, 0, 0, 0, 0,
          ?, ?, ?, 'api_v4_portal_free', 'complete', datetime('now'), datetime('now'))`,
      ).run(
        audit_id,
        address,
        Number(chain_id),
        chainSlug,
        verdict,
        (scan.data?.summary || "").slice(0, 500),
        Math.round(scan.data?.score || 0),
      );
      return res.json({
        ok: true,
        audit_id,
        tier: "free",
        status: "complete",
        v3_result: scan.data,
        v5: v5 || undefined,
        attribution: PASHOV_ATTRIBUTION,
        stream_url: null,
        result_url: `/api/v1/shield/audit/${audit_id}`,
      });
    } catch (e) {
      return res.status(500).json({ error: "scan_failed", message: e.message });
    }
  }

  // Paid tier — queue pashov run via the container shim buzz-audit-evm.
  // Master gate: PASHOV_ENABLED. When false the infra still exists but
  // does not accept new paid jobs.
  if (!feature("PASHOV_ENABLED")) {
    return res.status(503).json({
      error: "pashov_not_enabled",
      message:
        "Paid-tier pashov audits are not yet live. PASHOV_ENABLED=false. Free-tier V3 scan is available at tier='free'.",
      attribution: PASHOV_ATTRIBUTION,
    });
  }

  // ── Input-validation preflight (Apr 23 2026 — Ogie msg 4561 "100% on
  // valid contracts" directive). Rejects malformed inputs at HTTP layer so
  // they never create a row that later gets marked status='failed'.
  //
  // 1. Duplicate guard: same address+chain submitted in last 5 min.
  //    Covers the Apr 22 15:44:20/15:45:32 twin-submit pattern where the
  //    daemon processed the second request but both DB rows got marked
  //    failed at 15:51:40 via SSE timeout cascade.
  try {
    const dup = db
      .prepare(
        `SELECT audit_id, status FROM pashov_audits
         WHERE contract_address = ? AND chain_id = ?
           AND created_at > datetime('now','-5 minutes')
           AND status IN ('pending','running')
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(address, Number(chain_id));
    if (dup) {
      return res.status(409).json({
        error: "duplicate_audit_in_flight",
        message: `An audit for this contract+chain was submitted <5 min ago and is still ${dup.status}. Poll /api/v1/shield/audit/${dup.audit_id} instead of re-queuing.`,
        existing_audit_id: dup.audit_id,
        existing_status: dup.status,
        attribution: PASHOV_ATTRIBUTION,
      });
    }
  } catch (e) {
    // Dedup lookup failure is non-fatal — proceed with insert.
  }

  // 2. Source-verification preflight via Sourcify v2 (no API key required,
  //    supports all major EVM chains). A contract with unverified source
  //    cannot be audited — the shim's buzz-audit-evm returns
  //    `error: "source_unverified"` and marks status='failed'. Reject at
  //    HTTP layer instead of burning a FAILED row. Fails OPEN on Sourcify
  //    5xx/timeout so a degraded verifier never blocks paid audits.
  //
  //    v2 API shape (https://sourcify.dev/server/v2/contract/{chain}/{addr}):
  //    - verified:   {"match":"match","runtimeMatch":"match",...}
  //    - unverified: {"match":null,"creationMatch":null,"runtimeMatch":null}
  //    The deprecated /check-by-addresses endpoint returned false positives
  //    for WETH and USDT during preflight dev (Apr 23 2026), so the v2 path
  //    is load-bearing — do not revert to the old endpoint.
  try {
    const axios = require("axios");
    const chkUrl = `https://sourcify.dev/server/v2/contract/${Number(chain_id)}/${encodeURIComponent(address)}`;
    const chk = await axios.get(chkUrl, { timeout: 8000 });
    const data = chk.data || {};
    const verified =
      data.match === "match" ||
      data.runtimeMatch === "match" ||
      data.creationMatch === "match";
    if (!verified) {
      return res.status(400).json({
        error: "contract_source_unverified",
        message: `Contract source is not verified for chain ${chain_id} (Sourcify v2: match=${data.match ?? "null"}). Pashov deep audit reads verified source. Publish source on the chain's block explorer (Etherscan/Basescan/BSCscan/etc.) or Sourcify before requesting a paid audit.`,
        sourcify_match: data.match ?? null,
        attribution: PASHOV_ATTRIBUTION,
      });
    }
  } catch (e) {
    // Sourcify unavailable — fail open. Log and proceed; if the contract
    // really is unverified the shim will still return source_unverified
    // and the row will be status='failed' (degraded but not worse than
    // pre-preflight behavior).
    console.warn(
      `[pashov-preflight] sourcify v2 check failed for ${address}@${chain_id}: ${e.message}`,
    );
  }

  try {
    db.prepare(
      `INSERT INTO pashov_audits
       (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
        findings_count, triggered_by, status, created_at)
       VALUES (?, ?, ?, ?, 'solidity-auditor', 'deep',
        0, 'api_v4_portal_paid', 'pending', datetime('now'))`,
    ).run(audit_id, address, Number(chain_id), chainIdToSlug(Number(chain_id)));
  } catch (e) {
    return res
      .status(500)
      .json({ error: "db_insert_failed", message: e.message });
  }

  // Spawn the shim detached: it only writes a small JSON to the inbox and
  // exits. The host-side daemon picks it up. We don't wait on stdout — the
  // SSE endpoint streams progress by tailing the outbox file.
  try {
    const child = spawn(
      PASHOV_SHIM,
      [
        "--audit-id",
        audit_id,
        "--address",
        address,
        "--chain-id",
        String(Number(chain_id)),
        "--mode",
        "deep",
        "--triggered-by",
        "api_v4_portal_paid",
      ],
      { detached: true, stdio: "ignore" },
    );
    child.on("error", (e) => {
      // If the shim fails to launch, surface via DB status so /stream reports it.
      try {
        const db2 = getDB();
        db2
          .prepare(
            `UPDATE pashov_audits SET status='failed', recommendation=? WHERE audit_id=?`,
          )
          .run(`shim_launch_failed: ${e.message}`.slice(0, 500), audit_id);
      } catch {}
    });
    child.unref();
  } catch (e) {
    try {
      db.prepare(
        `UPDATE pashov_audits SET status='failed', recommendation=? WHERE audit_id=?`,
      ).run(`shim_spawn_error: ${e.message}`.slice(0, 500), audit_id);
    } catch {}
    return res.status(500).json({
      error: "shim_spawn_failed",
      message: e.message,
      audit_id,
    });
  }

  return res.status(202).json({
    ok: true,
    audit_id,
    tier: "paid",
    status: "pending",
    stream_url: `/api/v1/shield/audit/${audit_id}/stream`,
    result_url: `/api/v1/shield/audit/${audit_id}`,
    attribution: PASHOV_ATTRIBUTION,
  });
});

function chainIdToSlug(id) {
  const map = {
    1: "ethereum",
    56: "bsc",
    137: "polygon",
    8453: "base",
    42161: "arbitrum",
    10: "optimism",
    // Solana lives outside EVM chain_id space — treat -1 as solana convention
    [-1]: "solana",
  };
  return map[id] || "unknown";
}

// ─── GET /:audit_id/stream ─── SSE progress ─────────────────────────────
// Polls the pashov outbox file for this audit_id. While the daemon only
// writes on terminal state, we surface heartbeat + DB-status events every
// poll interval so the frontend can render a live "running for 03:12"
// indicator without spinning a separate timer.
router.get("/:audit_id/stream", tierGate("free"), (req, res) => {
  if (!feature("BUZZSHIELD_V4_AUDIT_API")) return notEnabled(res);
  const { audit_id } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  // nginx: disable response buffering so events flush immediately.
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* connection dropped */
    }
  };

  send("hello", {
    audit_id,
    phase: "stream_connected",
    attribution: PASHOV_ATTRIBUTION,
  });

  let db;
  try {
    db = getDB();
  } catch (e) {
    send("error", { message: "db_unavailable", detail: e.message });
    return res.end();
  }

  const initial = db
    .prepare(
      "SELECT status, findings_count, verdict, completed_at, created_at FROM pashov_audits WHERE audit_id = ?",
    )
    .get(audit_id);
  if (!initial) {
    send("error", { message: "not_found" });
    return res.end();
  }

  // Short-circuit if already terminal — still commit outbox once on the way
  // out in case it landed between UPDATE and this GET.
  if (initial.status === "complete" || initial.status === "failed") {
    const committed = commitPashovOutbox(db, audit_id);
    const final = db
      .prepare("SELECT * FROM pashov_audits WHERE audit_id = ?")
      .get(audit_id);
    send("status", {
      status: final.status,
      verdict: final.verdict,
      findings_count: final.findings_count,
    });
    send("done", {
      audit_id,
      status: final.status,
      verdict: final.verdict,
      committed: !!committed,
    });
    return res.end();
  }

  send("status", {
    status: initial.status,
    created_at: initial.created_at,
  });

  const started = Date.now();
  let closed = false;

  const cleanup = () => {
    closed = true;
    clearInterval(timer);
    try {
      res.end();
    } catch {}
  };

  req.on("close", cleanup);

  const timer = setInterval(() => {
    if (closed) return;
    const elapsed = Date.now() - started;

    if (elapsed > PASHOV_AUDIT_SSE_TIMEOUT_MS) {
      send("timeout", {
        audit_id,
        message: "SSE window elapsed; poll result_url for final state",
        elapsed_ms: elapsed,
      });
      cleanup();
      return;
    }

    // Check outbox first — this is the authoritative terminal state.
    const committed = commitPashovOutbox(db, audit_id);
    if (committed) {
      send("progress", {
        status: committed.status,
        verdict: committed.verdict,
        findings_count: committed.findings_count || 0,
        runtime_seconds: committed.runtime_seconds || 0,
      });
      send("done", {
        audit_id,
        status: committed.status,
        verdict: committed.verdict,
        findings_count: committed.findings_count || 0,
        completed_at: committed.completed_at,
      });
      cleanup();
      return;
    }

    // No outbox yet — emit heartbeat with current DB state.
    const row = db
      .prepare(
        "SELECT status, created_at FROM pashov_audits WHERE audit_id = ?",
      )
      .get(audit_id);
    send("heartbeat", {
      audit_id,
      status: row?.status || "unknown",
      elapsed_seconds: Math.floor(elapsed / 1000),
    });
  }, PASHOV_AUDIT_SSE_POLL_MS);
});

console.log("[INIT] BuzzShield V5 Portal audit routes wired (Phase 1)");
module.exports = router;
