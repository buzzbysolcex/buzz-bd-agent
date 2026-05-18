/**
 * MicroBuzz v2 — 30 LLM Agent Profiles
 * ADR-010 | 5 personas × 2 experience × 3 risk tolerance = 30
 *
 * Each agent queries Ollama with unique perspective.
 * No caching between agents — each gets unique call.
 */

const PERSONAS = [
  {
    id: "analyst",
    name: "Market Analyst",
    focus: "fundamental analysis, tokenomics, market structure",
    prompt:
      "You analyze tokens by examining fundamentals: team, tokenomics, use case, market cap relative to competitors, and growth trajectory. You focus on whether the token has real utility and sustainable economics.",
  },
  {
    id: "trader",
    name: "Active Trader",
    focus: "price action, volume, momentum, liquidity depth",
    prompt:
      "You evaluate tokens from a trading perspective: price action, volume trends, liquidity depth, spread, and momentum. You care about whether there is enough market activity to sustain an exchange listing and attract trading volume.",
  },
  {
    id: "security_auditor",
    name: "Security Auditor",
    focus:
      "contract safety, honeypot detection, holder distribution, rug signals",
    prompt:
      "You audit tokens for security: contract verification, honeypot flags, sell tax, holder concentration, deployer history, and known rug patterns. A single critical finding can make you reject a token regardless of other metrics.",
  },
  {
    id: "community_manager",
    name: "Community Analyst",
    focus: "social presence, community engagement, team visibility",
    prompt:
      "You evaluate the human side: Twitter followers, Telegram activity, Discord engagement, team transparency, website quality, and community sentiment. Tokens with no community rarely succeed on exchanges.",
  },
  {
    id: "whale_watcher",
    name: "Whale Watcher",
    focus: "large holder behavior, institutional interest, smart money flows",
    prompt:
      "You track whale behavior: top holder concentration, institutional interest signals, smart money flows, and exchange deposit/withdrawal patterns. You look for signs that sophisticated capital is either accumulating or distributing.",
  },
];

const EXPERIENCE_LEVELS = [
  {
    id: "junior",
    modifier:
      "You are relatively new to crypto analysis. You tend to be cautious and conservative in your estimates. You may miss subtle signals but you rarely overcommit.",
  },
  {
    id: "senior",
    modifier:
      "You are a veteran crypto analyst with years of experience. You can read between the lines, spot patterns others miss, and make nuanced judgments. You are comfortable taking positions when you see clear evidence.",
  },
];

const RISK_TOLERANCES = [
  {
    id: "conservative",
    min_edge: 0.15, // needs 15%+ perceived edge to trade
    trade_min: 10,
    trade_max: 30,
    modifier:
      "You are risk-averse. You only trade when you see a clear 15%+ edge between your assessment and the current market price. You prefer small positions.",
  },
  {
    id: "moderate",
    min_edge: 0.1, // needs 10%+ edge
    trade_min: 30,
    trade_max: 80,
    modifier:
      "You have moderate risk tolerance. You trade when you see a 10%+ edge. You size positions proportionally to your conviction.",
  },
  {
    id: "aggressive",
    min_edge: 0.05, // acts on 5%+ edge
    trade_min: 80,
    trade_max: 200,
    modifier:
      "You are an aggressive trader. You act on small edges of 5%+ and take large positions when conviction is high. You believe speed and conviction beat caution.",
  },
];

/**
 * Generate all 30 LLM agent profiles
 * @returns {Array} 30 agent objects
 */
function generateLLMAgents() {
  const agents = [];
  let id = 0;

  for (const persona of PERSONAS) {
    for (const exp of EXPERIENCE_LEVELS) {
      for (const risk of RISK_TOLERANCES) {
        id++;
        agents.push({
          id: `llm_${id}`,
          type: "llm",
          persona: persona.id,
          persona_name: persona.name,
          experience: exp.id,
          risk_tolerance: risk.id,
          min_edge: risk.min_edge,
          trade_min: risk.trade_min,
          trade_max: risk.trade_max,
          initial_balance: 500,
          system_prompt: buildSystemPrompt(persona, exp, risk),
        });
      }
    }
  }

  return agents;
}

/**
 * Build the system prompt for an LLM agent
 */
