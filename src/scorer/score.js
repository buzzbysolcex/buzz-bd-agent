/**
 * BD Scoring Engine
 * Scores tokens on a 100-point scale for listing qualification
 */

const config = require('../../config/scoring.json');

/**
 * Calculate BD score for a token
 * @param {Object} token - Token data from scanner
 * @param {Object} additionalData - Extra data (socials, catalysts, etc.)
 * @returns {Object} Score breakdown and total
 */
function calculateScore(token, additionalData = {}) {
  const breakdown = {
    liquidity: scoreLiquidity(token.liquidity),
    volume: scoreVolume(token.volume24h),
    age: scoreAge(token.ageDays),
    community: scoreCommunity(additionalData.socials || {}),
    safety: scoreSafety(additionalData.contract || {})
  };
  
  // Base score (0-100)
  let total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  // Apply catalysts
  const catalysts = applyCatalysts(additionalData.catalysts || {});
  total += catalysts.bonus;
  
  // Clamp to 0-100
  total = Math.max(0, Math.min(100, total));
  
  return {
    total: Math.round(total),
    breakdown,
    catalysts,
    status: getStatus(total),
    action: getAction(total)
  };
}

/**
 * Score liquidity (0-30 points)
 */
function scoreLiquidity(liquidity) {
  const thresholds = config.weights.liquidity.thresholds;
  
  if (liquidity >= thresholds.excellent.min) return thresholds.excellent.points;
  if (liquidity >= thresholds.good.min) return thresholds.good.points;
  if (liquidity >= thresholds.fair.min) return thresholds.fair.points;
  if (liquidity >= thresholds.poor.min) return thresholds.poor.points;
  return 0;
}

/**
 * Score 24h volume (0-25 points)
 */
function scoreVolume(volume) {
  const thresholds = config.weights.volume_24h.thresholds;
  
  if (volume >= thresholds.excellent.min) return thresholds.excellent.points;
  if (volume >= thresholds.good.min) return thresholds.good.points;
  if (volume >= thresholds.fair.min) return thresholds.fair.points;
  if (volume >= thresholds.poor.min) return thresholds.poor.points;
  return 0;
}

/**
 * Score age in days (0-15 points)
 */
function scoreAge(ageDays) {
  if (ageDays === null || ageDays === undefined) return 7; // Default middle score
  
  const scoring = config.weights.age_days.scoring;
  const optimal = config.weights.age_days.optimal_range;
  
  if (ageDays >= optimal.min && ageDays <= optimal.max) {
    return scoring.optimal;
  }
  if (ageDays >= scoring.new_but_stable.min && ageDays < scoring.new_but_stable.max) {
    return scoring.new_but_stable.points;
  }
  if (ageDays > scoring.mature.min && ageDays <= scoring.mature.max) {
    return scoring.mature.points;
  }
  if (ageDays < scoring.too_new.max) {
    return scoring.too_new.points;
  }
  return scoring.too_old.points;
}

/**
 * Score community presence (0-15 points)
 */
function scoreCommunity(socials) {
  const factors = config.weights.community.factors;
  let score = 0;
  
  if (socials.twitterFollowers >= factors.twitter_followers.threshold) {
    score += 15 * factors.twitter_followers.weight;
  } else if (socials.twitterFollowers > 0) {
    score += 15 * factors.twitter_followers.weight * (socials.twitterFollowers / factors.twitter_followers.threshold);
  }
  
  if (socials.telegramMembers >= factors.telegram_members.threshold) {
    score += 15 * factors.telegram_members.weight;
  } else if (socials.telegramMembers > 0) {
    score += 15 * factors.telegram_members.weight * (socials.telegramMembers / factors.telegram_members.threshold);
  }
  
  if (socials.discordMembers >= factors.discord_members.threshold) {
    score += 15 * factors.discord_members.weight;
  }
  
  if (socials.engagementRate >= factors.engagement_rate.threshold) {
    score += 15 * factors.engagement_rate.weight;
  }
  
  return Math.round(score);
}

/**
 * Score contract safety (0-15 points)
 */
function scoreSafety(contract) {
  const checks = config.weights.contract_safety.checks;
  let score = 0;
  
  if (contract.verifiedSource) score += checks.verified_source;
  if (contract.noHoneypot) score += checks.no_honeypot;
  if (contract.renouncedOwnership) score += checks.renounced_ownership;
  if (contract.lockedLiquidity) score += checks.locked_liquidity;
  if (contract.auditReport) score += checks.audit_report;
  
  return score;
}

/**
 * Apply catalyst bonuses/penalties
 */
function applyCatalysts(catalysts) {
  const bonuses = config.catalysts.bonuses;
  const penalties = config.catalysts.penalties;
  let bonus = 0;
  const applied = [];
  
  // Bonuses
  if (catalysts.hackathonWinner) { bonus += bonuses.hackathon_winner; applied.push('+hackathon'); }
  if (catalysts.viralMoment) { bonus += bonuses.viral_moment; applied.push('+viral'); }
  if (catalysts.kolMention) { bonus += bonuses.kol_mention; applied.push('+kol'); }
  if (catalysts.aixbtHighConviction) { bonus += bonuses.aixbt_high_conviction; applied.push('+aixbt'); }
  if (catalysts.dexscreenerTrending) { bonus += bonuses.dexscreener_top_trending; applied.push('+trending'); }
  if (catalysts.x402Verified) { bonus += bonuses.x402_verified; applied.push('+x402'); }
  
  // Penalties
  if (catalysts.majorCexListed) { bonus += penalties.major_cex_listed; applied.push('-cex'); }
  if (catalysts.liquidityDropping) { bonus += penalties.liquidity_dropping_fast; applied.push('-liq'); }
  if (catalysts.teamInactive) { bonus += penalties.team_inactive_7d; applied.push('-inactive'); }
  if (catalysts.recentDump) { bonus += penalties.recent_dump_50pct; applied.push('-dump'); }
  if (catalysts.suspiciousVolume) { bonus += penalties.suspicious_volume; applied.push('-sus'); }
  if (catalysts.x402Blocked) { bonus += penalties.x402_blocked; applied.push('-blocked'); }
  
  return { bonus, applied };
}

/**
 * Get status based on score
 */
function getStatus(score) {
  if (score >= config.thresholds.hot.min) return '🔥 HOT';
  if (score >= config.thresholds.qualified.min) return '✅ QUALIFIED';
  if (score >= config.thresholds.watch.min) return '👀 WATCH';
  return '❌ PASS';
}

/**
 * Get recommended action
 */
function getAction(score) {
  if (score >= config.thresholds.hot.min) return config.thresholds.hot.action;
  if (score >= config.thresholds.qualified.min) return config.thresholds.qualified.action;
  if (score >= config.thresholds.watch.min) return config.thresholds.watch.action;
  return config.thresholds.pass.action;
}

/**
 * Check auto-reject criteria
 */
function shouldAutoReject(token) {
  const criteria = config.auto_reject;
  
  if (token.liquidity < criteria.liquidity_below) return { reject: true, reason: 'liquidity_too_low' };
  if (token.ageDays !== null && token.ageDays * 24 < criteria.age_hours_below) return { reject: true, reason: 'too_new' };
  if (token.volumeToMcapRatio > criteria.volume_to_mcap_ratio_above) return { reject: true, reason: 'suspicious_volume' };
  
  return { reject: false };
}

module.exports = {
  calculateScore,
  scoreLiquidity,
  scoreVolume,
  scoreAge,
  scoreCommunity,
  scoreSafety,
  applyCatalysts,
  shouldAutoReject
};
