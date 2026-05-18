/**
 * Agent Interview Routes — Feature 3
 * GET  /:simulationId/agents    — list all interviewable agents from a simulation
 * POST /:simulationId/:agentIndex — interview a specific agent
 *
 * Both endpoints are public (x402 paywall on premium handles monetization separately).
 *
 * Buzz BD Agent | SolCex
 */

const express = require("express");
const router = express.Router();
const {
  listInterviewableAgents,
  interviewAgent,
} = require("../lib/agent-interviewer");

// ─── GET /:simulationId/agents ──────────────────────────
// Returns the list of agents from a simulation with bull/bear flags.

router.get("/:simulationId/agents", (req, res) => {
  try {
    const { simulationId } = req.params;

    if (!simulationId) {
      return res.status(400).json({
        error: "simulationId is required",
        code: "MISSING_SIMULATION_ID",
      });
    }

    const result = listInterviewableAgents(simulationId);

    return res.json({
      success: true,
      simulationId: result.simulationId,
      symbol: result.symbol,
      chain: result.chain,
      score: result.score,
      recommendation: result.recommendation,
      consensus: result.consensus,
      agentCount: result.agentCount,
      agents: result.agents,
    });
  } catch (err) {
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({
      success: false,
      error: err.message,
      code: status === 404 ? "SIMULATION_NOT_FOUND" : "INTERVIEW_ERROR",
    });
  }
});

// ─── POST /:simulationId/:agentIndex ────────────────────
// Interview a specific agent. Body: { question, conversation_history? }

router.post("/:simulationId/:agentIndex", async (req, res) => {
  try {
    const { simulationId, agentIndex } = req.params;
    const { question, conversation_history } = req.body || {};

    if (!simulationId) {
      return res.status(400).json({
        error: "simulationId is required",
        code: "MISSING_SIMULATION_ID",
      });
    }

    const parsedIndex = parseInt(agentIndex, 10);
    if (isNaN(parsedIndex) || parsedIndex < 0) {
      return res.status(400).json({
        error: "agentIndex must be a non-negative integer",
        code: "INVALID_AGENT_INDEX",
      });
    }

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return res.status(400).json({
        error: "question is required and must be a non-empty string",
        code: "MISSING_QUESTION",
      });
    }

    // Validate conversation_history format if provided
    const history = Array.isArray(conversation_history)
      ? conversation_history
      : [];

    const result = await interviewAgent(
      simulationId,
      parsedIndex,
      question.trim(),
      history,
    );

    return res.json({
      success: true,
      simulationId,
      agent: result.agent,
      response: result.response,
      model: result.model,
      cost: result.cost,
    });
  } catch (err) {
    let status = 500;
    let code = "INTERVIEW_ERROR";

    if (err.message.includes("not found")) {
      status = 404;
      code = "SIMULATION_NOT_FOUND";
    } else if (err.message.includes("Invalid agent index")) {
      status = 400;
      code = "INVALID_AGENT_INDEX";
    } else if (err.message.includes("abstained")) {
      status = 400;
      code = "AGENT_ABSTAINED";
    }

    return res.status(status).json({
      success: false,
      error: err.message,
      code,
    });
  }
});

module.exports = router;
