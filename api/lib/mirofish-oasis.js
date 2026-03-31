/**
 * MiroFish OASIS Lite — LLM-Driven Agent Simulation
 * Phase B | 50 agents × 20 rounds × Ollama qwen3:8b
 *
 * Each agent has a persona, reads the "social feed" of prior posts,
 * forms beliefs about a token, and posts their take.
 * Beliefs evolve across rounds as agents react to each other.
 *
 * Output: consensus trajectory, belief distribution, simulated posts
 * Cost: $0 (Ollama local)
 */

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen3:8b';

// ─── Agent Persona Templates ─────────────────────────

const PERSONA_TEMPLATES = [
  { cluster: 'degen', count: 10, prompt: 'You are a degen trader who loves high-risk high-reward plays. You get excited by narrative and momentum. You size positions aggressively.' },
  { cluster: 'whale', count: 10, prompt: 'You are a whale with deep pockets. You focus on liquidity, market cap, and whether you can enter/exit without moving the price. You are patient and methodical.' },
  { cluster: 'institutional', count: 10, prompt: 'You are an institutional analyst. You demand audited contracts, doxxed teams, regulatory clarity, and proven revenue. You reject most tokens.' },
  { cluster: 'community', count: 10, prompt: 'You are a community-focused analyst. You evaluate social presence, developer activity, holder growth, and community engagement. A dead community = dead token.' },
  { cluster: 'market_dynamics', count: 10, prompt: 'You are a market microstructure analyst. You focus on order flow, spread, depth, MEV risk, and cross-exchange arbitrage. You care about HOW the token trades, not just what it is.' }
];

function generateAgents(count = 50) {
  const agents = [];
  let id = 0;
  for (const template of PERSONA_TEMPLATES) {
    const n = Math.min(template.count, Math.ceil(count / PERSONA_TEMPLATES.length));
    for (let i = 0; i < n && agents.length < count; i++) {
      agents.push({
        id: `${template.cluster}_${++id}`,
        cluster: template.cluster,
        persona: template.prompt,
        belief: 0.5, // starts neutral (0=bearish, 1=bullish)
        posts: [],
        trades: []
      });
    }
  }
  return agents;
}

// ─── Single Agent Turn ───────────────────────────────

async function agentTurn(agent, tokenData, socialFeed, round, totalRounds) {
  const prompt = buildAgentPrompt(agent, tokenData, socialFeed, round, totalRounds);

  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: agent.persona },
          { role: 'user', content: prompt }
        ],
        stream: false,
        think: false,
        options: { temperature: 0.8, num_predict: 150 }
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await resp.json();
    const raw = data.message?.content || '';
    const parsed = parseAgentResponse(raw);

    // Update agent belief
    agent.belief = parsed.belief;
    agent.posts.push({
      round,
      post: parsed.post,
      belief: parsed.belief,
      action: parsed.action
    });

    return {
      agent_id: agent.id,
      cluster: agent.cluster,
      round,
      belief: parsed.belief,
      action: parsed.action,
      post: parsed.post,
      raw: raw.slice(0, 300)
    };
  } catch (e) {
    return {
      agent_id: agent.id,
      cluster: agent.cluster,
      round,
      belief: agent.belief,
      action: 'HOLD',
      post: `[Error: ${e.message}]`,
      error: true
    };
  }
}

function buildAgentPrompt(agent, tokenData, socialFeed, round, totalRounds) {
  let prompt = `ROUND ${round}/${totalRounds} — Token Evaluation\n\n`;
  prompt += `TOKEN: ${tokenData.symbol || 'Unknown'}\n`;
  prompt += `Chain: ${tokenData.chain || 'unknown'}\n`;
  if (tokenData.price) prompt += `Price: $${tokenData.price}\n`;
  if (tokenData.mcap) prompt += `MCap: $${Number(tokenData.mcap).toLocaleString()}\n`;
  if (tokenData.liquidity) prompt += `Liquidity: $${Number(tokenData.liquidity).toLocaleString()}\n`;
  if (tokenData.score) prompt += `Safety Score: ${tokenData.score}/100\n`;
  prompt += `Your current belief: ${(agent.belief * 100).toFixed(0)}% bullish\n\n`;

  if (socialFeed.length > 0) {
    prompt += `SOCIAL FEED (what other agents are saying):\n`;
    // Show last 10 posts from the feed
    const recent = socialFeed.slice(-10);
    for (const post of recent) {
      prompt += `  [${post.cluster}] ${post.post}\n`;
    }
    prompt += '\n';
  }

  prompt += `Based on the token data and social feed, respond with EXACTLY this JSON:\n`;
  prompt += `{"belief": 0.0-1.0, "action": "BUY"/"SELL"/"HOLD", "post": "your 1-sentence take"}\n`;
  prompt += `belief: your updated probability this token succeeds (0=certain fail, 1=certain success)\n`;
  prompt += `action: what you'd do with your portfolio\n`;
  prompt += `post: share your reasoning in one sentence for others to read\n`;
  prompt += `JSON only. No other text.`;

  return prompt;
}