function buildSystemPrompt(persona, experience, risk) {
  return `You are a ${persona.name} evaluating whether a cryptocurrency token should be listed on an exchange.

${persona.prompt}

${experience.modifier}

${risk.modifier}

You will be shown token data and asked: "Should this token be listed on a major exchange?"

Respond with EXACTLY this JSON format:
{
  "direction": "YES" or "NO" or "NOTHING",
  "conviction": 0.0 to 1.0,
  "amount": dollar amount to trade (${risk.trade_min}-${risk.trade_max}),
  "reasoning": "one sentence explaining your decision"
}

- "YES" = you believe this token deserves listing (buy YES shares)
- "NO" = you believe this token should NOT be listed (buy NO shares)
- "NOTHING" = insufficient data or no clear edge (do not trade)
- conviction: how confident you are (0.5 = coin flip, 1.0 = certain)
- amount: how much to bet based on your conviction and risk tolerance

Be honest. Most tokens do NOT deserve listing. A "NO" is often the correct answer.
Respond ONLY with the JSON. No other text.`;
}

/**
 * Build the user prompt with token data for a specific round
 * @param {Object} tokenData - token metrics
 * @param {number} round - current round (1, 2, or 3)
 * @param {Object} priorResults - results from prior rounds
 * @returns {string} user prompt
 */
function buildUserPrompt(tokenData, round, priorResults = {}) {
  let prompt = `TOKEN EVALUATION — ROUND ${round}/3\n\n`;

  // Round 1: Base data
  prompt += `TOKEN: ${tokenData.symbol || tokenData.name || "Unknown"}\n`;
  prompt += `Chain: ${tokenData.chain || "unknown"}\n`;
  if (tokenData.price) prompt += `Price: $${tokenData.price}\n`;
  if (tokenData.mcap)
    prompt += `Market Cap: $${Number(tokenData.mcap).toLocaleString()}\n`;
  if (tokenData.fdv)
    prompt += `FDV: $${Number(tokenData.fdv).toLocaleString()}\n`;
  if (tokenData.liquidity)
    prompt += `Liquidity: $${Number(tokenData.liquidity).toLocaleString()}\n`;
  if (tokenData.volume_24h)
    prompt += `24h Volume: $${Number(tokenData.volume_24h).toLocaleString()}\n`;
  if (tokenData.holders) prompt += `Holders: ${tokenData.holders}\n`;
  if (tokenData.score) prompt += `Composite Score: ${tokenData.score}/100\n`;
  if (tokenData.safety_score)
    prompt += `Safety Score: ${tokenData.safety_score}\n`;
  if (tokenData.honeypot !== undefined)
    prompt += `Honeypot: ${tokenData.honeypot ? "YES ⚠️" : "No"}\n`;

  // Round 2: + Social context
  if (round >= 2) {
    prompt += `\n--- ROUND 2 ADDITIONAL DATA ---\n`;
    if (tokenData.twitter_followers)
      prompt += `Twitter Followers: ${tokenData.twitter_followers}\n`;
    if (tokenData.twitter_handle)
      prompt += `Twitter: @${tokenData.twitter_handle}\n`;
    if (tokenData.website) prompt += `Website: ${tokenData.website}\n`;
    if (tokenData.telegram_members)
      prompt += `Telegram: ${tokenData.telegram_members} members\n`;
    if (priorResults.round1) {
      prompt += `Round 1 AMM Price: ${priorResults.round1.price.toFixed(4)} (${Math.round(priorResults.round1.price * 100)}% listing probability)\n`;
      prompt += `Round 1 LLM Consensus: ${priorResults.round1.llm_summary.majority_direction} (${Math.round(priorResults.round1.llm_summary.consensus_strength * 100)}% agreement)\n`;
    }
  }

  // Round 3: + HeyAnon cross-chain
  if (round >= 3) {
    prompt += `\n--- ROUND 3 ADDITIONAL DATA (Cross-Chain) ---\n`;
    if (tokenData.hyperliquid_oi)
      prompt += `Hyperliquid Perps OI: $${Number(tokenData.hyperliquid_oi).toLocaleString()}\n`;
    if (tokenData.hyperliquid_funding)
      prompt += `Hyperliquid Funding Rate: ${tokenData.hyperliquid_funding}\n`;
    if (tokenData.lending_markets)
      prompt += `Lending Markets: ${tokenData.lending_markets}\n`;
    if (tokenData.dex_count)
      prompt += `DEX Presence: ${tokenData.dex_count} DEXs\n`;
    if (tokenData.cex_listed) prompt += `CEX Listed: ${tokenData.cex_listed}\n`;
    if (priorResults.round2) {
      prompt += `Round 2 AMM Price: ${priorResults.round2.price.toFixed(4)}\n`;
      prompt += `Price Movement R1→R2: ${priorResults.round1.price.toFixed(4)} → ${priorResults.round2.price.toFixed(4)}\n`;
    }
  }

  prompt += `\nShould this token be listed? Respond with JSON only.`;
  return prompt;
}

module.exports = {
  generateLLMAgents,
  buildUserPrompt,
  PERSONAS,
  EXPERIENCE_LEVELS,
  RISK_TOLERANCES,
};
