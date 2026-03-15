/**
 * Scorer Sub-Agent — L4 Score & Route
 * Weight: 0.20
 * Model: bankr/gpt-5-nano (OpenClaw) | Direct computation (REST API)
 * 
 * 100-point composite scoring (11 factors) using data from all other agents
 * Routes result: HOT (85+) → LIST | QUALIFIED (70+) → WATCH | WATCH (50+) → TRACK | SKIP (<50) → DROP
 */

// 11 scoring factors with max points
const SCORING_FACTORS = {
  // Market factors (30 pts max)
  market_cap:       { max: 10, category: 'market' },
  liquidity:        { max: 10, category: 'market' },
  volume:           { max: 10, category: 'market' },
  
  // Safety factors (30 pts max)
  contract_safety:  { max: 15, category: 'safety' },
  holder_dist:      { max: 15, category: 'safety' },
  
  // Team/Social factors (20 pts max)
  team_identity:    { max: 10, category: 'social' },
  social_presence:  { max: 10, category: 'social' },
  
  // Quality factors (20 pts max)
  token_age:        { max: 5,  category: 'quality' },
  deployer_history: { max: 5,  category: 'quality' },
  web_footprint:    { max: 5,  category: 'quality' },
  momentum:         { max: 5,  category: 'quality' }
};

const MAX_SCORE = Object.values(SCORING_FACTORS).reduce((sum, f) => sum + f.max, 0); // 100

