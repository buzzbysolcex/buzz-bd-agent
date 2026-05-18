// Solana Agent Skills — /.well-known/skills dynamic endpoint
// Feature-gated: SOLANA_AGENT_SKILL
// Returns live stats (token count, table count) alongside skill metadata

const { feature } = require("../lib/feature-flags");
const { getDB } = require("../db");

module.exports = function (app) {
  app.get("/.well-known/skills", (req, res) => {
    if (!feature("SOLANA_AGENT_SKILL")) {
      return res.status(404).json({ error: "Skills endpoint disabled" });
    }

    let tokenCount = 0;
    let tableCount = 0;
    try {
      const tc = getDB()
        .prepare("SELECT COUNT(*) as c FROM pipeline_tokens")
        .get();
      tokenCount = tc?.c || 0;
      const tbl = getDB()
        .prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'")
        .get();
      tableCount = tbl?.c || 0;
    } catch (e) {
      /* fallback to 0 */
    }

    res.json({
      agent: {
        name: "Buzz BD Agent",
        version: "9.2.0",
        description:
          "Autonomous exchange listing intelligence — token scoring, swarm simulation, BD screening",
        operator: "SolCex Exchange",
        erc8004: "#17681",
        website: "https://buzzbd.ai",
        twitter: "@BuzzBySolCex",
      },
      skills: [
        {
          name: "buzz-token-intelligence",
          version: "1.0.0",
          description:
            "AI agent skill for token scoring, swarm simulation, and exchange listing readiness analysis",
          category: "DeFi",
          url: "https://github.com/buzzbysolcex/buzz-token-intelligence-skill",
          install:
            "npx skills add https://github.com/buzzbysolcex/buzz-token-intelligence-skill",
        },
      ],
      endpoints: {
        free: {
          score: {
            url: "https://buzzbd.ai/api/v1/score/free/{address}",
            method: "GET",
            rate_limit: "10/day",
            auth: "none",
          },
          leaderboard: {
            url: "https://buzzbd.ai/scores",
            method: "GET",
            auth: "none",
          },
        },
        x402: {
          score: {
            url: "https://api.buzzbd.ai/api/v1/x402/score/{address}",
            method: "GET",
            price: "$0.01",
            currency: "USDC",
            chain: "base",
          },
          simulate: {
            url: "https://api.buzzbd.ai/api/v1/x402/simulate",
            method: "POST",
            price: "$0.05",
            currency: "USDC",
            chain: "base",
          },
          audit: {
            url: "https://api.buzzbd.ai/api/v1/x402/audit/{address}",
            method: "GET",
            price: "$0.10",
            currency: "USDC",
            chain: "base",
          },
        },
      },
      on_chain: {
        base: { ScoreStorage_v2: "0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb" },
        solana: { ScoreStorage: "deployed" },
      },
      chains: ["solana", "base", "bsc", "ethereum", "avalanche", "arbitrum"],
      stats: {
        tokens_scored: tokenCount,
        tables: tableCount,
        false_positives: 0,
        max_simulation_agents: 10000,
        services: 22,
      },
      registry: {
        x402_index: "https://402index.io",
        aibtc: "Ionic Nova",
        solana_skills: "repo ready, PR pending",
      },
      updated_at: new Date().toISOString(),
    });
  });
};
