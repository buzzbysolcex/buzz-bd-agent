/**
 * Listing Proposal Routes — Buzz BD Agent
 * POST /api/v1/listing-proposal   — Generate proposal from pipeline + simulation data
 * GET  /api/v1/listing-proposal/:id — Return stored proposal as HTML
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { generateProposal } = require("../services/listing-proposal");

// POST /api/v1/listing-proposal
router.post("/", async (req, res) => {
  try {
    const { tokenAddress, ticker, chain, includeSimulation } = req.body;
    if (!tokenAddress && !ticker) {
      return res.status(400).json({ error: "tokenAddress or ticker required" });
    }

    const db = getDB();

    // Look up token
    let token = null;
    if (ticker) {
      token = db
        .prepare(
          "SELECT * FROM pipeline_tokens WHERE ticker = ? COLLATE NOCASE ORDER BY updated_at DESC LIMIT 1",
        )
        .get(ticker);
    }
    if (!token && tokenAddress) {
      token = db
        .prepare(
          "SELECT * FROM pipeline_tokens WHERE address = ? ORDER BY updated_at DESC LIMIT 1",
        )
        .get(tokenAddress);
    }

    // Get score data
    let score = null;
    const addr = token?.address || tokenAddress;
    if (addr) {
      try {
        score = db
          .prepare("SELECT * FROM token_scores WHERE address = ?")
          .get(addr);
      } catch (e) {
        /* table may not exist */
      }
    }

    // Get simulation data
    let simulation = null;
    if (ticker) {
      try {
        simulation = db
          .prepare(
            "SELECT * FROM listing_simulations WHERE ticker = ? COLLATE NOCASE ORDER BY id DESC LIMIT 1",
          )
          .get(ticker);
      } catch (e) {
        /* table may not exist */
      }
    }
    if (!simulation && addr) {
      try {
        simulation = db
          .prepare(
            "SELECT * FROM listing_simulations WHERE token_address = ? ORDER BY id DESC LIMIT 1",
          )
          .get(addr);
      } catch (e) {
        /* table may not exist */
      }
    }

    // Parse simulation data
    let simData = null;
    if (simulation) {
      simData = {
        probability: simulation.probability,
        confidence: simulation.confidence,
        recommendation: simulation.recommendation,
        agents_count: simulation.agents_count,
        clusters: {},
        key_risk: simulation.key_risk,
        key_signal: simulation.key_signal,
      };
      try {
        simData.clusters.degen = JSON.parse(simulation.cluster_degen);
      } catch (e) {
        /* ignore */
      }
      try {
        simData.clusters.whale = JSON.parse(simulation.cluster_whale);
      } catch (e) {
        /* ignore */
      }
      try {
        simData.clusters.institutional = JSON.parse(
          simulation.cluster_institutional,
        );
      } catch (e) {
        /* ignore */
      }
      try {
        simData.clusters.community = JSON.parse(simulation.cluster_community);
      } catch (e) {
        /* ignore */
      }
    }

    const reportData = {
      token: token || {
        ticker,
        address: tokenAddress,
        chain: chain || "solana",
      },
      scan: score,
      score: score || { score: token?.score },
      safety: score,
      simulation: simData,
      ev: simulation
        ? {
            ev: simulation.ev,
            formula: `EV = ${simulation.probability} x 1000 - ${(1 - (simulation.probability || 0)).toFixed(2)} x 500 = ${simulation.ev}`,
          }
        : null,
    };

    const { html, metadata } = generateProposal(reportData);

    // Store proposal
    const result = db
      .prepare(
        `
      INSERT INTO listing_proposals (token_address, ticker, chain, score, ev, recommendation, html_content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        addr || "",
        ticker || token?.ticker || "",
        chain || token?.chain || "solana",
        metadata.score,
        metadata.ev,
        metadata.recommendation,
        html,
      );

    res.json({
      success: true,
      proposalId: Number(result.lastInsertRowid),
      metadata,
      html,
    });
  } catch (err) {
    console.error("[listing-proposal] POST error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/listing-proposal/:id — Return HTML
router.get("/:id", (req, res) => {
  try {
    const db = getDB();
    const proposal = db
      .prepare("SELECT * FROM listing_proposals WHERE id = ?")
      .get(req.params.id);
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    res.setHeader("Content-Type", "text/html");
    res.send(proposal.html_content);
  } catch (err) {
    console.error("[listing-proposal] GET error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