async function runScorerAgent({ 
  address, chain, requestId,
  scannerData, safetyData, walletData, socialData,
  safetyScore, walletScore, socialScore
}) {
  const start = Date.now();
  console.log(`[${requestId}] 📊 scorer-agent: Computing 11-factor score for ${address}`);

  const scores = {};
    const factors = [];
  const details = {};

  try {
    // ═══════════════════════════════════════════════
    // MARKET FACTORS (30 pts)
    // ═══════════════════════════════════════════════

    // Factor 1: Market Cap (0-10 pts)
    // Sweet spot: $100K-$50M
    const mc = scannerData?.market_cap || 0;
    if (mc >= 100000 && mc <= 50000000) {
      scores.market_cap = 10;
      details.market_cap = `$${formatNumber(mc)} — sweet spot`;
    } else if (mc >= 10000 && mc < 100000) {
      scores.market_cap = 6;
      details.market_cap = `$${formatNumber(mc)} — very early`;
    } else if (mc > 50000000 && mc <= 100000000) {
      scores.market_cap = 7;
      details.market_cap = `$${formatNumber(mc)} — established`;
    } else if (mc > 100000000) {
      scores.market_cap = 4;
      details.market_cap = `$${formatNumber(mc)} — large cap, less upside`;
    } else {
      scores.market_cap = 0;
      details.market_cap = `$${formatNumber(mc)} — too small or no data`;
    }

    // Factor 2: Liquidity (0-10 pts)
    const liq = scannerData?.liquidity_usd || 0;
    if (liq >= 50000) {
      scores.liquidity = 10;
      details.liquidity = `$${formatNumber(liq)} — strong liquidity`;
    } else if (liq >= 10000) {
      scores.liquidity = 7;
      details.liquidity = `$${formatNumber(liq)} — adequate`;
    } else if (liq >= 1000) {
      scores.liquidity = 4;
      details.liquidity = `$${formatNumber(liq)} — thin`;
    } else {
      scores.liquidity = 0;
      details.liquidity = `$${formatNumber(liq)} — dangerously low`;
    }

    // Factor 3: Volume (0-10 pts)
    const vol24h = scannerData?.volume_24h || 0;
    const volLiqRatio = liq > 0 ? vol24h / liq : 0;
    if (vol24h >= 100000 && volLiqRatio >= 1) {
      scores.volume = 10;
      details.volume = `$${formatNumber(vol24h)} (${volLiqRatio.toFixed(1)}x liq) — very active`;
    } else if (vol24h >= 50000) {
      scores.volume = 7;
      details.volume = `$${formatNumber(vol24h)} — solid volume`;
    } else if (vol24h >= 5000) {
      scores.volume = 4;
      details.volume = `$${formatNumber(vol24h)} — moderate`;
    } else {
      scores.volume = 1;
      details.volume = `$${formatNumber(vol24h)} — low volume`;
    }

    // ═══════════════════════════════════════════════
    // SAFETY FACTORS (30 pts)
    // ═══════════════════════════════════════════════

    // Factor 4: Contract Safety (0-15 pts) — from safety-agent
    if (safetyData?.instant_kill) {
      scores.contract_safety = 0;
      details.contract_safety = `INSTANT KILL: ${safetyData.kill_reason}`;
    } else if (safetyScore >= 80) {
      scores.contract_safety = 15;
      details.contract_safety = `Safety score ${safetyScore}/100 — excellent`;
    } else if (safetyScore >= 60) {
      scores.contract_safety = 10;
      details.contract_safety = `Safety score ${safetyScore}/100 — good`;
    } else if (safetyScore >= 40) {
      scores.contract_safety = 5;
      details.contract_safety = `Safety score ${safetyScore}/100 — caution`;
    } else {
      scores.contract_safety = 0;
      details.contract_safety = `Safety score ${safetyScore}/100 — unsafe`;
    }

    // Factor 5: Holder Distribution (0-15 pts) — from wallet-agent
    if (walletScore >= 80) {
      scores.holder_dist = 15;
      details.holder_dist = `Wallet score ${walletScore}/100 — clean distribution`;
    } else if (walletScore >= 60) {
      scores.holder_dist = 10;
      details.holder_dist = `Wallet score ${walletScore}/100 — acceptable`;
    } else if (walletScore >= 40) {
      scores.holder_dist = 5;
      details.holder_dist = `Wallet score ${walletScore}/100 — concentrated`;
    } else {
      scores.holder_dist = 0;
      details.holder_dist = `Wallet score ${walletScore}/100 — suspicious`;
    }

    // ═══════════════════════════════════════════════
    // TEAM/SOCIAL FACTORS (20 pts)
    // ═══════════════════════════════════════════════

    // Factor 6: Team Identity (0-10 pts) — from social-agent ATV check
    const atvVerified = socialData?.factors?.find(f => f.name === 'atv_verified');
    const atvFound = socialData?.factors?.find(f => f.name === 'atv_found');
    if (atvVerified) {
      scores.team_identity = 10;
      details.team_identity = 'Team identity verified via ATV';
    } else if (atvFound) {
      scores.team_identity = 5;
      details.team_identity = 'Identity record exists, unverified';
    } else {
      scores.team_identity = 0;
      details.team_identity = 'No identity verification';
    }

    // Factor 7: Social Presence (0-10 pts) — from social-agent
    if (socialScore >= 70) {
      scores.social_presence = 10;
      details.social_presence = `Social score ${socialScore}/100 — strong community`;
    } else if (socialScore >= 50) {
      scores.social_presence = 6;
      details.social_presence = `Social score ${socialScore}/100 — growing`;
    } else if (socialScore >= 30) {
      scores.social_presence = 3;
      details.social_presence = `Social score ${socialScore}/100 — weak`;
    } else {
      scores.social_presence = 0;
      details.social_presence = `Social score ${socialScore}/100 — minimal`;
    }

    // ═══════════════════════════════════════════════
    // QUALITY FACTORS (20 pts)
    // ═══════════════════════════════════════════════

    // Factor 8: Token Age (0-5 pts)
    const pairCreated = scannerData?.pair_created_at;
    if (pairCreated) {
      const ageDays = (Date.now() - new Date(pairCreated).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays >= 30) {
        scores.token_age = 5;
        details.token_age = `${Math.round(ageDays)}d old — survivor`;
      } else if (ageDays >= 7) {
        scores.token_age = 3;
        details.token_age = `${Math.round(ageDays)}d old — past initial dump window`;
      } else if (ageDays >= 1) {
        scores.token_age = 1;
        details.token_age = `${Math.round(ageDays)}d old — very new`;
      } else {
        scores.token_age = 0;
        details.token_age = `${Math.round(ageDays * 24)}h old — extremely new`;
      }
    } else {
      scores.token_age = 0;
      details.token_age = 'No pair creation date';
    }

    // Factor 9: Deployer History (0-5 pts) — from wallet-agent
    const deployerEstablished = walletData?.factors?.find(f => f.name === 'established_deployer');
    const deployerNew = walletData?.factors?.find(f => f.name === 'brand_new_deployer' || f.name === 'new_deployer');
    const serialDeployer = walletData?.factors?.find(f => f.name === 'serial_deployer');
    
    if (serialDeployer) {
      scores.deployer_history = 0;
      details.deployer_history = 'Serial deployer detected';
    } else if (deployerEstablished) {
      scores.deployer_history = 5;
      details.deployer_history = 'Established deployer wallet';
    } else if (deployerNew) {
      scores.deployer_history = 1;
      details.deployer_history = 'New deployer wallet';
    } else {
      scores.deployer_history = 2;
      details.deployer_history = 'Deployer history unknown';
    }

    // Factor 10: Web Footprint (0-5 pts) — from social-agent
    const strongWeb = socialData?.factors?.find(f => f.name === 'strong_web_presence');
    const officialSite = socialData?.factors?.find(f => f.name === 'official_site');
    const scamMentions = socialData?.factors?.find(f => f.name === 'scam_mentions');
    
    if (scamMentions) {
      scores.web_footprint = 0;
      details.web_footprint = 'Scam/rug mentions found';
    } else if (strongWeb && officialSite) {
      scores.web_footprint = 5;
      details.web_footprint = 'Strong web presence with official site';
    } else if (strongWeb || officialSite) {
      scores.web_footprint = 3;
      details.web_footprint = 'Moderate web presence';
    } else {
      scores.web_footprint = 1;
      details.web_footprint = 'Minimal web footprint';
    }

    // Factor 11: Momentum (0-5 pts) — price + volume trends
    const priceChange24h = scannerData?.price_change_24h || 0;
    const priceChange1h = scannerData?.price_change_1h || 0;
    const txnBuys = scannerData?.txns_24h_buys || 0;
    const txnSells = scannerData?.txns_24h_sells || 0;
    const buyRatio = (txnBuys + txnSells) > 0 ? txnBuys / (txnBuys + txnSells) : 0.5;

    // Enhance with CMC 7d/30d data if available
    const priceChange7d = scannerData?.cmc?.price_change_7d || null;
    const priceChange30d = scannerData?.cmc?.price_change_30d || null;
    let momentumDetail = '';

    if (priceChange24h > 20 && buyRatio > 0.6) {
      scores.momentum = 5;
      momentumDetail = `+${priceChange24h.toFixed(1)}% 24h, ${(buyRatio * 100).toFixed(0)}% buys — strong momentum`;
    } else if (priceChange24h > 0 && buyRatio > 0.5) {
      scores.momentum = 3;
      momentumDetail = `+${priceChange24h.toFixed(1)}% 24h, ${(buyRatio * 100).toFixed(0)}% buys — positive`;
    } else if (priceChange24h > -20) {
      scores.momentum = 1;
      momentumDetail = `${priceChange24h.toFixed(1)}% 24h — neutral`;
    } else {
      scores.momentum = 0;
      momentumDetail = `${priceChange24h.toFixed(1)}% 24h — declining`;
    }

    // CMC longer-term trend bonus/penalty
    if (priceChange7d !== null) {
      momentumDetail += ` | 7d: ${priceChange7d > 0 ? '+' : ''}${priceChange7d.toFixed(1)}%`;
    }
    if (priceChange30d !== null) {
      momentumDetail += ` | 30d: ${priceChange30d > 0 ? '+' : ''}${priceChange30d.toFixed(1)}%`;
    }
    details.momentum = momentumDetail;

    // ═══════════════════════════════════════════════
    // CMC BONUS FACTORS (up to +5 bonus on top of 100)
    // These don't replace existing factors — they're additive signals
    // ═══════════════════════════════════════════════
    let cmcBonus = 0;
    const cmcInfo = scannerData?.cmc || null;
    
    if (cmcInfo) {
      // CMC listing is itself a quality signal
      if (cmcInfo.cmc_rank && cmcInfo.cmc_rank < 1000) {
        cmcBonus += 3;
        factors.push({ name: 'cmc_top_1000', score: 3, max: 3, category: 'quality', 
          detail: `CMC Rank #${cmcInfo.cmc_rank}` });
      } else if (cmcInfo.cmc_rank && cmcInfo.cmc_rank < 5000) {
        cmcBonus += 1;
        factors.push({ name: 'cmc_listed', score: 1, max: 3, category: 'quality', 
          detail: `CMC Rank #${cmcInfo.cmc_rank}` });
      }

      // Supply transparency
      if (cmcInfo.circulating_supply && cmcInfo.total_supply) {
        const circPct = (cmcInfo.circulating_supply / cmcInfo.total_supply) * 100;
        if (circPct > 50) {
          cmcBonus += 1;
          factors.push({ name: 'healthy_supply', score: 1, max: 1, category: 'quality',
            detail: `${circPct.toFixed(0)}% circulating` });
        }
      }

      // CMC tags give context
      if (cmcInfo.tags && cmcInfo.tags.length > 0) {
        factors.push({ name: 'cmc_tags', score: 0, max: 0, category: 'info',
          detail: `Tags: ${cmcInfo.tags.slice(0, 5).join(', ')}` });
      }
    }

    // ═══════════════════════════════════════════════
    // BAGS.FM QUALITY SIGNALS (v7.5.0 — ADDITIVE)
    // Cross-reference bags_tokens table by mint address
    // ═══════════════════════════════════════════════
    let bagsBonus = 0;
    try {
      const bagsDb = require('/opt/buzz-api/db').getDB();
      const bagsRow = bagsDb.prepare('SELECT * FROM bags_tokens WHERE token_mint = ?').get(address);
      if (bagsRow) {
        bagsBonus += 5; // On Bags.fm platform (not Pump.fun)
        factors.push({ name: 'bags_platform', score: 5, max: 5, category: 'quality',
          detail: 'Listed on Bags.fm — creator earns 1% royalties (incentivized to grow)' });

        if (bagsRow.lifetime_fees_sol > 50) {
          bagsBonus += 12;
          factors.push({ name: 'bags_fees_high', score: 12, max: 12, category: 'quality',
            detail: `${bagsRow.lifetime_fees_sol} SOL lifetime fees — proven revenue generator` });
        } else if (bagsRow.lifetime_fees_sol > 10) {
          bagsBonus += 8;
          factors.push({ name: 'bags_fees_moderate', score: 8, max: 12, category: 'quality',
            detail: `${bagsRow.lifetime_fees_sol} SOL lifetime fees — active trading` });
        }

        if (bagsRow.twitter) {
          bagsBonus += 3;
          factors.push({ name: 'bags_twitter', score: 3, max: 3, category: 'social',
            detail: 'Bags.fm token has linked Twitter' });
        }
        if (bagsRow.website) {
          bagsBonus += 2;
          factors.push({ name: 'bags_website', score: 2, max: 2, category: 'social',
            detail: 'Bags.fm token has linked website' });
        }
        if (bagsRow.status === 'PRE_GRAD') {
          bagsBonus += 2;
          factors.push({ name: 'bags_pre_grad', score: 2, max: 2, category: 'quality',
            detail: 'Pre-graduation on Bags.fm — early stage opportunity' });
        }
      }
    } catch (e) {
      // bags_tokens table may not exist yet — graceful fallback
    }

    // ═══════════════════════════════════════════════
    // COMPUTE TOTAL
    // ═══════════════════════════════════════════════

    const baseScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const totalScore = Math.min(100, baseScore + cmcBonus + bagsBonus); // Cap at 100 even with bonus
    
    // Build factors array for response
    const factorsArray = Object.entries(scores).map(([name, score]) => ({
      name,
      score,
      max: SCORING_FACTORS[name]?.max || 0,
      category: SCORING_FACTORS[name]?.category || 'other',
      detail: details[name] || ''
    }));

    // Category subtotals
    const categories = {
      market: factorsArray.filter(f => f.category === 'market').reduce((s, f) => s + f.score, 0),
      safety: factorsArray.filter(f => f.category === 'safety').reduce((s, f) => s + f.score, 0),
      social: factorsArray.filter(f => f.category === 'social').reduce((s, f) => s + f.score, 0),
      quality: factorsArray.filter(f => f.category === 'quality').reduce((s, f) => s + f.score, 0)
    };

    console.log(`[${requestId}] 📊 Scorer: ${totalScore}/${MAX_SCORE} | Market:${categories.market}/30 Safety:${categories.safety}/30 Social:${categories.social}/20 Quality:${categories.quality}/20`);

    // ═══════════════════════════════════════════════
    // MAJOR CEX EXCLUSION (v7.5.0)
    // Tokens already on major CEXs with large mcap = not BD targets
    // Still scored (for learning data) but flagged bd_target: false
    // ═══════════════════════════════════════════════
    let bdTarget = true;
    try {
      const cexDb = require('/opt/buzz-api/db').getDB();
      const okxRow = cexDb.prepare('SELECT instrument_id FROM okx_instruments WHERE base_ccy = ? LIMIT 1').get(
        (scannerData?.symbol || '').toUpperCase()
      );
      if (okxRow && mc > 100000000) {
        bdTarget = false;
        factors.push({ name: 'major_cex_listed', score: 0, max: 0, category: 'info',
          detail: `Already on OKX (${okxRow.instrument_id}) with $${formatNumber(mc)} mcap — not a BD target` });
      }
    } catch (e) {
      // okx_instruments table may not exist yet
    }

    return {
      status: 'completed',
      score: totalScore,
      bd_target: bdTarget,
      duration_ms: Date.now() - start,
      data: {
        total: totalScore,
        max: MAX_SCORE,
        bd_target: bdTarget,
        categories,
        factors: [...factorsArray, ...factors],
        factor_count: factorsArray.length + factors.length
      }
    };

  } catch (err) {
    console.error(`[${requestId}] ❌ scorer-agent failed:`, err.message);
    return {
      status: 'error',
      score: 0,
      duration_ms: Date.now() - start,
      data: { error: err.message }
    };
  }
}

function formatNumber(num) {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(2);
}

module.exports = { runScorerAgent };
