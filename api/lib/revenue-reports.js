/**
 * Revenue Reporting & Analytics — Day 32 Sprint Phase 7
 */

const { getDB } = require("../db");
const dashboard = require("./revenue-dashboard");

function generateDailyReport(date) {
  const db = getDB();
  const d = date || new Date().toISOString().split("T")[0];
  const prevDay = new Date(new Date(d).getTime() - 86400000)
    .toISOString()
    .split("T")[0];

  const today = dashboard.getDailyRollup(d);
  const yesterday = dashboard.getDailyRollup(prevDay);

  const avg7d = db
    .prepare(
      `
    SELECT COALESCE(AVG(daily_total), 0) as avg FROM (
      SELECT SUM(amount_usd) as daily_total FROM revenue_events
      WHERE date(created_at) >= date(?, '-7 days') AND date(created_at) < ?
      GROUP BY date(created_at)
    )
  `,
    )
    .get(d, d);

  const topTokens = db
    .prepare(
      `
    SELECT token_address, chain, token_ticker, SUM(amount_usd) as total
    FROM revenue_events WHERE date(created_at) = ?
    GROUP BY token_address, chain ORDER BY total DESC LIMIT 5
  `,
    )
    .all(d);

  const byChain = db
    .prepare(
      `
    SELECT chain, SUM(amount_usd) as total, COUNT(*) as count
    FROM revenue_events WHERE date(created_at) = ? GROUP BY chain
  `,
    )
    .all(d);

  return {
    date: d,
    revenue: today,
    comparison: {
      vs_yesterday:
        yesterday.total_usd > 0
          ? Math.round(
              ((today.total_usd - yesterday.total_usd) / yesterday.total_usd) *
                100,
            )
          : 0,
      vs_7d_avg:
        avg7d.avg > 0
          ? Math.round(((today.total_usd - avg7d.avg) / avg7d.avg) * 100)
          : 0,
    },
    top_tokens: topTokens,
    by_chain: byChain,
  };
}

