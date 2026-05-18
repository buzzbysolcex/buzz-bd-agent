const express = require("express");
const router = express.Router();
const outreach = require("../services/outreach/outreach-engine");
const { apiKeyAuth } = require("../middleware/auth");

router.use(apiKeyAuth);

router.post("/queue", (req, res) => {
  const { tokenAddress, chain, contactEmail, subject, body, trustAction } =
    req.body;
  if (!tokenAddress || !contactEmail || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const result = outreach.queueOutreach(
    tokenAddress,
    chain,
    contactEmail,
    subject,
    body,
    trustAction || "APPROVAL_REQUIRED",
  );
  res.json(result);
});

router.post("/veto/:id", (req, res) => {
  res.json(outreach.vetoOutreach(parseInt(req.params.id)));
});

router.post("/approve/:id", (req, res) => {
  res.json(outreach.approveOutreach(parseInt(req.params.id)));
});

router.get("/stats", (req, res) => {
  res.json(outreach.getStats());
});

router.get("/contacts/:tokenAddress", (req, res) => {
  res.json(outreach.getContacts(req.params.tokenAddress));
});

module.exports = router;
