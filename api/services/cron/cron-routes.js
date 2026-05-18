const express = require("express");
const router = express.Router();
const dc = require("./dynamic-cron");

router.post("/create", (req, res) => {
  const { agent, name, schedule, payload, maxRuns, expiresAt } = req.body;
  if (!agent || !name || !schedule)
    return res.status(400).json({ error: "agent, name, schedule required" });
  res.json(
    dc.createCron(agent, name, schedule, payload, { maxRuns, expiresAt }),
  );
});

router.get("/active", (req, res) => {
  const crons = dc.getDueCrons();
  const filtered = req.query.agent
    ? crons.filter((c) => c.agent === req.query.agent)
    : crons;
  res.json({ count: filtered.length, crons: filtered });
});

router.post("/deactivate/:id", (req, res) => {
  res.json(dc.deactivate(parseInt(req.params.id)));
});
router.get("/due", (req, res) => {
  res.json(dc.getDueCrons());
});
router.post("/cleanup", (req, res) => {
  res.json(dc.cleanupCrons());
});

module.exports = router;
