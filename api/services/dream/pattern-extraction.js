/**
 * autoDream v2 — Pattern Extraction Module
 * Extends nightly consolidation with automatic skill generation.
 *
 * Phase 1 (v9.2): Cleanup + archive + vacuum (LIVE)
 * Phase 2 (v9.3): Pattern extraction from observation_log → auto-generate skills
 * Phase 3 (v9.4): Export/import instincts as .json for cross-agent sharing
 *
 * Schedule: 02:00 UTC daily (after Phase 1 cleanup)
 * Feature flag: AUTODREAM_PATTERNS (default: false until tested)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DB_PATH =
  process.env.BUZZ_DB || "/home/claude-code/buzz-workspace/api/buzz.db";
const SKILLS_DIR =
  process.env.BUZZ_SKILLS || "/home/claude-code/buzz-workspace/.claude/skills";
const INSTINCTS_DIR =
  process.env.BUZZ_INSTINCTS ||
  "/home/claude-code/buzz-workspace/.claude/instincts";

// --- Pattern Detection ---

const PATTERN_DETECTORS = [
  {
    name: "scoring-rule-discovery",
    description:
      "Detects when manual token overrides consistently trigger the same correction pattern",
    query: `
      SELECT
        action_type,
        details,
        COUNT(*) as occurrences
      FROM observation_log
      WHERE action_type = 'SCORE_OVERRIDE'
        AND created_at > datetime('now', '-7 days')
      GROUP BY details
      HAVING occurrences >= 3
      ORDER BY occurrences DESC
    `,
    generateSkill: (rows) => ({
      name: `auto-scoring-pattern-${Date.now()}`,
      description: `Auto-detected scoring pattern: ${rows[0]?.details || "unknown"}. Triggered ${rows[0]?.occurrences || 0} times in 7 days.`,
      content: rows.map((r) => `- ${r.details} (${r.occurrences}x)`).join("\n"),
      confidence: Math.min(0.95, 0.5 + (rows[0]?.occurrences || 0) * 0.1),
      type: "scoring-insight",
    }),
  },

  {
    name: "token-red-flags",
    description:
      "Detects common characteristics of tokens that score REJECTED after initial screening",
    query: `
      SELECT
        tp.chain,
        COUNT(*) as reject_count,
        AVG(tp.score) as avg_score,
        GROUP_CONCAT(DISTINCT tp.flags) as common_flags
      FROM token_pipeline tp
      WHERE tp.score < 50
        AND tp.scored_at > datetime('now', '-30 days')
      GROUP BY tp.chain
      HAVING reject_count >= 5
      ORDER BY reject_count DESC
    `,
    generateSkill: (rows) => ({
      name: `token-red-flags-${rows[0]?.chain || "multi"}`,
      description: `Auto-detected red flag patterns for ${rows[0]?.chain || "multiple chains"}. ${rows[0]?.reject_count || 0} rejections in 30 days.`,
      content: rows
        .map(
          (r) =>
            `Chain: ${r.chain} — ${r.reject_count} rejects, avg score: ${r.avg_score?.toFixed(1)}, flags: ${r.common_flags}`,
        )
        .join("\n"),
      confidence: Math.min(0.9, 0.4 + (rows[0]?.reject_count || 0) * 0.05),
      type: "red-flag-pattern",
    }),
  },

  {
    name: "outreach-success-patterns",
    description: "Detects which outreach approaches get replies vs silence",
    query: `
      SELECT
        oq.template_type,
        COUNT(*) as sent_count,
        SUM(CASE WHEN ir.id IS NOT NULL THEN 1 ELSE 0 END) as reply_count
      FROM outreach_queue oq
      LEFT JOIN inbox_replies ir ON oq.contact_email = ir.sender_email
      WHERE oq.sent_at > datetime('now', '-30 days')
      GROUP BY oq.template_type
      HAVING sent_count >= 3
    `,
    generateSkill: (rows) => ({
      name: `outreach-effectiveness`,
      description: `Auto-detected outreach patterns from ${rows.reduce((s, r) => s + r.sent_count, 0)} emails sent in 30 days.`,
      content: rows
        .map(
          (r) =>
            `Template: ${r.template_type} — ${r.reply_count}/${r.sent_count} replies (${((r.reply_count / r.sent_count) * 100).toFixed(0)}%)`,
        )
        .join("\n"),
      confidence: 0.7,
      type: "outreach-insight",
    }),
  },

  {
    name: "simulation-accuracy",
    description:
      "Compares MiroFish simulation predictions against actual price movement",
    query: `
      SELECT
        sr.token_symbol,
        sr.consensus_pct,
        sr.prediction,
        tp.price_change_24h
      FROM simulation_results sr
      JOIN token_pipeline tp ON sr.token_address = tp.address
      WHERE sr.created_at > datetime('now', '-14 days')
        AND tp.last_updated > sr.created_at
    `,
    generateSkill: (rows) => {
      const correct = rows.filter(
        (r) =>
          (r.prediction === "BULLISH" && r.price_change_24h > 0) ||
          (r.prediction === "BEARISH" && r.price_change_24h < 0),
      ).length;
      const accuracy =
        rows.length > 0 ? ((correct / rows.length) * 100).toFixed(1) : 0;
      return {
        name: `simulation-accuracy-report`,
        description: `MiroFish accuracy: ${accuracy}% over ${rows.length} predictions in 14 days.`,
        content:
          `Correct: ${correct}/${rows.length} (${accuracy}%)\n` +
          rows
            .slice(0, 10)
            .map(
              (r) =>
                `  ${r.token_symbol}: predicted ${r.prediction}, actual ${r.price_change_24h > 0 ? "+" : ""}${r.price_change_24h?.toFixed(1)}%`,
            )
            .join("\n"),
        confidence: Math.min(0.85, rows.length > 20 ? 0.8 : 0.5),
        type: "simulation-insight",
      };
    },
  },

  {
    name: "pulse-decision-patterns",
    description:
      "Detects repeated PULSE tick decisions that could become automated rules",
    query: `
      SELECT
        decision,
        reason,
        COUNT(*) as frequency
      FROM observation_log
      WHERE source = 'PULSE'
        AND created_at > datetime('now', '-7 days')
      GROUP BY decision, reason
      HAVING frequency >= 10
      ORDER BY frequency DESC
      LIMIT 10
    `,
    generateSkill: (rows) => ({
      name: `pulse-automation-candidates`,
      description: `PULSE decisions occurring 10+ times in 7 days — candidates for hardcoded rules.`,
      content: rows
        .map((r) => `${r.decision}: "${r.reason}" (${r.frequency}x)`)
        .join("\n"),
      confidence: 0.6,
      type: "automation-candidate",
    }),
  },
];

// --- Instinct Management ---

/**
 * An instinct is a learned pattern with confidence scoring.
 * Instincts evolve: low confidence → tested → high confidence → skill.
 */
