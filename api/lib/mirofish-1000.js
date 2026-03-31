/**
 * MiroFish 1000-Agent Overnight Runner
 * Dual-Brain: 90% Opus via claude -p / 10% Ollama qwen3:8b
 * Designed for overnight batch runs on CPX62
 */

const { execSync } = require('child_process');
const fs = require('fs');

const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen3:8b';
const CLUSTERS = ['degen', 'whale', 'institutional', 'community', 'market_dynamics'];
const OLLAMA_MAX_ROUND = 4;

const PERSONA_PROMPTS = {
  degen: 'Aggressive degen trader. Loves hype, momentum, FOMO. Bets big on narratives.',
  whale: 'Deep-pocketed whale. Focuses on liquidity, market cap, entry/exit without slippage.',
  institutional: 'Skeptical institutional analyst. Demands audits, doxxed teams, compliance. Rejects most tokens.',
  community: 'Community analyst. Evaluates social presence, dev activity, holder growth, engagement.',
  market_dynamics: 'Market microstructure analyst. Focuses on spread, depth, MEV, order flow, cross-exchange arb.'
};

function shouldUseOpus(cluster, round) {
  return !(cluster === 'degen' && round <= OLLAMA_MAX_ROUND);
}

async function callOpus(prompt) {
  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    const result = execSync(
      `claude -p '${escaped}' --output-format text`,
      { timeout: 60000, maxBuffer: 1024 * 1024, cwd: '/home/claude-code/buzz-workspace' }
    );
    return { response: result.toString().trim(), model: 'opus-4.6', tier: 'genius' };
  } catch (e) {
    // Fallback to Ollama
    return callOllama(prompt);
  }
}

async function callOllama(prompt) {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        think: false,
        options: { temperature: 0.8, num_predict: 150 }
      }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await resp.json();
    return { response: data.message?.content || '', model: OLLAMA_MODEL, tier: 'bulk' };
  } catch (e) {
    return { response: '{"action":"hold","belief":0.5,"reasoning":"timeout","post":""}', model: 'fallback', tier: 'error' };
  }
}

function parseAction(raw) {
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) return { action: 'hold', belief: 0.5, reasoning: 'parse error', post: '' };
  try {
    const p = JSON.parse(match[0]);
    return {
      action: ['buy', 'sell', 'hold'].includes((p.action || '').toLowerCase()) ? p.action.toLowerCase() : 'hold',
      belief: Math.max(0, Math.min(1, parseFloat(p.belief) || 0.5)),
      reasoning: (p.reasoning || '').slice(0, 200),
      post: (p.post || '').slice(0, 200)
    };
  } catch { return { action: 'hold', belief: 0.5, reasoning: 'json error', post: '' }; }
}

