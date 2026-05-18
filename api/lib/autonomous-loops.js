/**
 * Autonomous Loop Crons — Day 32 Sprint Phase 4
 * Morning Brief (07:00 WIB), Discovery Alert (every 4h), Evening Recap (21:00 WIB)
 */

const { getDB } = require("../db");

function startLoopRun(loopType) {
  const db = getDB();
  const result = db
    .prepare(
      `
    INSERT INTO loop_cron_runs (loop_type, scheduled_at) VALUES (?, datetime('now'))
  `,
    )
    .run(loopType);
  return result.lastInsertRowid;
}

function completeLoopRun(
  runId,
  { tokensProcessed = 0, alertsGenerated = 0, summary = "", error = null },
) {
  const db = getDB();
  const run = db
    .prepare("SELECT started_at FROM loop_cron_runs WHERE id = ?")
    .get(runId);
  const duration = run ? Date.now() - new Date(run.started_at).getTime() : 0;

  db.prepare(
    `
    UPDATE loop_cron_runs
    SET completed_at = datetime('now'), status = ?, tokens_processed = ?,
        alerts_generated = ?, output_summary = ?, error = ?, duration_ms = ?
    WHERE id = ?
  `,
  ).run(
    error ? "error" : "completed",
    tokensProcessed,
    alertsGenerated,
    summary,
    error,
    duration,
    runId,
  );
}

function saveLoopOutput(
  runId,
  { outputType, title, content, tokensMentioned = [], sentTo = null },
) {
  const db = getDB();
  return db
    .prepare(
      `
    INSERT INTO loop_cron_outputs (run_id, output_type, title, content, tokens_mentioned, sent_to)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      runId,
      outputType,
      title || null,
      content,
      JSON.stringify(tokensMentioned),
      sentTo,
    );
}

function generateMorningBrief() {
  const db = getDB();
  const runId = startLoopRun("morning_brief");

  try {
    const pipeline = db
      .prepare(
        `
      SELECT current_stage, COUNT(*) as count FROM pipeline_revenue_attribution
      GROUP BY current_stage
    `,
      )
      .all();

    const todayRevenue = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events
      WHERE date(created_at) = date('now')
    `,
      )
      .get();

    const hotTokens = db
      .prepare(
        `
      SELECT token_address, chain, token_ticker, conversion_probability
      FROM pipeline_revenue_attribution
      WHERE conversion_probability > 0.5 AND current_stage NOT IN ('listed', 'rejected')
      ORDER BY conversion_probability DESC LIMIT 5
    `,
      )
      .all();

    const brief = {
      date: new Date().toISOString().split("T")[0],
      pipeline_summary: pipeline,
      today_revenue_usd: todayRevenue.total,
      hot_prospects: hotTokens,
      action_items: hotTokens.map(
        (t) =>
          `Follow up on ${t.token_ticker || t.token_address.slice(0, 8)} (${Math.round(t.conversion_probability * 100)}% conversion)`,
      ),
    };

    saveLoopOutput(runId, {
      outputType: "morning_brief",
      title: `Morning Brief — ${brief.date}`,
      content: JSON.stringify(brief),
      tokensMentioned: hotTokens.map((t) => t.token_address),
    });

    completeLoopRun(runId, {
      tokensProcessed: hotTokens.length,
      alertsGenerated: 1,
      summary: `Pipeline: ${pipeline.length} stages, Revenue: $${todayRevenue.total}`,
    });
    return brief;
  } catch (e) {
    completeLoopRun(runId, { error: e.message });
    throw e;
  }
}

function generateDiscoveryAlert() {
  const db = getDB();
  const runId = startLoopRun("discovery_alert");

  try {
    const recentTokens = db
      .prepare(
        `
      SELECT token_address, chain, token_ticker, discovery_source, current_stage, conversion_probability
      FROM pipeline_revenue_attribution
      WHERE created_at >= datetime('now', '-4 hours')
      ORDER BY conversion_probability DESC
    `,
      )
      .all();

    const highPriority = recentTokens.filter(
      (t) => t.conversion_probability >= 0.25,
    );

    const alert = {
      period: "4h",
      new_discoveries: recentTokens.length,
      high_priority: highPriority,
      sources: [
        ...new Set(recentTokens.map((t) => t.discovery_source).filter(Boolean)),
      ],
    };

    if (recentTokens.length > 0) {
      saveLoopOutput(runId, {
        outputType: "discovery_alert",
        title: `Discovery Alert — ${recentTokens.length} new tokens`,
        content: JSON.stringify(alert),
        tokensMentioned: recentTokens.map((t) => t.token_address),
      });
    }

    completeLoopRun(runId, {
      tokensProcessed: recentTokens.length,
      alertsGenerated: highPriority.length,
      summary: `${recentTokens.length} discovered, ${highPriority.length} high-priority`,
    });
    return alert;
  } catch (e) {
    completeLoopRun(runId, { error: e.message });
    throw e;
  }
}

function generateEveningRecap() {
  const db = getDB();
  const runId = startLoopRun("evening_recap");

  try {
    const todayRevenue = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count
      FROM revenue_events WHERE date(created_at) = date('now')
    `,
      )
      .get();

    const stageChanges = db
      .prepare(
        `
      SELECT current_stage, COUNT(*) as count
      FROM pipeline_revenue_attribution
      WHERE date(updated_at) = date('now')
      GROUP BY current_stage
    `,
      )
      .all();

    const todayRuns = db
      .prepare(
        `
      SELECT loop_type, COUNT(*) as runs, SUM(tokens_processed) as tokens,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM loop_cron_runs WHERE date(started_at) = date('now')
      GROUP BY loop_type
    `,
      )
      .all();

    const recap = {
      date: new Date().toISOString().split("T")[0],
      revenue: {
        total_usd: todayRevenue.total,
        deal_count: todayRevenue.count,
      },
      pipeline_activity: stageChanges,
      loop_performance: todayRuns,
      health: todayRuns.some((r) => r.errors > 0) ? "degraded" : "healthy",
    };

    saveLoopOutput(runId, {
      outputType: "evening_recap",
      title: `Evening Recap — ${recap.date}`,
      content: JSON.stringify(recap),
    });

    completeLoopRun(runId, {
      tokensProcessed: stageChanges.reduce((s, c) => s + c.count, 0),
      alertsGenerated: 1,
      summary: `Revenue: $${todayRevenue.total}, ${stageChanges.length} stage groups active`,
    });
    return recap;
  } catch (e) {
    completeLoopRun(runId, { error: e.message });
    throw e;
  }
}

function getLoopHistory(loopType, limit = 20) {
  const db = getDB();
  let sql = "SELECT * FROM loop_cron_runs";
  const params = [];
  if (loopType) {
    sql += " WHERE loop_type = ?";
    params.push(loopType);
  }
  sql += " ORDER BY started_at DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params);
}

module.exports = {
  generateMorningBrief,
  generateDiscoveryAlert,
  generateEveningRecap,
  getLoopHistory,
  startLoopRun,
  completeLoopRun,
  saveLoopOutput,
};