class Instinct {
  constructor(data) {
    this.id =
      data.id || `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.name = data.name;
    this.description = data.description;
    this.content = data.content;
    this.type = data.type;
    this.confidence = data.confidence || 0.5;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = new Date().toISOString();
    this.source = data.source || "autoDream";
    this.times_validated = data.times_validated || 0;
    this.promoted_to_skill = data.promoted_to_skill || false;
  }

  toJSON() {
    return { ...this };
  }

  evolve(newConfidence) {
    this.confidence = Math.min(0.99, Math.max(0.01, newConfidence));
    this.times_validated++;
    this.updated_at = new Date().toISOString();
  }
}

// --- Main autoDream v2 ---

async function runPatternExtraction() {
  console.log("[autoDream v2] Pattern extraction starting...");

  if (!fs.existsSync(DB_PATH)) {
    console.error("[autoDream v2] Database not found:", DB_PATH);
    return { extracted: 0, instincts: [] };
  }

  // Ensure instincts directory
  if (!fs.existsSync(INSTINCTS_DIR)) {
    fs.mkdirSync(INSTINCTS_DIR, { recursive: true });
  }

  const instincts = [];

  for (const detector of PATTERN_DETECTORS) {
    try {
      const rawResult = execSync(
        `sqlite3 "${DB_PATH}" "${detector.query.replace(/\n/g, " ").replace(/"/g, '\\"')}"`,
        { encoding: "utf8", timeout: 10000 },
      ).trim();

      if (!rawResult) continue;

      // Parse SQLite pipe-separated output
      const rows = rawResult.split("\n").map((line) => {
        const parts = line.split("|");
        return parts; // Raw — detector.generateSkill handles parsing
      });

      if (rows.length === 0) continue;

      // Generate skill/instinct from pattern
      const skillData = detector.generateSkill(
        rows.map((r) => {
          // Convert to object based on detector expectations
          const obj = {};
          r.forEach((val, i) => {
            obj[`col${i}`] = val;
          });
          return obj;
        }),
      );

      if (skillData && skillData.confidence > 0.4) {
        const instinct = new Instinct(skillData);
        instincts.push(instinct);

        // Save instinct
        const instinctPath = path.join(INSTINCTS_DIR, `${instinct.id}.json`);
        fs.writeFileSync(
          instinctPath,
          JSON.stringify(instinct.toJSON(), null, 2),
        );

        console.log(
          `[autoDream v2] ✅ Pattern: ${detector.name} → confidence ${(skillData.confidence * 100).toFixed(0)}%`,
        );

        // Auto-promote high confidence instincts to skills
        if (skillData.confidence >= 0.85) {
          promoteToSkill(instinct);
        }
      }
    } catch (e) {
      // Query might fail if table doesn't exist — that's OK
      console.log(
        `[autoDream v2] ⏭️ ${detector.name}: skipped (${e.message?.substring(0, 50)})`,
      );
    }
  }

  console.log(`[autoDream v2] Extracted ${instincts.length} patterns`);
  return { extracted: instincts.length, instincts };
}