function parseAgentResponse(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    return { belief: 0.5, action: 'HOLD', post: 'No clear signal.' };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      belief: Math.max(0, Math.min(1, parseFloat(parsed.belief) || 0.5)),
      action: ['BUY', 'SELL', 'HOLD'].includes((parsed.action || '').toUpperCase())
        ? parsed.action.toUpperCase() : 'HOLD',
      post: (parsed.post || 'No comment.').slice(0, 200)
    };
  } catch {
    return { belief: 0.5, action: 'HOLD', post: 'Parse error.' };
  }
}

// ─── Full Simulation ─────────────────────────────────

async function runOASISSimulation(tokenData, options = {}) {
  const {
    agentCount = 50,
    rounds = 20,
    onRoundComplete = null // callback for progress reporting
  } = options;

  const startTime = Date.now();
  const agents = generateAgents(agentCount);
  const socialFeed = []; // shared feed all agents can read
  const roundResults = [];

  for (let round = 1; round <= rounds; round++) {
    const roundStart = Date.now();
    const roundActions = [];

    // Shuffle agent order each round (prevents positional bias)
    const shuffled = [...agents].sort(() => Math.random() - 0.5);

    for (const agent of shuffled) {
      const result = await agentTurn(agent, tokenData, socialFeed, round, rounds);
      roundActions.push(result);

      // Add to shared social feed (other agents see this next round)
      if (!result.error) {
        socialFeed.push({
          cluster: result.cluster,
          post: result.post,
          belief: result.belief,
          round
        });
      }
    }

    // Compute round summary
    const beliefs = roundActions.map(a => a.belief);
    const buys = roundActions.filter(a => a.action === 'BUY').length;
    const sells = roundActions.filter(a => a.action === 'SELL').length;
    const holds = roundActions.filter(a => a.action === 'HOLD').length;
    const errors = roundActions.filter(a => a.error).length;

    const roundSummary = {
      round,
      mean_belief: avg(beliefs),
      median_belief: beliefs.sort((a, b) => a - b)[Math.floor(beliefs.length / 2)],
      stddev_belief: stddev(beliefs),
      buys, sells, holds, errors,
      duration_ms: Date.now() - roundStart,
      // Per-cluster breakdown
      clusters: {}
    };

    for (const template of PERSONA_TEMPLATES) {
      const clusterActions = roundActions.filter(a => a.cluster === template.cluster);
      const clusterBeliefs = clusterActions.map(a => a.belief);
      roundSummary.clusters[template.cluster] = {
        mean_belief: avg(clusterBeliefs),
        buys: clusterActions.filter(a => a.action === 'BUY').length,
        sells: clusterActions.filter(a => a.action === 'SELL').length,
        holds: clusterActions.filter(a => a.action === 'HOLD').length
      };
    }

    roundResults.push(roundSummary);

    if (onRoundComplete) {
      onRoundComplete(roundSummary);
    }
  }

  // Final consensus
  const finalBeliefs = agents.map(a => a.belief);
  const finalBuys = agents.filter(a => a.posts[a.posts.length - 1]?.action === 'BUY').length;
  const finalSells = agents.filter(a => a.posts[a.posts.length - 1]?.action === 'SELL').length;

  return {
    success: true,
    token: tokenData.symbol || tokenData.address,
    chain: tokenData.chain,
    agents: agentCount,
    rounds,
    total_ollama_calls: agentCount * rounds,
    simulation_time_ms: Date.now() - startTime,

    // Final state
    final_belief: avg(finalBeliefs),
    final_stddev: stddev(finalBeliefs),
    final_buys: finalBuys,
    final_sells: finalSells,
    final_holds: agentCount - finalBuys - finalSells,
    consensus: finalBuys > finalSells ? 'BULLISH' : finalSells > finalBuys ? 'BEARISH' : 'NEUTRAL',
    consensus_strength: Math.abs(finalBuys - finalSells) / agentCount,

    // Belief trajectory (how consensus evolved)
    trajectory: roundResults.map(r => ({
      round: r.round,
      mean_belief: r.mean_belief,
      buys: r.buys,
      sells: r.sells,
      duration_ms: r.duration_ms
    })),

    // Per-cluster final beliefs
    cluster_beliefs: Object.fromEntries(
      PERSONA_TEMPLATES.map(t => {
        const clusterAgents = agents.filter(a => a.cluster === t.cluster);
        return [t.cluster, avg(clusterAgents.map(a => a.belief))];
      })
    ),

    // Top posts (most decisive)
    top_posts: socialFeed
      .filter(p => Math.abs(p.belief - 0.5) > 0.3)
      .slice(-10)
      .map(p => ({ cluster: p.cluster, belief: p.belief, post: p.post, round: p.round })),

    created_at: new Date().toISOString()
  };
}

// ─── Helpers ─────────────────────────────────────────

function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

module.exports = {
  runOASISSimulation,
  generateAgents,
  PERSONA_TEMPLATES
};
