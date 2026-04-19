/**
 * Canonical daily-report cron — 21:00 UTC daily.
 *
 * Aggregates 10 source tables, renders summary, writes to
 * autonomous_loop_outputs (output_type='daily_report'), dual-routes to
 * Telegram War Room + Discord #daily-report, and writes a claim_audit row
 * with SHA-256 hashes of every source query + its result count so the run
 * is reproducible.
 *
 * Missing tables degrade gracefully (logs a note in the per-source summary,
 * doesn't fail the whole report) — Buzz is a 18-month-old codebase, some
 * tables referenced by spec may not exist in every environment.
 *
 * Per Ogie msg 3897 Decision 1 / Commit 2. Phase 1b Wave 1.
 */

const crypto = require("crypto");

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function sqliteDateExpr(todayOnly) {
  // Return a WHERE clause fragment comparing against today's UTC date.
  return todayOnly
    ? `date(created_at) = date('now')`
    : `datetime(created_at) > datetime('now', '-24 hours')`;
}

function safeAll(db, sql, params = []) {
  try {
    if (params && params.length) return db.prepare(sql).all(...params);
    return db.prepare(sql).all();
  } catch (err) {
    return { __error: err.message };
  }
}

function safeGet(db, sql, params = []) {
  try {
    if (params && params.length) return db.prepare(sql).get(...params);
    return db.prepare(sql).get();
  } catch (err) {
    return { __error: err.message };
  }
}

/**
 * Collect all 10 source aggregates. Each returns:
 *   { source, sql, rows|value, count, hash, error? }
 */
