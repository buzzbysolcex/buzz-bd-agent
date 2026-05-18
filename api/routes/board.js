/**
 * Activity Board Routes — v8.2.0 ClawTeam Pattern 3
 * GET /api/v1/board/activity — Activity feed (filterable)
 * GET /api/v1/board/summary — Dashboard summary
 * GET /api/v1/board/templates — List TOML templates
 */

const express = require("express");

module.exports = function (db, activityBoard, taskChainExecutor) {
  const router = express.Router();

  // Activity feed
  router.get("/activity", (req, res) => {
    const { hours, agent, type, limit } = req.query;
    const events = activityBoard.getActivity({
      hours: parseInt(hours) || 24,
      agent: agent || undefined,
      eventType: type || undefined,
      limit: parseInt(limit) || 50,
    });
    res.json({ events, count: events.length });
  });

  // Dashboard summary
  router.get("/summary", (req, res) => {
    const hours = parseInt(req.query.hours) || 24;
    const summary = activityBoard.getSummary(hours);
    res.json(summary);
  });

  // List templates
  router.get("/templates", (req, res) => {
    const templates = taskChainExecutor.listTemplates();
    res.json({ templates, count: templates.length });
  });

  return router;
};
