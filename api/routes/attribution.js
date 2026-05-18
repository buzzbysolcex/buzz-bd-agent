/**
 * Pipeline Revenue Attribution Routes — Day 32 Sprint Phase 3
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const attribution = require("../lib/revenue-attribution");

router.get("/report", (req, res) => {
  const report = attribution.getAttributionReport(req.query);
  res.json(report);
});

router.get("/by-source", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const sources = attribution.getTopPerformingSources(limit);
  res.json({ count: sources.length, sources });
});

router.get("/token/:address", (req, res) => {
  const db = getDB();
  const { chain } = req.query;

  let sql =
    "SELECT * FROM pipeline_revenue_attribution WHERE token_address = ?";
  const params = [req.params.address];
  if (chain) {
    sql += " AND chain = ?";
    params.push(chain);
  }

  const records = db.prepare(sql).all(...params);
  if (records.length === 0) {
    return res
      .status(404)
      .json({ error: "not_found", code: "TOKEN_NOT_FOUND" });
  }
  res.json(
    records.length === 1 ? records[0] : { count: records.length, records },
  );
});

router.get("/funnel", (req, res) => {
  const db = getDB();
  const stages = [
    "discovered",
    "scanned",
    "scored",
    "prospect",
    "contacted",
    "negotiating",
    "approved",
    "listed",
  ];

  const counts = db
    .prepare(
      `
    SELECT current_stage, COUNT(*) as count
    FROM pipeline_revenue_attribution
    GROUP BY current_stage
  `,
    )
    .all();

  const countMap = {};
  for (const row of counts) countMap[row.current_stage] = row.count;

  const funnel = stages.map((stage, i) => {
    const count = countMap[stage] || 0;
    const prevCount = i === 0 ? count : countMap[stages[i - 1]] || 0;
    return {
      stage,
      count,
      drop_off_rate:
        i === 0
          ? 0
          : prevCount > 0
            ? Math.round((1 - count / prevCount) * 100)
            : 100,
    };
  });

  const rejected = countMap["rejected"] || 0;
  res.json({
    funnel,
    rejected,
    total: Object.values(countMap).reduce((s, v) => s + v, 0),
  });
});

module.exports = router;
