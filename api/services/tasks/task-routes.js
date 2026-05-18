const express = require("express");
const router = express.Router();
const tm = require("./task-manager");

router.post("/create", (req, res) => {
  const { name, agent, payload, dependsOn } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  res.json(tm.createTask(name, agent, payload, dependsOn || []));
});

router.post("/complete/:id", (req, res) => {
  res.json(tm.completeTask(parseInt(req.params.id), req.body.result || {}));
});

router.post("/claim/:id", (req, res) => {
  res.json(tm.claimTask(parseInt(req.params.id)));
});

router.post("/fail/:id", (req, res) => {
  res.json(tm.failTask(parseInt(req.params.id), req.body.error || "unknown"));
});

router.get("/ready", (req, res) => {
  res.json(tm.getReadyTasks(req.query.agent));
});

router.get("/status/:id", (req, res) => {
  const task = tm.getTaskStatus(parseInt(req.params.id));
  task ? res.json(task) : res.status(404).json({ error: "not_found" });
});

router.post("/pipeline", (req, res) => {
  if (!req.body.steps?.length)
    return res.status(400).json({ error: "steps required" });
  res.json(tm.createPipeline(req.body.steps));
});

router.post("/fanout", (req, res) => {
  if (!req.body.parentId || !req.body.steps?.length)
    return res.status(400).json({ error: "parentId + steps required" });
  res.json(tm.createFanOut(req.body.parentId, req.body.steps));
});

router.post("/cleanup", (req, res) => {
  res.json(tm.cleanupTasks());
});

module.exports = router;
