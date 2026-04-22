/**
 * BuzzShield V5 — Public RDT + AISC Checklist Router
 *
 * Mounted at: /api/v1/shield/public  (when RDT_THREAT_MODEL === 'true')
 * Mount lives in api/server.js behind a process.env flag check.
 *
 * Endpoints (public, no auth, CORS open, 60s cache):
 *   GET /api/v1/shield/public/checklist?type=rdt
 *     - full 40-item list across 5 domains
 *   GET /api/v1/shield/public/checklist?type=rdt&domain=TD-01-LI
 *     - filtered by domain_id (case-insensitive)
 *   GET /api/v1/shield/public/checklist?type=rdt&severity=critical
 *     - filtered by severity (case-insensitive: critical|high|medium|low)
 *   GET /api/v1/shield/public/v5-threat-model
 *     - serves the full V5 markdown as text/markdown
 *
 * Response shape (checklist):
 *   {
 *     version: "1.0",
 *     domains: 5,
 *     total_items: 40,
 *     items: [ { id, domain, domain_id, title, description, severity,
 *                detection_signals, references, buzzshield_unique } ]
 *   }
 *
 * Hackathon: Cerebral Valley (Apr 27, 2026)
 */

"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const checklist = require("../services/shield/rdt-checklist");

const router = express.Router();

// Candidate locations for the V5 markdown doc.
const MD_CANDIDATES = [
  "/data/buzz/persistent/reports/buzzshield-v5-unified-threat-model.md",
  path.resolve(
    __dirname,
    "..",
    "..",
    "data",
    "reports",
    "buzzshield-v5-unified-threat-model.md",
  ),
  path.resolve(
    __dirname,
    "..",
    "..",
    "docs",
    "buzzshield-v5-unified-threat-model.md",
  ),
];

function resolveMarkdownPath() {
  for (const p of MD_CANDIDATES) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (_) {
      /* noop */
    }
  }
  return null;
}

// ─── Public CORS + cache middleware ────────────────────────────────
router.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Cache-Control", "public, max-age=60");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// ─── GET /checklist ────────────────────────────────────────────────
router.get("/checklist", (req, res) => {
  const type = (req.query.type || "rdt").toString().toLowerCase();
  if (type !== "rdt") {
    return res.status(400).json({
      error: "unsupported_type",
      message:
        "Only type=rdt is supported in V5 v1.0 (RDT + AISC unified checklist).",
      supported_types: ["rdt"],
    });
  }

  const domain = req.query.domain ? String(req.query.domain) : null;
  const severity = req.query.severity ? String(req.query.severity) : null;

  // Validate domain filter against known domain_ids
  if (domain) {
    const known = checklist.DOMAINS.map((d) => d.domain_id.toUpperCase());
    if (!known.includes(domain.toUpperCase())) {
      return res.status(400).json({
        error: "unknown_domain",
        message: `Unknown domain_id '${domain}'. Expected one of: ${known.join(", ")}`,
        known_domains: known,
      });
    }
  }

  // Validate severity filter (best-effort — pass through others, but warn)
  const ALLOWED_SEVERITIES = ["critical", "high", "medium", "low"];
  if (severity && !ALLOWED_SEVERITIES.includes(severity.toLowerCase())) {
    return res.status(400).json({
      error: "unknown_severity",
      message: `Unknown severity '${severity}'. Expected one of: ${ALLOWED_SEVERITIES.join(", ")}`,
      known_severities: ALLOWED_SEVERITIES,
    });
  }

  const items = checklist.filter({ domain, severity });

  return res.status(200).json({
    version: checklist.VERSION,
    domains: checklist.DOMAINS.length,
    total_items: checklist.ITEMS.length,
    returned_items: items.length,
    filters: {
      type: "rdt",
      domain: domain || null,
      severity: severity ? severity.toLowerCase() : null,
    },
    items,
  });
});

// ─── GET /checklist/domains — summary of the 5 domains ─────────────
router.get("/checklist/domains", (_req, res) => {
  return res.status(200).json({
    version: checklist.VERSION,
    total_domains: checklist.DOMAINS.length,
    total_items: checklist.ITEMS.length,
    domains: checklist.DOMAINS,
  });
});

// ─── GET /v5-threat-model — serve the full markdown doc ────────────
router.get("/v5-threat-model", (_req, res) => {
  const mdPath = resolveMarkdownPath();
  if (!mdPath) {
    return res
      .status(404)
      .type("text/plain")
      .send(
        "BuzzShield V5 threat model markdown not found on this host.\n" +
          "Expected at /data/buzz/persistent/reports/buzzshield-v5-unified-threat-model.md",
      );
  }
  try {
    const body = fs.readFileSync(mdPath, "utf8");
    res.set("Content-Type", "text/markdown; charset=utf-8");
    res.set("Content-Disposition", "inline; filename=buzzshield-v5.md");
    return res.status(200).send(body);
  } catch (e) {
    return res.status(500).json({
      error: "read_failed",
      message: e && e.message ? e.message : "unknown read error",
    });
  }
});

module.exports = router;
