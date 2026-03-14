/**
 * Community Persona Agent — "Community is the moat"
 *
 * Philosophy: Social sentiment and community strength determine long-term success.
 * Looks for: Twitter growth, Discord/TG activity, influencer mentions, sentiment.
 * Signal weight: 0.25
 * Model: bankr/gpt-5-nano (FREE)
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const WEIGHT = 0.25;

/**
 * Analyze token from community/social perspective
 */
async function analyzeToken(tokenData, llmCall) {
  const start = Date.now();

  try {
    const factors = evaluateCommunityFactors(tokenData);
    const score = computeCommunityScore(factors);
    const signal = score >= 65 ? 'bullish' : score >= 40 ? 'neutral' : 'bearish';
    const confidence = Math.min(1.0, Math.max(0.1, score / 100));

    let reasoning = generateCommunityReasoning(factors, score);
    if (llmCall) {
      try {
        const llmReasoning = await getCommunityLLMAnalysis(tokenData, factors, llmCall);
        if (llmReasoning) reasoning = llmReasoning;
      } catch {}
    }

    const recommendation = deriveRecommendation(signal, confidence, score);

    return {
      persona: 'community-agent',
      status: 'completed',
      signal,
      confidence,
      score,
      weight: WEIGHT,
      reasoning,
      bd_recommendation: recommendation,
      factors,
      model_used: llmCall ? 'bankr/gpt-5-nano' : 'rule-based',
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      persona: 'community-agent',
      status: 'error',
      signal: 'neutral',
      confidence: 0.1,
      score: 0,
      weight: WEIGHT,
      reasoning: `Error: ${err.message}`,
      bd_recommendation: 'skip',
      factors: [],
      model_used: 'none',
      duration_ms: Date.now() - start,
    };
  }
}