function collectSources(db) {
  const sources = [];

  // 1. autonomous_loop_outputs — today's morning brief + any other outputs
  {
    const sql = `SELECT id, output_type, title, created_at FROM autonomous_loop_outputs
                 WHERE ${sqliteDateExpr(true)}
                 ORDER BY id DESC`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "autonomous_loop_outputs",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  // 2. aibtc_signals_filed — filed / approved / rejected counts today
  {
    const sql = `SELECT status, COUNT(*) as n FROM aibtc_signals_filed
                 WHERE ${sqliteDateExpr(true).replace("created_at", "filed_at")}
                 GROUP BY status`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "aibtc_signals_filed",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  // 3. aibtc_rank_history — rank delta vs yesterday (table may not exist)
  {
    const sql = `SELECT rank, total_signals, recorded_at FROM aibtc_rank_history
                 ORDER BY id DESC LIMIT 2`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "aibtc_rank_history",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  // 4. corrections (counting aibtc_signals_filed.status='correction' OR a
  //    dedicated corrections table if one exists)
  {
    const sql = `SELECT COUNT(*) as n FROM aibtc_signals_filed
                 WHERE ${sqliteDateExpr(true).replace("created_at", "filed_at")}
                   AND (status = 'correction' OR headline LIKE 'Correction to%')`;
    const row = safeGet(db, sql);
    sources.push({
      source: "corrections",
      sql,
      value: row && !row.__error ? row.n : 0,
      count: 1,
      hash: sha256(sql + JSON.stringify(row)),
      error: row && row.__error,
    });
  }

  // 5. bd_pipeline_state (may be pipeline_tokens + outreach_contacts)
  {
    const pipelineSql = `SELECT stage, COUNT(*) as n FROM pipeline_tokens
                          WHERE ${sqliteDateExpr(true)}
                          GROUP BY stage`;
    const outreachSql = `SELECT status, COUNT(*) as n FROM outreach_queue
                          WHERE ${sqliteDateExpr(true)}
                          GROUP BY status`;
    const pipeline = safeAll(db, pipelineSql);
    const outreach = safeAll(db, outreachSql);
    const combined = { pipeline, outreach };
    sources.push({
      source: "bd_pipeline_state",
      sql: `${pipelineSql} ; ${outreachSql}`,
      rows: combined,
      count:
        (Array.isArray(pipeline) ? pipeline.length : 0) +
        (Array.isArray(outreach) ? outreach.length : 0),
      hash: sha256(pipelineSql + outreachSql + JSON.stringify(combined)),
      error:
        !Array.isArray(pipeline) || !Array.isArray(outreach)
          ? (pipeline.__error || "") + (outreach.__error || "")
          : undefined,
    });
  }

  // 6. mining_snapshots — today's collection count
  {
    const sql = `SELECT COUNT(*) as n FROM mining_snapshots
                 WHERE ${sqliteDateExpr(true).replace("created_at", "timestamp")}`;
    const row = safeGet(db, sql);
    sources.push({
      source: "mining_snapshots",
      sql,
      value: row && !row.__error ? row.n : 0,
      count: 1,
      hash: sha256(sql + JSON.stringify(row)),
      error: row && row.__error,
    });
  }

  // 7. shield_scans — today's count
  {
    const sql = `SELECT COUNT(*) as n FROM shield_scans
                 WHERE ${sqliteDateExpr(true)}`;
    const row = safeGet(db, sql);
    sources.push({
      source: "shield_scans",
      sql,
      value: row && !row.__error ? row.n : 0,
      count: 1,
      hash: sha256(sql + JSON.stringify(row)),
      error: row && row.__error,
    });
  }

  // 8. revenue_ledger — inflows by stream today
  {
    const sql = `SELECT source_type, SUM(sats_amount) as sats
                 FROM revenue_ledger
                 WHERE date(timestamp) = date('now') AND sats_amount > 0
                 GROUP BY source_type`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "revenue_ledger",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  // 9. budget_ledger — today's spend (cost_class='paid' in revenue_ledger
  //    until a dedicated budget_ledger table exists)
  {
    const sql = `SELECT cost_class, SUM(ABS(sats_amount)) as sats
                 FROM revenue_ledger
                 WHERE date(timestamp) = date('now') AND sats_amount < 0
                 GROUP BY cost_class`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "budget_ledger",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  // 10. event_log — kill-switch / guard / trust events today
  {
    const sql = `SELECT event_type, COUNT(*) as n FROM event_log
                 WHERE ${sqliteDateExpr(true)}
                   AND event_type IN ('kill_switch.act', 'guard.block',
                                      'trust.level.change', 'streak.emergency',
                                      'feature_flag.flip')
                 GROUP BY event_type`;
    const rows = safeAll(db, sql);
    sources.push({
      source: "event_log",
      sql,
      rows: Array.isArray(rows) ? rows : [],
      count: Array.isArray(rows) ? rows.length : 0,
      hash: sha256(sql + JSON.stringify(rows)),
      error: !Array.isArray(rows) ? rows.__error : undefined,
    });
  }

  return sources;
}

function renderReport(sources) {
  const today = new Date().toISOString().split("T")[0];
  const lines = [
    `📊 BUZZ DAILY REPORT — ${today} 21:00 UTC`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];
  for (const s of sources) {
    lines.push(
      `**${s.source}** (count=${s.count}${s.error ? ` err=${s.error.slice(0, 60)}` : ""})`,
    );
    if (s.rows && Array.isArray(s.rows) && s.rows.length) {
      for (const r of s.rows.slice(0, 5)) {
        lines.push("  " + JSON.stringify(r));
      }
      if (s.rows.length > 5) lines.push(`  ... (+${s.rows.length - 5} more)`);
    } else if (s.rows && typeof s.rows === "object" && !Array.isArray(s.rows)) {
      lines.push("  " + JSON.stringify(s.rows).slice(0, 300));
    } else if (s.value !== undefined) {
      lines.push(`  value: ${s.value}`);
    }
    lines.push("");
  }
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`🤲 Bismillah. Generated ${new Date().toISOString()}`);
  return lines.join("\n");
}

/**
 * Entry point for the 21:00 UTC cron.
 *
 * @param {object} deps  Optional dependency injection for tests.
 *                        { db, discord, telegram }
 * @returns {Promise<{ok:boolean, output_id:number?, claim_audit_id:number?,
 *                     telegramSent:boolean, discordSent:boolean, error?:string}>}
 */
async function runDailyReport(deps = {}) {
  const db = deps.db || require("../db").getDB();
  const discord = deps.discord || require("../lib/discord-notify");
  const telegram =
    deps.telegram ||
    (() => {
      try {
        return require("../lib/telegram-notify");
      } catch {
        return null;
      }
    })();

  try {
    const sources = collectSources(db);
    const report = renderReport(sources);

    // Write to autonomous_loop_outputs. Table already exists per existing
    // autonomous-loops.js module. Minimal schema reference.
    let outputId = null;
    try {
      const row = db
        .prepare(
          `INSERT INTO autonomous_loop_outputs (run_id, output_type, title, content, created_at)
           VALUES (NULL, 'daily_report', ?, ?, datetime('now'))`,
        )
        .run(
          `Daily Report — ${new Date().toISOString().split("T")[0]}`,
          report,
        );
      outputId = row.lastInsertRowid;
    } catch (err) {
      // Fallback: try with alternative column name run_id might not be nullable.
      console.error(
        `[daily-report-21utc] write to autonomous_loop_outputs failed: ${err.message}`,
      );
    }

    // claim_audit row with source-query hashes.
    let claimAuditId = null;
    try {
      const hashes = sources.map((s) => ({
        source: s.source,
        count: s.count,
        hash: s.hash,
        error: s.error || null,
      }));
      const row = db
        .prepare(
          `INSERT INTO claim_audit (claim_type, claim_subject, payload,
                                    directive_source, outcome, notes)
           VALUES ('daily_report', ?, ?, 'cron:daily-report-21utc',
                   'generated', ?)`,
        )
        .run(
          `Daily Report ${new Date().toISOString().split("T")[0]}`,
          JSON.stringify(hashes),
          `autonomous_loop_outputs id=${outputId}; sources=${sources.length}; errors=${sources.filter((s) => s.error).length}`,
        );
      claimAuditId = row.lastInsertRowid;
    } catch (err) {
      console.error(
        `[daily-report-21utc] claim_audit write failed: ${err.message}`,
      );
    }

    // Dual-route: Telegram + Discord.
    let telegramSent = false;
    try {
      if (telegram && typeof telegram.sendTelegram === "function") {
        await telegram.sendTelegram(report);
        telegramSent = true;
      }
    } catch (err) {
      console.error(
        `[daily-report-21utc] telegram send failed: ${err.message}`,
      );
    }

    let discordSent = false;
    try {
      const res = await discord.send("ops.daily-report", report, {
        reason: "daily-report-21utc-cron",
      });
      discordSent = res.sent;
    } catch (err) {
      console.error(`[daily-report-21utc] discord send failed: ${err.message}`);
    }

    return {
      ok: true,
      output_id: outputId,
      claim_audit_id: claimAuditId,
      sources: sources.length,
      sources_with_errors: sources.filter((s) => s.error).length,
      telegramSent,
      discordSent,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  runDailyReport,
  collectSources,
  renderReport,
};
