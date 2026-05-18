/**
 * Signal Tracker Routes — AIBTC signal lifecycle
 * POST /api/v1/signals/filed — record signal filing + emit event
 * POST /api/v1/signals/status — update signal status from polling
 * GET  /api/v1/signals/streak — get streak info
 */

const express = require("express");
const router = express.Router();
const {
  recordSignalFiled,
  updateSignalStatus,
  getStreakInfo,
} = require("../services/signals/signal-tracker");
const {
  fileSignalDirect,
  checkFilerReady,
} = require("../services/signals/aibtc-direct-filer");
const {
  buildHeartbeatSignal,
  getContainerMetrics,
} = require("../services/signals/heartbeat-template");

// POST /signals/filed — record a filed signal
router.post("/filed", (req, res) => {
  const { signal_id, beat_slug, headline, pacific_date } = req.body;
  if (!signal_id || !beat_slug) {
    return res.status(400).json({ error: "signal_id and beat_slug required" });
  }
  const result = recordSignalFiled({
    signal_id,
    beat_slug,
    headline,
    pacific_date,
  });
  res.json(result);
});

// POST /signals/status — update signal status (from polling)
router.post("/status", (req, res) => {
  const { signal_id, status, publisher_feedback } = req.body;
  if (!signal_id || !status) {
    return res.status(400).json({ error: "signal_id and status required" });
  }
  const result = updateSignalStatus({ signal_id, status, publisher_feedback });
  res.json(result);
});

// GET /signals/streak — streak info
router.get("/streak", (req, res) => {
  res.json(getStreakInfo());
});

// GET /signals/filer/status — direct filer health check
router.get("/filer/status", (req, res) => {
  res.json(checkFilerReady());
});

// GET /signals/filer/heartbeat-preview — preview the heartbeat signal without filing
router.get("/filer/heartbeat-preview", (req, res) => {
  const signal = buildHeartbeatSignal();
  const metrics = getContainerMetrics();
  res.json({ signal, metrics });
});

// POST /signals/file-direct — manual emergency file (admin only, gated by flag)
// Body: optional override of beat_slug, headline, body, sources, tags
// Default: files heartbeat signal if no body provided
router.post("/file-direct", async (req, res) => {
  const ready = checkFilerReady();
  if (!ready.ready) {
    return res.status(503).json({ error: "filer_not_ready", detail: ready });
  }

  const payload =
    req.body && req.body.headline ? req.body : buildHeartbeatSignal();

  const result = await fileSignalDirect(payload);
  res.json(result);
});

module.exports = router;
