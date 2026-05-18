const express = require("express");
const router = express.Router();
const trust = require("../services/trust/trust-gates");
const { apiKeyAuth } = require("../middleware/auth");

router.use(apiKeyAuth);

router.get("/state", (req, res) => {
  res.json(trust.getTrustState());
});

router.get("/audit", (req, res) => {
  res.json(trust.getAudit(parseInt(req.query.limit) || 20));
});

router.post("/promote", (req, res) => {
  res.json(trust.promote(req.body.reason || "Manual promotion"));
});

router.post("/demote", (req, res) => {
  res.json(trust.demote(req.body.reason || "Manual demotion"));
});

router.post("/complaint", (req, res) => {
  trust.recordComplaint(req.body.reason || "Complaint received");
  res.json({ reset: true });
});

module.exports = router;
