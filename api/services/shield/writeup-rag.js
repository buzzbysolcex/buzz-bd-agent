/**
 * BuzzShield V5 — Exploit Writeup RAG (Post-Mortem Search)
 *
 * Source spec: Ogie msg 5363 (2026-04-30) — pentest-agents-inspired upgrade.
 *
 * BuzzShield maintains a 21-exploit post-mortem corpus at
 * /data/buzz/persistent/reports/exploit-postmortem-db.json (~$3.06B in
 * losses, 2025-01-01 → 2026-04-26). For each new contract scan, this
 * module retrieves the top-3 most relevant historical exploits by
 * matching vulnerability category, keyword overlap, and chain.
 *
 * Inputs: auditFindings = [{ pattern_id?, category?, description?, chain? }]
 * Output: top-3 matches with relevance_score ≥20 (sorted descending).
 *
 * Wired into /api/v1/shield/audit/full handler after exploit-chain detection.
 */

"use strict";

const fs = require("fs");

const POSTMORTEM_DB_PATH =
  "/data/buzz/persistent/reports/exploit-postmortem-db.json";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
]);

function loadPostMortems() {
  try {
    const data = fs.readFileSync(POSTMORTEM_DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    // Corpus may be either a flat array OR an object with a top-level
    // exploits/incidents key (current shape: {metadata, exploits[]}).
    if (Array.isArray(parsed)) return parsed;
    return parsed.exploits || parsed.incidents || [];
  } catch (e) {
    console.error("[writeup-rag] Failed to load post-mortem DB:", e.message);
    return [];
  }
}

function extractKeywords(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w) => !STOP_WORDS.has(w));
}

function searchSimilarExploits(auditFindings) {
  const postmortems = loadPostMortems();
  if (!postmortems.length) return [];
  if (!Array.isArray(auditFindings) || auditFindings.length === 0) return [];

  const matches = [];

  for (const pm of postmortems) {
    let relevanceScore = 0;
    const matchReasons = [];

    // Corpus uses attack_vector + attack_summary; spec uses
    // vulnerability_type + description. Read both so the matcher works
    // against either shape.
    const pmType = pm.vulnerability_type || pm.attack_vector || "";
    const pmDesc = pm.description || pm.attack_summary || "";

    for (const finding of auditFindings) {
      // Match by vulnerability category
      if (pmType && finding.category) {
        const a = pmType.toLowerCase();
        const b = finding.category.toLowerCase();
        if (a.includes(b) || b.includes(a)) {
          relevanceScore += 30;
          matchReasons.push(`Category match: ${finding.category}`);
        }
      }

      // Match by pattern keywords
      const pmKeywords = extractKeywords(pmDesc || pmType);
      const findingKeywords = extractKeywords(
        finding.description || finding.pattern_id || "",
      );
      const overlap = pmKeywords.filter((k) => findingKeywords.includes(k));

      if (overlap.length >= 2) {
        relevanceScore += overlap.length * 10;
        matchReasons.push(`Keyword overlap: ${overlap.join(", ")}`);
      }
    }

    // Match by chain
    if (pm.chain && auditFindings.some((f) => f.chain === pm.chain)) {
      relevanceScore += 10;
      matchReasons.push(`Same chain: ${pm.chain}`);
    }

    if (relevanceScore >= 20) {
      matches.push({
        protocol: pm.protocol || pm.name,
        date: pm.date,
        amount_lost:
          pm.amount_lost ||
          pm.loss ||
          (pm.amount_lost_usd
            ? `$${Number(pm.amount_lost_usd).toLocaleString()}`
            : null),
        vulnerability_type: pmType || null,
        relevance_score: relevanceScore,
        match_reasons: matchReasons,
        lesson:
          pm.lesson ||
          pm.postmortem_summary ||
          pm.catch_reasoning ||
          "See full writeup",
        buzzshield_would_catch:
          pm.buzzshield_catch !== undefined
            ? pm.buzzshield_catch
            : pm.would_buzzshield_31_catch !== undefined
              ? pm.would_buzzshield_31_catch
              : "unknown",
      });
    }
  }

  // Sort by relevance, return top 3
  return matches
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 3);
}

module.exports = { searchSimilarExploits, loadPostMortems };
