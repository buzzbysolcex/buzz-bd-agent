/**
 * Revenue Alert System — Day 32 Sprint Phase 6
 */

const { getDB } = require("../db");
const { sendTelegram } = require("./telegram-notify");

const DEFAULT_MILESTONES = [1000, 5000, 10000, 50000, 100000];
const DEFAULT_DAILY_TARGET = 500;
const ANOMALY_THRESHOLD = 0.3;

function checkMilestones(currentRevenue) {
  const alerts = [];
  for (const milestone of DEFAULT_MILESTONES) {
    if (currentRevenue >= milestone) {
      alerts.push({
        type: "milestone",
        milestone,
        current: currentRevenue,
        message: `Revenue milestone reached: $${milestone.toLocaleString()}`,
      });
    }
  }
  return alerts;
}

function checkDailyTarget(todayRevenue, target = DEFAULT_DAILY_TARGET) {
  if (todayRevenue >= target) {
    return {
      type: "target_exceeded",
      target,
      actual: todayRevenue,
      message: `Daily target exceeded! $${todayRevenue} vs $${target} target`,
    };
  }
  const now = new Date();
  const hoursLeft = 24 - now.getUTCHours();
  if (hoursLeft <= 6 && todayRevenue < target * 0.5) {
    return {
      type: "target_at_risk",
      target,
      actual: todayRevenue,
      pct: Math.round((todayRevenue / target) * 100),
      message: `Daily target at risk: $${todayRevenue} of $${target} (${hoursLeft}h remaining)`,
    };
  }
  return null;
}

function detectAnomaly(todayRevenue, avgRevenue) {
  if (avgRevenue <= 0) return null;
  const dropPct = (avgRevenue - todayRevenue) / avgRevenue;
  if (dropPct >= ANOMALY_THRESHOLD) {
    return {
      type: "revenue_anomaly",
      today: todayRevenue,
      average: avgRevenue,
      drop_pct: Math.round(dropPct * 100),
      message: `Revenue anomaly: $${todayRevenue} is ${Math.round(dropPct * 100)}% below 7-day average ($${Math.round(avgRevenue)})`,
    };
  }
  return null;
}

function formatAlertMessage(alertType, data) {
  const emoji = {
    milestone: "\u{1F3C6}",
    target_exceeded: "\u{1F3AF}",
    target_at_risk: "\u{26A0}\u{FE0F}",
    revenue_anomaly: "\u{1F534}",
  };
  return `${emoji[alertType] || "\u{1F4CA}"} *Buzz Revenue Alert*\n\n${data.message}\n\n_${new Date().toISOString()}_`;
}

async function sendTelegramAlert(message, options = {}) {
  // Revenue alerts are non-sensitive (pipeline reports, milestones) → send to both DM + War Room
  // Unless caller explicitly marks as sensitive (e.g., commission data)
  const result = await sendTelegram(message, {
    sensitive: options.sensitive || false,
    parseMode: "Markdown",
  });
  // Return backward-compatible shape
  return {
    sent: result.dm.sent,
    message_id: result.dm.message_id,
    warRoom: result.warRoom,
  };
}

function runAlertCheck() {
  const db = getDB();
  const todayRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events WHERE date(created_at) = date('now')",
    )
    .get().total;
  const avgRevenue = db
    .prepare(
      "SELECT COALESCE(AVG(daily_total), 0) as avg FROM (SELECT date(created_at) as d, SUM(amount_usd) as daily_total FROM revenue_events WHERE created_at >= datetime('now', '-7 days') GROUP BY d)",
    )
    .get().avg;
  const totalRevenue = db
    .prepare("SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events")
    .get().total;

  const alerts = [];
  alerts.push(...checkMilestones(totalRevenue));
  const targetAlert = checkDailyTarget(todayRevenue);
  if (targetAlert) alerts.push(targetAlert);
  const anomalyAlert = detectAnomaly(todayRevenue, avgRevenue);
  if (anomalyAlert) alerts.push(anomalyAlert);
  return alerts;
}

module.exports = {
  checkMilestones,
  checkDailyTarget,
  detectAnomaly,
  formatAlertMessage,
  sendTelegramAlert,
  runAlertCheck,
};
