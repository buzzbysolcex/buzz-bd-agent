#!/usr/bin/env node
/**
 * Buzz BD Agent — Session Stop Hook
 * Auto-saves compressed state to .claude/HANDOVER.md on session end.
 * Preserves: feature flags, deadlines, streak, active tasks, trust state.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WORKSPACE =
  process.env.BUZZ_WORKSPACE || "/home/claude-code/buzz-workspace";

function main() {
  console.log("[SessionStop] Saving HANDOVER state...");

  const handoverPath = path.join(WORKSPACE, ".claude/HANDOVER.md");
  const timestamp = new Date().toISOString();

  let state = `# BUZZ HANDOVER — Auto-saved ${timestamp}\n\n`;
  state += `## Session End State\n\n`;

  // Capture key metrics
  try {
    const flagPath = path.join(WORKSPACE, "api/lib/feature-flags.js");
    if (fs.existsSync(flagPath)) {
      const content = fs.readFileSync(flagPath, "utf8");
      const trueCount = (content.match(/:\s*true/g) || []).length;
      const falseCount = (content.match(/:\s*false/g) || []).length;
      state += `- Feature flags: ${trueCount} TRUE, ${falseCount} FALSE\n`;
    }
  } catch (e) {
    /* skip */
  }

  try {
    const dbPath = path.join(WORKSPACE, "api/buzz.db");
    if (fs.existsSync(dbPath)) {
      const tables = execSync(
        `sqlite3 "${dbPath}" "SELECT COUNT(*) FROM sqlite_master WHERE type='table'" 2>/dev/null`,
      )
        .toString()
        .trim();
      state += `- Tables: ${tables}\n`;

      // Pipeline stats
      try {
        const pipeline = execSync(
          `sqlite3 "${dbPath}" "SELECT COUNT(*) FROM token_pipeline" 2>/dev/null`,
        )
          .toString()
          .trim();
        state += `- Pipeline tokens: ${pipeline}\n`;
      } catch (e) {
        /* skip */
      }

      // Trust level
      try {
        const trust = execSync(
          `sqlite3 "${dbPath}" "SELECT current_level FROM trust_state LIMIT 1" 2>/dev/null`,
        )
          .toString()
          .trim();
        state += `- Trust level: ${trust}\n`;
      } catch (e) {
        /* skip */
      }
    }
  } catch (e) {
    /* skip */
  }

  // Git status
  try {
    const gitStatus = execSync(
      `cd "${WORKSPACE}" && git status --short 2>/dev/null | wc -l`,
    )
      .toString()
      .trim();
    const branch = execSync(
      `cd "${WORKSPACE}" && git branch --show-current 2>/dev/null`,
    )
      .toString()
      .trim();
    state += `- Git: ${branch}, ${gitStatus} changed files\n`;
  } catch (e) {
    /* skip */
  }

  // Active deadlines
  state += `\n## Active Deadlines\n`;
  state += `- Kite AI Global Hackathon: May 6, 2026\n`;
  state += `- Colosseum Frontier: May 11, 2026\n`;
  state += `- Gary Palmer call: Apr 6 or Apr 7 14:00-18:00 UTC\n`;

  state += `\n## Critical Rules\n`;
  state += `- Trust Level: 0 (FULL_APPROVAL) — all transactions need Ogie\n`;
  state += `- Max 10 outreach emails/day\n`;
  state += `- AIBTC streak protection: emergency file by 16:00 UTC\n`;
  state += `- Run /effort high on next session start\n`;

  state += `\n---\n*Auto-saved by SessionStop hook. Built by a chef.*\n`;

  fs.writeFileSync(handoverPath, state, "utf8");
  console.log(`[SessionStop] ✅ HANDOVER saved to ${handoverPath}`);
}

main();
