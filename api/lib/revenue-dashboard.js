/**
 * Revenue Dashboard Data Layer — Day 32 Sprint Phase 5
 */

const { getDB } = require("../db");

function getDailyRollup(date) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT date(created_at) as date, COALESCE(SUM(amount_usd), 0) as total_usd,
      COUNT(*) as deal_count, COALESCE(AVG(amount_usd), 0) as avg_deal_size,
      COUNT(DISTINCT chain) as chains_active
    FROM revenue_events WHERE date(created_at) = ?
  `,
    )
    .get(date || new Date().toISOString().split("T")[0]);
}

function getWeeklyRollup(weekStart) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT COALESCE(SUM(amount_usd), 0) as total_usd, COUNT(*) as deal_count,
      COALESCE(AVG(amount_usd), 0) as avg_deal_size
    FROM revenue_events
    WHERE date(created_at) >= ? AND date(created_at) < date(?, '+7 days')
  `,
    )
    .get(weekStart, weekStart);
}

function getMonthlyRollup(yearMonth) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT COALESCE(SUM(amount_usd), 0) as total_usd, COUNT(*) as deal_count,
      COALESCE(AVG(amount_usd), 0) as avg_deal_size
    FROM revenue_events WHERE strftime('%Y-%m', created_at) = ?
  `,
    )
    .get(yearMonth || new Date().toISOString().slice(0, 7));
}

function getTopTokensByRevenue(limit = 10, periodDays = 30) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT token_address, chain, token_ticker, SUM(amount_usd) as total_revenue,
      COUNT(*) as event_count, MAX(created_at) as last_event
    FROM revenue_events
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY token_address, chain
    ORDER BY total_revenue DESC LIMIT ?
  `,
    )
    .all(periodDays, limit);
}

function getRevenueByChain(periodDays = 30) {
  const db = getDB();
  return db
    .prepare(
      `
    SELECT chain, COALESCE(SUM(amount_usd), 0) as total_usd, COUNT(*) as count,
      COALESCE(AVG(amount_usd), 0) as avg_deal
    FROM revenue_events
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY chain ORDER BY total_usd DESC
  `,
    )
    .all(periodDays);
}

function getRevenueVelocity() {
  const db = getDB();
  const current7d = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events
    WHERE created_at >= datetime('now', '-7 days')
  `,
    )
    .get();
  const prev7d = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events
    WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
  `,
    )
    .get();

  const growth =
    prev7d.total > 0
      ? ((current7d.total - prev7d.total) / prev7d.total) * 100
      : 0;
  return {
    current_7d_usd: current7d.total,
    previous_7d_usd: prev7d.total,
    growth_pct: Math.round(growth * 10) / 10,
    daily_run_rate: Math.round((current7d.total / 7) * 100) / 100,
  };
}

function getKPIs() {
  const db = getDB();
  const total = db
    .prepare(
      "SELECT COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count, COALESCE(AVG(amount_usd), 0) as avg FROM revenue_events",
    )
    .get();
  const mtd = db
    .prepare(
      "SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
    )
    .get();
  const pipeline = db
    .prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(estimated_revenue_usd), 0) as value FROM pipeline_revenue_attribution WHERE current_stage NOT IN ('listed', 'rejected')",
    )
    .get();
  const conversion = db
    .prepare(
      "SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(CASE WHEN current_stage = 'listed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) ELSE 0 END as rate FROM pipeline_revenue_attribution",
    )
    .get();
  const velocity = getRevenueVelocity();

  return {
    total_revenue_usd: total.total,
    total_deals: total.count,
    avg_deal_size_usd: Math.round(total.avg * 100) / 100,
    mtd_revenue_usd: mtd.total,
    mrr_usd: Math.round(velocity.daily_run_rate * 30 * 100) / 100,
    pipeline_value_usd: pipeline.value,
    pipeline_count: pipeline.count,
    conversion_rate_pct: conversion.rate,
    revenue_velocity: velocity,
  };
}

module.exports = {
  getDailyRollup,
  getWeeklyRollup,
  getMonthlyRollup,
  getTopTokensByRevenue,
  getRevenueByChain,
  getRevenueVelocity,
  getKPIs,
};