function evaluateCommunityFactors(data) {
  const factors = [];
  const social = data.socialData || data.social?.data || {};
  const scanner = data.scannerData || data.scanner?.data || {};

  // Twitter followers
  const twitterFollowers = parseInt(social.twitter_followers || social.followers || 0);
  if (twitterFollowers > 50000) {
    factors.push({ name: 'twitter_size', score: 20, detail: `${(twitterFollowers / 1000).toFixed(0)}K Twitter followers — massive community` });
  } else if (twitterFollowers > 10000) {
    factors.push({ name: 'twitter_size', score: 15, detail: `${(twitterFollowers / 1000).toFixed(0)}K Twitter followers — strong presence` });
  } else if (twitterFollowers > 2000) {
    factors.push({ name: 'twitter_size', score: 10, detail: `${(twitterFollowers / 1000).toFixed(1)}K Twitter followers — growing` });
  } else if (twitterFollowers > 500) {
    factors.push({ name: 'twitter_size', score: 5, detail: `${twitterFollowers} Twitter followers — early community` });
  } else {
    factors.push({ name: 'twitter_size', score: 0, detail: 'Minimal Twitter presence' });
  }

  // Twitter engagement (likes, retweets, replies on recent posts)
  const engagement = parseFloat(social.engagement_rate || social.twitter_engagement || 0);
  if (engagement > 5) {
    factors.push({ name: 'twitter_engagement', score: 15, detail: `${engagement.toFixed(1)}% engagement — highly engaged community` });
  } else if (engagement > 2) {
    factors.push({ name: 'twitter_engagement', score: 10, detail: `${engagement.toFixed(1)}% engagement — active community` });
  } else if (engagement > 0.5) {
    factors.push({ name: 'twitter_engagement', score: 5, detail: `${engagement.toFixed(1)}% engagement — moderate activity` });
  } else {
    factors.push({ name: 'twitter_engagement', score: 2, detail: 'Low or unmeasured engagement' });
  }

  // Discord/Telegram community
  const discordMembers = parseInt(social.discord_members || social.discord || 0);
  const telegramMembers = parseInt(social.telegram_members || social.telegram || 0);
  const communitySize = discordMembers + telegramMembers;
  if (communitySize > 10000) {
    factors.push({ name: 'community_channels', score: 15, detail: `${(communitySize / 1000).toFixed(0)}K Discord/TG members — thriving community` });
  } else if (communitySize > 2000) {
    factors.push({ name: 'community_channels', score: 10, detail: `${(communitySize / 1000).toFixed(1)}K Discord/TG members — active channels` });
  } else if (communitySize > 500) {
    factors.push({ name: 'community_channels', score: 5, detail: `${communitySize} Discord/TG members — emerging` });
  } else {
    // Check if socials links exist even without member counts
    const hasSocials = scanner.info?.socials?.length > 0 || social.has_discord || social.has_telegram;
    factors.push({ name: 'community_channels', score: hasSocials ? 3 : 0, detail: hasSocials ? 'Community channels exist but size unknown' : 'No Discord/TG channels found' });
  }

  // Influencer mentions
  const influencerMentions = parseInt(social.influencer_mentions || social.kol_mentions || 0);
  if (influencerMentions > 5) {
    factors.push({ name: 'influencer_signal', score: 15, detail: `${influencerMentions} influencer mentions — high visibility` });
  } else if (influencerMentions > 2) {
    factors.push({ name: 'influencer_signal', score: 10, detail: `${influencerMentions} influencer mentions — growing attention` });
  } else if (influencerMentions > 0) {
    factors.push({ name: 'influencer_signal', score: 5, detail: `${influencerMentions} influencer mention(s) — on the radar` });
  } else {
    factors.push({ name: 'influencer_signal', score: 0, detail: 'No influencer mentions detected' });
  }

  // Sentiment analysis
  const sentiment = social.sentiment || social.overall_sentiment || 'unknown';
  if (sentiment === 'positive' || sentiment === 'bullish') {
    factors.push({ name: 'sentiment', score: 15, detail: 'Positive community sentiment' });
  } else if (sentiment === 'neutral' || sentiment === 'mixed') {
    factors.push({ name: 'sentiment', score: 7, detail: 'Neutral/mixed community sentiment' });
  } else if (sentiment === 'negative' || sentiment === 'bearish') {
    factors.push({ name: 'sentiment', score: 0, detail: 'Negative community sentiment — red flag' });
  } else {
    factors.push({ name: 'sentiment', score: 5, detail: 'Sentiment data unavailable' });
  }

  // Holder growth (proxy for organic community growth)
  const holders = parseInt(scanner.holders || social.holders || 0);
  const holderGrowth = parseFloat(social.holder_growth_24h || 0);
  if (holderGrowth > 10) {
    factors.push({ name: 'holder_growth', score: 10, detail: `+${holderGrowth.toFixed(1)}% holder growth 24h — viral adoption` });
  } else if (holderGrowth > 3) {
    factors.push({ name: 'holder_growth', score: 7, detail: `+${holderGrowth.toFixed(1)}% holder growth 24h — healthy expansion` });
  } else if (holders > 1000) {
    factors.push({ name: 'holder_growth', score: 5, detail: `${holders} holders — stable base` });
  } else {
    factors.push({ name: 'holder_growth', score: 2, detail: 'Limited holder data' });
  }

  // Multi-platform presence (website + Twitter + Discord/TG)
  const platforms = [
    scanner.website || scanner.info?.websites?.length > 0,
    twitterFollowers > 0 || social.has_twitter,
    discordMembers > 0 || social.has_discord,
    telegramMembers > 0 || social.has_telegram,
  ].filter(Boolean).length;

  if (platforms >= 4) {
    factors.push({ name: 'multi_platform', score: 10, detail: `${platforms}/4 platforms active — professional presence` });
  } else if (platforms >= 2) {
    factors.push({ name: 'multi_platform', score: 5, detail: `${platforms}/4 platforms active` });
  } else {
    factors.push({ name: 'multi_platform', score: 0, detail: 'Minimal online presence' });
  }

  return factors;
}

function computeCommunityScore(factors) {
  return Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.score, 0)));
}

function generateCommunityReasoning(factors, score) {
  const top = factors.filter(f => f.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const signal = score >= 65 ? 'BULLISH' : score >= 40 ? 'NEUTRAL' : 'BEARISH';
  return `Community analysis (${signal}, ${score}/100): ${top.map(f => f.detail).join('. ') || 'Insufficient social data.'}`;
}

async function getCommunityLLMAnalysis(tokenData, factors, llmCall) {
  const prompt = `As a crypto community analyst, evaluate this token's community strength (2-3 sentences):
Token: ${tokenData.scannerData?.name || 'Unknown'}
Twitter: ${factors.find(f => f.name === 'twitter_size')?.detail || 'N/A'}
Engagement: ${factors.find(f => f.name === 'twitter_engagement')?.detail || 'N/A'}
Community: ${factors.find(f => f.name === 'community_channels')?.detail || 'N/A'}
Is the community organic and sustainable? Would it support a CEX listing?`;

  const result = await llmCall(prompt);
  return result?.content || result?.text || null;
}

function deriveRecommendation(signal, confidence, score) {
  if (signal === 'bullish' && confidence >= 0.7) return 'outreach_now';
  if (signal === 'bullish' || (signal === 'neutral' && score >= 55)) return 'monitor';
  return 'skip';
}

module.exports = { analyzeToken, WEIGHT };