async function run1000(tokenData, options = {}) {
  const { agentCount = 1000, rounds = 20 } = options;
  const startTime = Date.now();
  const perCluster = Math.floor(agentCount / 5);

  // Generate agents
  const agents = [];
  for (const cluster of CLUSTERS) {
    for (let i = 0; i < perCluster; i++) {
      agents.push({
        id: `${cluster}_${i}`,
        cluster,
        persona: PERSONA_PROMPTS[cluster],
        belief: 0.5,
        lastAction: 'hold'
      });
    }
  }

  const socialFeed = [];
  const beliefHistory = [];
  const modelStats = { opus: 0, ollama: 0, errors: 0 };
  const logFile = `/tmp/mirofish-1000-${Date.now()}.log`;

  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(logFile, line + '\n');
  };

  log(`=== MIROFISH 1000-AGENT RUN ===`);
  log(`Token: ${tokenData.symbol} | Agents: ${agentCount} | Rounds: ${rounds}`);
  log(`Brain: 90% Opus / 10% Ollama | Log: ${logFile}`);

  for (let round = 1; round <= rounds; round++) {
    const roundStart = Date.now();
    const recentPosts = socialFeed.slice(-20).map(p => `[${p.cluster}] ${p.post}`).join('\n');

    // Shuffle agents each round
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    let roundBuys = 0, roundSells = 0, roundHolds = 0;

    for (let i = 0; i < shuffled.length; i++) {
      const agent = shuffled[i];
      const useOpus = shouldUseOpus(agent.cluster, round);

      const prompt = `You are a ${agent.persona} Round ${round}/${rounds}. Belief: ${agent.belief.toFixed(2)}.
Token: ${tokenData.symbol} | Price: $${tokenData.price} | MCap: $${tokenData.mcap} | Liq: $${tokenData.liquidity} | Score: ${tokenData.score}/100
${recentPosts ? `Social feed:\n${recentPosts}\n` : ''}
Respond JSON only: {"action":"buy"|"sell"|"hold","belief":0.0-1.0,"reasoning":"1 sentence","post":"1 sentence take"}`;

      const result = useOpus ? await callOpus(prompt) : await callOllama(prompt);
      const action = parseAction(result.response);

      if (result.model === 'opus-4.6') modelStats.opus++;
      else if (result.tier === 'error') modelStats.errors++;
      else modelStats.ollama++;

      agent.belief = action.belief;
      agent.lastAction = action.action;

      if (action.action === 'buy') roundBuys++;
      else if (action.action === 'sell') roundSells++;
      else roundHolds++;

      if (action.post && action.post.length > 5) {
        socialFeed.push({ cluster: agent.cluster, post: action.post, belief: action.belief, round });
      }

      // Progress every 50 agents
      if ((i + 1) % 50 === 0) {
        log(`  R${round} agent ${i + 1}/${shuffled.length} (${useOpus ? 'Opus' : 'Ollama'})`);
      }
    }

    // Round summary
    const clusterBeliefs = {};
    for (const c of CLUSTERS) {
      const ca = agents.filter(a => a.cluster === c);
      clusterBeliefs[c] = ca.length ? +(ca.reduce((s, a) => s + a.belief, 0) / ca.length).toFixed(3) : 0;
    }
    const avgBelief = +(agents.reduce((s, a) => s + a.belief, 0) / agents.length).toFixed(3);

    beliefHistory.push({ round, avg_belief: avgBelief, clusters: clusterBeliefs, buys: roundBuys, sells: roundSells, holds: roundHolds });

    const roundTime = Math.round((Date.now() - roundStart) / 1000);
    log(`R${round}: belief=${avgBelief} B/S/H=${roundBuys}/${roundSells}/${roundHolds} (${roundTime}s)`);
    for (const [c, b] of Object.entries(clusterBeliefs)) {
      log(`  ${c}: ${b}`);
    }
  }

  const totalTime = Date.now() - startTime;
  const finalBelief = +(agents.reduce((s, a) => s + a.belief, 0) / agents.length).toFixed(3);
  const finalBuys = agents.filter(a => a.lastAction === 'buy').length;
  const finalSells = agents.filter(a => a.lastAction === 'sell').length;

  const result = {
    engine: 'mirofish-real-sim',
    token: tokenData.symbol,
    chain: tokenData.chain,
    agents: agentCount,
    rounds,
    final_belief: finalBelief,
    consensus: finalBuys > finalSells ? 'BULLISH' : finalSells > finalBuys ? 'BEARISH' : 'NEUTRAL',
    consensus_strength: +(Math.abs(finalBuys - finalSells) / agentCount).toFixed(3),
    final_buys: finalBuys,
    final_sells: finalSells,
    final_holds: agentCount - finalBuys - finalSells,
    belief_history: beliefHistory,
    model_stats: modelStats,
    opus_pct: +((modelStats.opus / (modelStats.opus + modelStats.ollama)) * 100).toFixed(1),
    total_time_ms: totalTime,
    total_time_hours: +(totalTime / 3600000).toFixed(2),
    social_posts: socialFeed.length,
    log_file: logFile,
    cluster_beliefs: Object.fromEntries(CLUSTERS.map(c => {
      const ca = agents.filter(a => a.cluster === c);
      return [c, +(ca.reduce((s, a) => s + a.belief, 0) / ca.length).toFixed(3)];
    }))
  };

  log(`\n=== COMPLETE ===`);
  log(`Final: ${finalBelief} | ${result.consensus} (${(result.consensus_strength * 100).toFixed(0)}%)`);
  log(`Opus: ${modelStats.opus} | Ollama: ${modelStats.ollama} | Errors: ${modelStats.errors}`);
  log(`Time: ${result.total_time_hours} hours`);

  // Save to file for pickup
  fs.writeFileSync('/tmp/mirofish-1000-result.json', JSON.stringify(result, null, 2));

  return result;
}

// CLI entry point
if (require.main === module) {
  run1000({
    symbol: 'Nasdog', chain: 'solana', price: 0.001,
    mcap: 500000, liquidity: 80000, score: 62
  }, { agentCount: 1000, rounds: 20 })
    .then(r => {
      console.log('\nResult saved to /tmp/mirofish-1000-result.json');
      process.exit(0);
    })
    .catch(e => {
      console.error('FATAL:', e.message);
      process.exit(1);
    });
}

module.exports = { run1000 };