function promoteToSkill(instinct) {
  const skillDir = path.join(SKILLS_DIR, instinct.name);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  const skillContent = `---
name: ${instinct.name}
description: >
  Auto-generated by autoDream v2 pattern extraction.
  ${instinct.description}
  Confidence: ${(instinct.confidence * 100).toFixed(0)}%
  Source: ${instinct.source}
  Generated: ${instinct.created_at}
tags: [auto-generated, ${instinct.type}]
---

# ${instinct.name}

> Auto-generated by autoDream v2. Confidence: ${(instinct.confidence * 100).toFixed(0)}%

## Pattern

${instinct.content}

## Metadata
- Type: ${instinct.type}
- First detected: ${instinct.created_at}
- Times validated: ${instinct.times_validated}
- Source: ${instinct.source}
`;

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillContent);
  instinct.promoted_to_skill = true;
  console.log(`[autoDream v2] 🎓 Promoted to skill: ${instinct.name}`);
}

// --- Export/Import ---

function exportInstincts(outputPath) {
  if (!fs.existsSync(INSTINCTS_DIR)) return [];
  const files = fs
    .readdirSync(INSTINCTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const instincts = files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(INSTINCTS_DIR, f), "utf8")),
  );

  if (outputPath) {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          agent: "buzz-bd-agent",
          version: "9.2.0",
          instincts,
        },
        null,
        2,
      ),
    );
    console.log(
      `[autoDream v2] Exported ${instincts.length} instincts to ${outputPath}`,
    );
  }

  return instincts;
}

function importInstincts(inputPath) {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const instincts = data.instincts || [];

  if (!fs.existsSync(INSTINCTS_DIR)) {
    fs.mkdirSync(INSTINCTS_DIR, { recursive: true });
  }

  let imported = 0;
  for (const inst of instincts) {
    // Check for duplicates by name
    const existing = fs
      .readdirSync(INSTINCTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .some((f) => {
        const e = JSON.parse(
          fs.readFileSync(path.join(INSTINCTS_DIR, f), "utf8"),
        );
        return e.name === inst.name;
      });

    if (!existing) {
      const instinct = new Instinct({
        ...inst,
        source: `imported-from-${data.agent || "unknown"}`,
      });
      fs.writeFileSync(
        path.join(INSTINCTS_DIR, `${instinct.id}.json`),
        JSON.stringify(instinct.toJSON(), null, 2),
      );
      imported++;
    }
  }

  console.log(
    `[autoDream v2] Imported ${imported}/${instincts.length} instincts (${instincts.length - imported} duplicates skipped)`,
  );
  return imported;
}

module.exports = {
  runPatternExtraction,
  promoteToSkill,
  exportInstincts,
  importInstincts,
  Instinct,
  PATTERN_DETECTORS,
};
