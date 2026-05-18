/**
 * Service Catalog Routes — 21 services
 * GET /services, /services/:id, /services/category/:cat, /stats
 */

const express = require("express");
const router = express.Router();
const { apiKeyAuth } = require("../middleware/auth");
const {
  SERVICES,
  getService,
  getByCategory,
  getStats,
} = require("../services/catalog/service-registry");

// GET /stats — must be before /:id to avoid matching "stats" as an id
router.get("/stats", apiKeyAuth, (req, res) => {
  res.json(getStats());
});

// GET /services/category/:cat
router.get("/services/category/:cat", apiKeyAuth, (req, res) => {
  const services = getByCategory(req.params.cat);
  res.json(services);
});

// GET /services/:id
router.get("/services/:id", apiKeyAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const service = getService(id);
  if (!service) return res.status(404).json({ error: "Service not found" });
  res.json(service);
});

// GET /services — all 21 services
router.get("/services", apiKeyAuth, (req, res) => {
  res.json(SERVICES);
});

module.exports = router;
