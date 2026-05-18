/**
 * Colosseum Copilot Routes — Intel Source #18
 * GET /api/v1/copilot/search?q={query}        — Project search
 * GET /api/v1/copilot/enrich/:tokenName       — Token enrichment for pipeline
 * GET /api/v1/copilot/cluster/:key            — Cluster details
 * GET /api/v1/copilot/trends                  — Hackathon trend comparison
 * GET /api/v1/copilot/landscape?q={query}     — Full landscape check
 */

const express = require("express");

module.exports = function () {
  const router = express.Router();
  const copilot = require("../lib/colosseum-copilot");

  router.get("/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q) return res.status(400).json({ error: "q parameter required" });
      const data = await copilot.searchProjects(q, {}, parseInt(limit) || 10);
      res.json(data);
    } catch (e) {
      res
        .status(e.message.includes("RATE_LIMITED") ? 429 : 500)
        .json({ error: e.message });
    }
  });

  router.get("/enrich/:tokenName", async (req, res) => {
    try {
      const { tokenName } = req.params;
      const { description } = req.query;
      const data = await copilot.enrichTokenWithHackathonData(
        tokenName,
        description || "",
      );
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/cluster/:key", async (req, res) => {
    try {
      const data = await copilot.getCluster(req.params.key);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/trends", async (req, res) => {
    try {
      const data = await copilot.getWeeklyTrends();
      if (!data) return res.status(500).json({ error: "Trends fetch failed" });
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/landscape", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: "q parameter required" });
      const [projects, archives] = await Promise.all([
        copilot.searchProjects(q, {}, 10),
        copilot.searchArchives(q, [], 5),
      ]);
      res.json({ projects, archives, query: q });
    } catch (e) {
      res
        .status(e.message.includes("RATE_LIMITED") ? 429 : 500)
        .json({ error: e.message });
    }
  });

  router.get("/status", async (req, res) => {
    try {
      const data = await copilot.checkStatus();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