function generateWeeklyReport(weekStart) {
  const db = getDB();
  const ws = weekStart || getMonday(new Date()).toISOString().split("T")[0];
  const prevWeekStart = new Date(new Date(ws).getTime() - 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const thisWeek = dashboard.getWeeklyRollup(ws);
  const lastWeek = dashboard.getWeeklyRollup(prevWeekStart);

  const bySource = db
    .prepare(
      `
    SELECT source, SUM(amount_usd) as total, COUNT(*) as count
    FROM revenue_events
    WHERE date(created_at) >= ? AND date(created_at) < date(?, '+7 days')
    GROUP BY source ORDER BY total DESC
  `,
    )
    .all(ws, ws);

  const funnel = db
    .prepare(
      `
    SELECT current_stage, COUNT(*) as count
    FROM pipeline_revenue_attribution GROUP BY current_stage
  `,
    )
    .all();

  return {
    week_start: ws,
    revenue: thisWeek,
    wow_change_pct:
      lastWeek.total_usd > 0
        ? Math.round(
            ((thisWeek.total_usd - lastWeek.total_usd) / lastWeek.total_usd) *
              100,
          )
        : 0,
    by_source: bySource,
    pipeline_funnel: funnel,
  };
}

function generateMonthlyReport(yearMonth) {
  const db = getDB();
  const ym = yearMonth || new Date().toISOString().slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;

  const thisMonth = dashboard.getMonthlyRollup(ym);
  const lastMonth = dashboard.getMonthlyRollup(prevMonth);

  const topTokens = db
    .prepare(
      `
    SELECT token_address, chain, token_ticker, SUM(amount_usd) as total
    FROM revenue_events WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY token_address, chain ORDER BY total DESC LIMIT 10
  `,
    )
    .all(ym);

  const byChain = db
    .prepare(
      `
    SELECT chain, SUM(amount_usd) as total, COUNT(*) as count
    FROM revenue_events WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY chain ORDER BY total DESC
  `,
    )
    .all(ym);

  const daysInMonth = new Date(y, m, 0).getDate();
  const daysPassed =
    ym === new Date().toISOString().slice(0, 7)
      ? new Date().getDate()
      : daysInMonth;
  const projectedTotal =
    daysPassed > 0
      ? Math.round((thisMonth.total_usd / daysPassed) * daysInMonth * 100) / 100
      : 0;

  return {
    month: ym,
    revenue: thisMonth,
    mom_change_pct:
      lastMonth.total_usd > 0
        ? Math.round(
            ((thisMonth.total_usd - lastMonth.total_usd) /
              lastMonth.total_usd) *
              100,
          )
        : 0,
    projected_total_usd: projectedTotal,
    top_tokens: topTokens,
    by_chain: byChain,
  };
}

function forecastRevenue(daysAhead = 30) {
  const db = getDB();
  const dailyRevenues = db
    .prepare(
      `
    SELECT date(created_at) as d, SUM(amount_usd) as total
    FROM revenue_events WHERE created_at >= datetime('now', '-30 days')
    GROUP BY d ORDER BY d
  `,
    )
    .all();

  if (dailyRevenues.length < 2) {
    return {
      forecast_days: daysAhead,
      projected_daily: 0,
      projected_total: 0,
      confidence: "low",
      data_points: dailyRevenues.length,
    };
  }

  const values = dailyRevenues.map((r) => r.total);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  // Simple linear trend
  const n = values.length;
  const xMean = (n - 1) / 2;
  const slope =
    values.reduce((s, v, i) => s + (i - xMean) * (v - avg), 0) /
    values.reduce((s, _, i) => s + (i - xMean) ** 2, 0);

  const lastValue = values[values.length - 1];
  const projectedDaily = Math.max(0, lastValue + slope);

  return {
    forecast_days: daysAhead,
    projected_daily: Math.round(projectedDaily * 100) / 100,
    projected_total: Math.round(projectedDaily * daysAhead * 100) / 100,
    trend_slope: Math.round(slope * 100) / 100,
    confidence:
      stddev / avg < 0.3 ? "high" : stddev / avg < 0.6 ? "medium" : "low",
    confidence_band: {
      low:
        Math.round(Math.max(0, projectedDaily - stddev) * daysAhead * 100) /
        100,
      high: Math.round((projectedDaily + stddev) * daysAhead * 100) / 100,
    },
    data_points: n,
  };
}

function getExecutiveSummary() {
  const db = getDB();
  const kpis = dashboard.getKPIs();

  const ytd = db
    .prepare(
      "SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events WHERE strftime('%Y', created_at) = strftime('%Y', 'now')",
    )
    .get();
  const pipelineHealth = db
    .prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN current_stage IN ('contacted', 'negotiating', 'approved') THEN 1 ELSE 0 END) as active FROM pipeline_revenue_attribution WHERE current_stage NOT IN ('listed', 'rejected')",
    )
    .get();

  const forecast = forecastRevenue(30);

  // Health score: 0-100 based on multiple factors
  let healthScore = 50;
  if (kpis.conversion_rate_pct > 10) healthScore += 15;
  if (kpis.revenue_velocity.growth_pct > 0) healthScore += 15;
  if (pipelineHealth.active > 5) healthScore += 10;
  if (forecast.confidence === "high") healthScore += 10;
  healthScore = Math.min(100, healthScore);

  return {
    mtd_revenue_usd: kpis.mtd_revenue_usd,
    ytd_revenue_usd: ytd.total,
    mrr_usd: kpis.mrr_usd,
    pipeline_value_usd: kpis.pipeline_value_usd,
    pipeline_count: kpis.pipeline_count,
    conversion_rate_pct: kpis.conversion_rate_pct,
    revenue_velocity: kpis.revenue_velocity,
    forecast_30d: forecast.projected_total,
    health_score: healthScore,
    health_label:
      healthScore >= 80
        ? "excellent"
        : healthScore >= 60
          ? "good"
          : healthScore >= 40
            ? "fair"
            : "needs_attention",
  };
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

module.exports = {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  forecastRevenue,
  getExecutiveSummary,
};
