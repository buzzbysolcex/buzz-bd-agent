/**
 * /api/v1/score-token — THE MONEY ENDPOINT
 * 
 * Single POST triggers all 5 parallel sub-agents, returns 100-point score breakdown.
 * Auth: x402 USDC payment ($0.05) OR API key
 * 
 * Buzz BD Agent v7.2.1 | SolCex Exchange
 * Sprint Day 18 — March 9, 2026
 * 
 * PATCH 1: Fixed DB column mismatch (contract_address→address, score→score_total, etc.)
 * PATCH 2: Added ethskills.com EVM audit layer for Base/BSC/ETH tokens
 * NOTE: ATV identity is handled by social-agent (services/agents/social.js)
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { orchestrateScore } = require('../services/orchestrator');
const { validateScoreRequest } = require('../middleware/validate');
const { trackCost } = require('../services/costTracker');
const { reportToAgentProof } = require('../services/agentproof');

// ═══════════════════════════════════════════════════
// ethskills.com EVM Audit — Deep Contract Security
// Source: https://ethskills.com/audit/SKILL.md
// Master: github.com/austintgriffith/evm-audit-skills
// 500+ checklist items across 19 domains
// Runs on: Base, BSC, Ethereum tokens only
// ═══════════════════════════════════════════════════
const ETHSKILLS_BASE_URL = 'https://raw.githubusercontent.com/austintgriffith/evm-audit-skills/main';

const ETHSKILLS_CORE = ['evm-audit-general', 'evm-audit-precision-math', 'evm-audit-erc20', 'evm-audit-access-control'];

async function fetchChecklist(skillName) {
  try {
    const https = require('https');
    const url = `${ETHSKILLS_BASE_URL}/${skillName}/references/checklist.md`;
    return await new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) { resolve(null); return; }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  } catch (err) { return null; }
}

async function runEVMAudit(address, chain, scannerData) {
  const startTime = Date.now();
  const checklistsLoaded = [];
  const checklistsFailed = [];
  
  // Select checklists
  const selectedSkills = [...ETHSKILLS_CORE];
  if (['base', 'bsc', 'arbitrum', 'optimism'].includes(chain.toLowerCase())) {
    selectedSkills.push('evm-audit-chain-specific');
  }
  if (scannerData) {
    const dex = (scannerData.dex || '').toLowerCase();
    const name = (scannerData.name || '').toLowerCase();
    if (dex.includes('uniswap') || dex.includes('pancake') || dex.includes('sushi')) selectedSkills.push('evm-audit-defi-amm');
    if (name.includes('vault') || name.includes('yield')) selectedSkills.push('evm-audit-erc4626');
    if (name.includes('stake') || name.includes('restake')) selectedSkills.push('evm-audit-defi-staking');
    if (name.includes('nft')) selectedSkills.push('evm-audit-erc721');
  }
  const uniqueSkills = [...new Set(selectedSkills)];
  console.log(`[ethskills] Loading ${uniqueSkills.length} checklists for ${address} on ${chain}`);
  
  // Fetch checklists in parallel
  const results = await Promise.all(uniqueSkills.map(async (skill) => {
    const content = await fetchChecklist(skill);
    if (content) { checklistsLoaded.push(skill); return { skill, content, itemCount: (content.match(/^- \[/gm) || []).length }; }
    else { checklistsFailed.push(skill); return null; }
  }));
  const loadedChecklists = results.filter(r => r !== null);
  
  // Automated pre-audit checks from scanner data
  let auditScore = 50;
  const auditFactors = [];
  
  if (scannerData) {
    if (scannerData.websites && scannerData.websites.length > 0) { auditScore += 5; auditFactors.push({ name: 'has_website', impact: 5, detail: scannerData.websites[0]?.url || 'found' }); }
    if (scannerData.socials && scannerData.socials.length > 0) {
      const tw = scannerData.socials.find(s => s.type === 'twitter');
      const tg = scannerData.socials.find(s => s.type === 'telegram');
      if (tw) { auditScore += 5; auditFactors.push({ name: 'has_twitter', impact: 5, detail: tw.url }); }
      if (tg) { auditScore += 3; auditFactors.push({ name: 'has_telegram', impact: 3, detail: tg.url }); }
    }
    if (scannerData.cmc_listed) { auditScore += 10; auditFactors.push({ name: 'cmc_listed', impact: 10, detail: `CMC rank #${scannerData.cmc?.cmc_rank || 'unranked'}` }); }
    if (scannerData.pairs_count && scannerData.pairs_count > 5) { auditScore += 5; auditFactors.push({ name: 'multi_pair', impact: 5, detail: `${scannerData.pairs_count} trading pairs` }); }
    if (scannerData.pair_created_at) {
      const ageDays = Math.floor((Date.now() - scannerData.pair_created_at) / 86400000);
      if (ageDays > 180) { auditScore += 5; auditFactors.push({ name: 'token_maturity', impact: 5, detail: `${ageDays}d old — survived` }); }
      else if (ageDays < 7) { auditScore -= 10; auditFactors.push({ name: 'token_very_new', impact: -10, detail: `${ageDays}d old — high risk` }); }
      else if (ageDays < 30) { auditScore -= 5; auditFactors.push({ name: 'token_new', impact: -5, detail: `${ageDays}d old — monitor` }); }
    }
    if (scannerData.volume_24h && scannerData.liquidity_usd) {
      const ratio = scannerData.volume_24h / scannerData.liquidity_usd;
      if (ratio > 10) { auditScore -= 15; auditFactors.push({ name: 'wash_trading_risk', impact: -15, detail: `Vol/Liq ${ratio.toFixed(1)}x — suspicious` }); }
      else if (ratio > 5) { auditScore -= 5; auditFactors.push({ name: 'high_vol_ratio', impact: -5, detail: `Vol/Liq ${ratio.toFixed(1)}x — elevated` }); }
      else if (ratio >= 0.1 && ratio <= 3) { auditScore += 5; auditFactors.push({ name: 'healthy_vol_ratio', impact: 5, detail: `Vol/Liq ${ratio.toFixed(1)}x — healthy` }); }
    }
    if (scannerData.txns_24h_buys && scannerData.txns_24h_sells) {
      const bsr = scannerData.txns_24h_buys / Math.max(scannerData.txns_24h_sells, 1);
      if (bsr > 5) { auditScore -= 5; auditFactors.push({ name: 'buy_pressure_extreme', impact: -5, detail: `Buy/Sell ${bsr.toFixed(1)}x — potential manipulation` }); }
      else if (bsr < 0.2) { auditScore -= 10; auditFactors.push({ name: 'heavy_selling', impact: -10, detail: `Buy/Sell ${bsr.toFixed(1)}x — dump risk` }); }
    }
    if (scannerData.price_change_24h !== undefined) {
      if (scannerData.price_change_24h < -50) { auditScore -= 15; auditFactors.push({ name: 'price_crash', impact: -15, detail: `${scannerData.price_change_24h.toFixed(1)}% 24h — possible rug` }); }
      else if (scannerData.price_change_24h < -30) { auditScore -= 5; auditFactors.push({ name: 'price_decline', impact: -5, detail: `${scannerData.price_change_24h.toFixed(1)}% 24h — significant` }); }
    }
    if (scannerData.signal_count && scannerData.signal_max) {
      if (scannerData.signal_count / scannerData.signal_max >= 0.8) { auditScore += 5; auditFactors.push({ name: 'strong_signals', impact: 5, detail: `${scannerData.signal_count}/${scannerData.signal_max} discovery signals` }); }
    }
  }
  
  auditScore = Math.max(0, Math.min(100, auditScore));
  const duration = Date.now() - startTime;
  console.log(`[ethskills] Audit: ${auditScore}/100 | ${checklistsLoaded.length} checklists | ${auditFactors.length} factors | ${duration}ms`);
  
  return {
    score: auditScore,
    verdict: auditScore >= 70 ? 'PASS' : auditScore >= 50 ? 'REVIEW' : 'FAIL',
    checklists_loaded: checklistsLoaded, checklists_failed: checklistsFailed,
    total_checklist_items: loadedChecklists.reduce((sum, c) => sum + (c?.itemCount || 0), 0),
    skills_selected: uniqueSkills.length, factors: auditFactors, duration_ms: duration,
    source: 'ethskills.com',
    note: 'Automated pre-audit from scanner data + ethskills checklists. Full source-code audit requires verified contract on Etherscan/Sourcify.',
    reference: 'https://ethskills.com/audit/SKILL.md'
  };
}

// ═══════════════════════════════════════════════════
// POST /api/v1/score-token
// ═══════════════════════════════════════════════════
router.post('/score-token', validateScoreRequest, async (req, res) => {
  const startTime = Date.now();
  const requestId = `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { address, chain = 'solana', depth = 'standard' } = req.body;

  console.log(`[${requestId}] 🎯 /score-token START | ${address} on ${chain} | depth=${depth}`);

  try {
    // ─── Step 1: Cache check ───
    const db = getDB();
    const cached = db.prepare(`
      SELECT * FROM token_scores WHERE address = ? AND chain = ? 
      AND created_at > datetime('now', '-30 minutes') ORDER BY created_at DESC LIMIT 1
    `).get(address.toLowerCase(), chain.toLowerCase());

    if (cached && depth !== 'deep') {
      console.log(`[${requestId}] ♻️ Cache hit (${cached.id})`);
      return res.json({
        success: true, cached: true, cached_at: cached.created_at,
        token: { address: cached.address, chain: cached.chain },
        score: { total: cached.score_total, verdict: cached.verdict, verdict_emoji: getVerdictEmoji(cached.verdict) },
        agents_completed: cached.agents_completed,
        meta: { request_id: requestId, duration_ms: Date.now() - startTime, source: 'cache' }
      });
    }

    // ─── Step 2: Orchestrate 5 parallel sub-agents ───
    console.log(`[${requestId}] 🚀 Dispatching 5 parallel sub-agents...`);
    const orchestrationResult = await orchestrateScore({ address, chain, depth, requestId });
    const { score, verdict, breakdown, subAgentResults, agentTimings, errors } = orchestrationResult;

    // ─── Step 2b: ethskills EVM audit (EVM chains only, runs after agents) ───
    const isEVM = ['base', 'bsc', 'ethereum'].includes(chain.toLowerCase());
    let ethskillsResult = null;
    if (isEVM) {
      console.log(`[${requestId}] 🔐 ethskills EVM audit starting...`);
      ethskillsResult = await runEVMAudit(address, chain, subAgentResults.scanner?.data || null);
      console.log(`[${requestId}] 🔐 ethskills: ${ethskillsResult.score}/100 (${ethskillsResult.verdict}) | ${ethskillsResult.checklists_loaded.length} checklists`);
    }

    // ─── Step 3: Build response ───
    const response = {
      success: true, cached: false,
      token: {
        address, chain,
        name: subAgentResults.scanner?.tokenName || null,
        symbol: subAgentResults.scanner?.tokenSymbol || null,
        market_cap: subAgentResults.scanner?.marketCap || null,
        liquidity: subAgentResults.scanner?.liquidity || null,
        price_usd: subAgentResults.scanner?.priceUsd || null,
        dexscreener_url: subAgentResults.scanner?.dexscreenerUrl || null
      },
      score: { total: score, verdict, verdict_emoji: getVerdictEmoji(verdict), breakdown },
      evm_audit: ethskillsResult ? {
        score: ethskillsResult.score, verdict: ethskillsResult.verdict,
        checklists_loaded: ethskillsResult.checklists_loaded,
        checklists_failed: ethskillsResult.checklists_failed,
        total_checklist_items: ethskillsResult.total_checklist_items,
        skills_selected: ethskillsResult.skills_selected,
        factors: ethskillsResult.factors, duration_ms: ethskillsResult.duration_ms,
        source: ethskillsResult.source, note: ethskillsResult.note,
        reference: ethskillsResult.reference
      } : null,
      sub_agents: {
        scanner: { status: subAgentResults.scanner?.status || 'error', duration_ms: agentTimings.scanner || 0, data: subAgentResults.scanner?.data || null },
        safety: { status: subAgentResults.safety?.status || 'error', score: subAgentResults.safety?.score || 0, weight: 0.30, weighted_score: (subAgentResults.safety?.score || 0) * 0.30, duration_ms: agentTimings.safety || 0, data: subAgentResults.safety?.data || null },
        wallet: { status: subAgentResults.wallet?.status || 'error', score: subAgentResults.wallet?.score || 0, weight: 0.30, weighted_score: (subAgentResults.wallet?.score || 0) * 0.30, duration_ms: agentTimings.wallet || 0, data: subAgentResults.wallet?.data || null },
        social: { status: subAgentResults.social?.status || 'error', score: subAgentResults.social?.score || 0, weight: 0.20, weighted_score: (subAgentResults.social?.score || 0) * 0.20, duration_ms: agentTimings.social || 0, data: subAgentResults.social?.data || null },
        scorer: { status: subAgentResults.scorer?.status || 'error', score: subAgentResults.scorer?.score || 0, weight: 0.20, weighted_score: (subAgentResults.scorer?.score || 0) * 0.20, duration_ms: agentTimings.scorer || 0, data: subAgentResults.scorer?.data || null }
      },
      agents_completed: Object.values(subAgentResults).filter(a => a?.status === 'completed').length,
      agents_total: 5,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        request_id: requestId, duration_ms: Date.now() - startTime, depth,
        source: 'live', api_version: 'v1', buzz_version: '7.2.1',
        engine: '5-parallel-sub-agents', ethskills_enabled: ethskillsResult !== null
      }
    };

    // ─── Step 4: Persist to DB ───
    try {
      db.prepare(`
        INSERT INTO token_scores 
        (address, chain, score_total, verdict, scanner_data, safety_data, 
         wallet_data, social_data, scorer_data, agents_completed, processing_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        address.toLowerCase(), chain.toLowerCase(), score, verdict,
        JSON.stringify(subAgentResults.scanner || {}),
        JSON.stringify(subAgentResults.safety || {}),
        JSON.stringify(subAgentResults.wallet || {}),
        JSON.stringify(subAgentResults.social || {}),
        JSON.stringify(subAgentResults.scorer || {}),
        response.agents_completed, Date.now() - startTime
      );
      console.log(`[${requestId}] 💾 Score persisted to DB`);
    } catch (dbErr) {
      console.error(`[${requestId}] ⚠️ DB insert failed:`, dbErr.message);
    }

    // ─── Step 5: Track cost ───
    trackCost({ requestId, endpoint: '/score-token', chain, depth, agentTimings, authMethod: req.authMethod || 'api_key' });

    // ─── Step 6: AgentProof (async) ───
    reportToAgentProof({ taskType: 'score_token', requestId, success: true, duration_ms: Date.now() - startTime, agentsCompleted: response.agents_completed, score })
      .catch(err => console.error(`[${requestId}] AgentProof report failed:`, err.message));

    // ─── Step 7: Return ───
    const evmSuffix = isEVM ? ` | ethskills:${ethskillsResult?.score}/100` : '';
    console.log(`[${requestId}] ✅ Score: ${score}/100 (${verdict}) | ${Date.now() - startTime}ms | ${response.agents_completed}/5 agents${evmSuffix}`);
    return res.json(response);

  } catch (err) {
    console.error(`[${requestId}] ❌ /score-token FAILED:`, err.message);
    reportToAgentProof({ taskType: 'score_token', requestId, success: false, duration_ms: Date.now() - startTime, error: err.message }).catch(() => {});
    return res.status(500).json({ success: false, error: 'Score computation failed', message: err.message, meta: { request_id: requestId, duration_ms: Date.now() - startTime } });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/:address
// ═══════════════════════════════════════════════════
router.get('/score-token/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || 'solana';
  try {
    const db = getDB();
    const latest = db.prepare('SELECT * FROM token_scores WHERE address = ? AND chain = ? ORDER BY created_at DESC LIMIT 1')
      .get(address.toLowerCase(), chain.toLowerCase());
    if (!latest) return res.status(404).json({ success: false, error: 'No score found', hint: 'POST /api/v1/score-token to generate a score' });
    return res.json({
      success: true, cached: true, cached_at: latest.created_at,
      token: { address: latest.address, chain: latest.chain },
      score: { total: latest.score_total, verdict: latest.verdict, verdict_emoji: getVerdictEmoji(latest.verdict) },
      agents_completed: latest.agents_completed, processing_time_ms: latest.processing_time_ms
    });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/history/:address
// ═══════════════════════════════════════════════════
router.get('/score-token/history/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || 'solana';
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const db = getDB();
    const history = db.prepare('SELECT id, score_total as score, verdict, processing_time_ms as duration_ms, agents_completed, created_at FROM token_scores WHERE address = ? AND chain = ? ORDER BY created_at DESC LIMIT ?')
      .all(address.toLowerCase(), chain.toLowerCase(), limit);
    return res.json({ success: true, address, chain, total_scores: history.length, history });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════════════
// GET /api/v1/score-token/leaderboard
// ═══════════════════════════════════════════════════
router.get('/score-token/leaderboard', async (req, res) => {
  const chain = req.query.chain || null;
  const verdict = req.query.verdict || null;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const since = req.query.since || '24h';
  const sinceMap = { '1h': '-1 hours', '6h': '-6 hours', '24h': '-24 hours', '7d': '-7 days', '30d': '-30 days' };
  const interval = sinceMap[since] || '-24 hours';
  try {
    const db = getDB();
    let query = "SELECT address, chain, MAX(score_total) as best_score, verdict, COUNT(*) as scan_count, MAX(created_at) as last_scanned FROM token_scores WHERE created_at > datetime('now', ?)";
    const params = [interval];
    if (chain) { query += ' AND chain = ?'; params.push(chain.toLowerCase()); }
    if (verdict) { query += ' AND verdict = ?'; params.push(verdict.toUpperCase()); }
    query += ' GROUP BY address, chain ORDER BY best_score DESC LIMIT ?';
    params.push(limit);
    const leaderboard = db.prepare(query).all(...params);
    return res.json({ success: true, since, chain: chain || 'all', total: leaderboard.length, leaderboard });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

function getVerdictEmoji(verdict) {
  const map = { 'HOT': '🔥', 'QUALIFIED': '✅', 'WATCH': '👀', 'SKIP': '❌' };
  return map[verdict] || '❓';
}

module.exports = router;
