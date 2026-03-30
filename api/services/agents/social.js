/**
 * Social Sub-Agent — L3 Research
 * Sources: Grok x_search, Serper, ATV Web3 Identity, Firecrawl
 * Weight: 0.20
 * Model: bankr/gpt-5-nano (OpenClaw) | Direct API (REST API)
 * Timeout: 120s (known slow due to Grok + web search)
 * 
 * Checks: social media presence, community strength, sentiment,
 * team identity verification, web footprint
 */

const ATV_BASE = 'https://api.web3identity.com';

async function runSocialAgent({ address, chain, requestId }) {
  const start = Date.now();
  console.log(`[${requestId}] 🌐 social-agent: Starting for ${address} on ${chain}`);

  const factors = [];
  let rawScore = 50; // Start neutral

  try {
    // ─── Check DexScreener + CoinGecko for social data first (P0 fix) ───
    const dexSocials = await checkDexScreenerSocials(address, chain, factors, requestId);
    const cgListed = await checkCoinGeckoListed(address, chain, factors, requestId);

    // ─── Run social checks in parallel ───
    const [atvResult, serperResult, grokResult] = await Promise.allSettled([
      checkAtvIdentity(address, chain, factors, requestId),
      checkWebPresence(address, chain, factors, requestId),
      checkSocialSentiment(address, chain, factors, requestId)
    ]);

    // Process ATV results
    if (atvResult.status === 'fulfilled' && atvResult.value) {
      const atv = atvResult.value;
      if (atv.verified) {
        factors.push({ name: 'atv_verified', impact: 20, detail: `Identity verified: ${atv.name || 'team confirmed'}` });
      } else if (atv.found) {
        factors.push({ name: 'atv_found', impact: 10, detail: 'Identity record exists but unverified' });
      } else {
        factors.push({ name: 'atv_not_found', impact: -5, detail: 'No identity record in ATV' });
      }
    }

    // Process Serper web results
    if (serperResult.status === 'fulfilled' && serperResult.value) {
      const web = serperResult.value;
      if (web.resultCount > 10) {
        factors.push({ name: 'strong_web_presence', impact: 10, detail: `${web.resultCount}+ web results` });
      } else if (web.resultCount > 3) {
        factors.push({ name: 'moderate_web_presence', impact: 5, detail: `${web.resultCount} web results` });
      } else {
        factors.push({ name: 'weak_web_presence', impact: -10, detail: `Only ${web.resultCount} web results` });
      }

      // Check for official site
      if (web.hasOfficialSite) {
        factors.push({ name: 'official_site', impact: 10, detail: 'Official website found' });
      }

      // Check for negative mentions
      if (web.hasScamMentions) {
        factors.push({ name: 'scam_mentions', impact: -25, detail: 'Scam/rug mentions found in web results' });
      }
    }

    // Process social sentiment
    if (grokResult.status === 'fulfilled' && grokResult.value) {
      const sentiment = grokResult.value;
      
      // Twitter/X presence
      if (sentiment.hasTwitter) {
        factors.push({ name: 'twitter_active', impact: 10, detail: 'Active Twitter/X presence' });
        
        if (sentiment.followerCount > 10000) {
          factors.push({ name: 'large_following', impact: 10, detail: `${sentiment.followerCount.toLocaleString()} followers` });
        } else if (sentiment.followerCount > 1000) {
          factors.push({ name: 'growing_following', impact: 5, detail: `${sentiment.followerCount.toLocaleString()} followers` });
        }

        // Engagement quality
        if (sentiment.engagementRate > 0.05) {
          factors.push({ name: 'high_engagement', impact: 5, detail: `${(sentiment.engagementRate * 100).toFixed(1)}% engagement` });
        } else if (sentiment.engagementRate < 0.01) {
          factors.push({ name: 'low_engagement', impact: -5, detail: 'Suspiciously low engagement' });
        }
      } else {
        factors.push({ name: 'no_twitter', impact: -5, detail: 'No Twitter/X account found' });
      }

      // Telegram check
      if (sentiment.hasTelegram) {
        factors.push({ name: 'telegram_active', impact: 5, detail: 'Telegram community exists' });
      }

      // Overall sentiment
      if (sentiment.sentimentScore > 0.7) {
        factors.push({ name: 'positive_sentiment', impact: 10, detail: 'Strong positive sentiment' });
      } else if (sentiment.sentimentScore < 0.3) {
        factors.push({ name: 'negative_sentiment', impact: -15, detail: 'Predominantly negative sentiment' });
      }
    }

    // Calculate score from factors
    for (const factor of factors) {
      rawScore += factor.impact;
    }

    const finalScore = Math.max(0, Math.min(100, rawScore));
    const verdict = finalScore >= 70 ? 'STRONG' : finalScore >= 40 ? 'MODERATE' : 'WEAK';

    return {
      status: 'completed',
      score: finalScore,
      duration_ms: Date.now() - start,
      data: {
        verdict,
        factors,
        factor_count: factors.length
      }
    };

  } catch (err) {
    console.error(`[${requestId}] ❌ social-agent failed:`, err.message);
    return {
      status: 'error',
      score: 0,
      duration_ms: Date.now() - start,
      data: { error: err.message, factors }
    };
  }
}

/**
 * ATV Web3 Identity check
 */
async function checkAtvIdentity(address, chain, factors, requestId) {
  // ATV ENS Batch Resolve — FREE public endpoint (100 addresses/day)
  // No API key needed. Uses env vars ATV_API_URL + ATV_BATCH_ENDPOINT
  // Spec: ENS-DEPLOYER-VERIFICATION-SPEC-V2.md

  if (!address || !address.startsWith('0x')) {
    factors.push({ name: 'atv_skipped', impact: 0, detail: `ATV ENS only supports EVM addresses (got ${chain})` });
    return { found: false, verified: false };
  }

  const atvEnabled = process.env.ATV_ENABLED !== 'false';
  if (!atvEnabled) {
    factors.push({ name: 'atv_disabled', impact: 0, detail: 'ATV_ENABLED=false' });
    return { found: false, verified: false };
  }

  try {
    const baseUrl = process.env.ATV_API_URL || ATV_BASE || 'https://api.web3identity.com';
    const endpoint = process.env.ATV_BATCH_ENDPOINT || '/api/ens/batch-resolve';
    const url = `${baseUrl}${endpoint}?addresses=${address}&include=name,twitter,github`;

    console.log(`[${requestId}] [ATV] Resolving ENS for ${address}...`);

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 402) {
        factors.push({ name: 'atv_quota_exceeded', impact: 0, detail: 'ATV free tier exhausted (100/day)' });
      } else if (status === 429) {
        factors.push({ name: 'atv_rate_limited', impact: 0, detail: 'ATV rate limited (10 req/min)' });
      } else {
        factors.push({ name: 'atv_error', impact: 0, detail: `ATV HTTP ${status}` });
      }
      return { found: false, verified: false };
    }

    const data = await res.json();
    const item = data?.addresses?.[0];

    if (!item || !item.ens) {
      // REMOVED: duplicate atv_not_found (already handled in main orchestrator)
      return { found: false, verified: false, usage: data?.metadata?.usage };
    }

    const hasTwitter = !!item.social?.twitter;
    const hasGithub = !!item.social?.github;
    const hasSocialProof = hasTwitter || hasGithub;

    if (hasSocialProof) {
      const socialDetails = [];
      if (hasTwitter) socialDetails.push(`Twitter: @${item.social.twitter}`);
      if (hasGithub) socialDetails.push(`GitHub: ${item.social.github}`);
      factors.push({ name: 'atv_verified', impact: 20, detail: `ENS: ${item.ens} | ${socialDetails.join(', ')}` });
      console.log(`[${requestId}] [ATV] ✅ Verified: ${item.ens} (${socialDetails.join(', ')})`);
    } else {
      factors.push({ name: 'atv_found', impact: 10, detail: `ENS: ${item.ens} (no linked social accounts)` });
      console.log(`[${requestId}] [ATV] 🏷️ ENS found: ${item.ens} (no socials)`);
    }

    return {
      found: true, verified: hasSocialProof, name: item.ens, ens: item.ens,
      twitter: item.social?.twitter || null, github: item.social?.github || null,
      avatar: item.avatar || null,
      socials: [
        ...(hasTwitter ? [{ type: 'twitter', handle: item.social.twitter }] : []),
        ...(hasGithub ? [{ type: 'github', handle: item.social.github }] : [])
      ],
      usage: data?.metadata?.usage
    };

  } catch (err) {
    factors.push({ name: 'atv_error', impact: 0, detail: err.message });
    console.log(`[${requestId}] [ATV] Error: ${err.message}`);
    return { found: false, verified: false };
  }
}

/**
 * Serper web search for project presence
 */
async function checkWebPresence(address, chain, factors, requestId) {
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) {
    factors.push({ name: 'serper_unavailable', impact: 0, detail: 'Serper API key not configured' });
    return { resultCount: 0, hasOfficialSite: false, hasScamMentions: false };
  }

  try {
    // Search for the contract address
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: `${address} token crypto`, num: 10 }),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data = await res.json();
      const organic = data.organic || [];
      
      const hasScamMentions = organic.some(r => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return text.includes('scam') || text.includes('rug') || text.includes('fraud') || text.includes('honeypot');
      });

      const hasOfficialSite = organic.some(r => {
        const url = (r.link || '').toLowerCase();
        return !url.includes('dexscreener') && !url.includes('twitter') && 
               !url.includes('reddit') && !url.includes('etherscan') &&
               !url.includes('solscan') && !url.includes('coingecko');
      });

      return {
        resultCount: organic.length,
        hasOfficialSite,
        hasScamMentions,
        topResults: organic.slice(0, 3).map(r => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet?.slice(0, 100)
        }))
      };
    }
    return { resultCount: 0, hasOfficialSite: false, hasScamMentions: false };
  } catch (err) {
    factors.push({ name: 'serper_error', impact: 0, detail: err.message });
    return { resultCount: 0, hasOfficialSite: false, hasScamMentions: false };
  }
}

/**
 * Social sentiment check — data-only (no LLM)
 * Project Opus Brain: Claude Code analyzes raw social data directly.
 * This function returns raw social signals for Claude Code to interpret.
 */
async function checkSocialSentiment(address, chain, factors, requestId) {
  const defaultResult = {
    hasTwitter: false,
    hasTelegram: false,
    followerCount: 0,
    engagementRate: 0,
    sentimentScore: 0.5
  };

  // Use Serper to check for Twitter/X presence (already have the key for web search)
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) {
    factors.push({ name: 'social_sentiment_skipped', impact: 0, detail: 'No Serper key for Twitter search' });
    return defaultResult;
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: `site:x.com OR site:twitter.com ${address} token`, num: 10 }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return defaultResult;

    const data = await res.json();
    const organic = data.organic || [];

    const hasTwitter = organic.length > 0;
    const hasTelegram = organic.some(r =>
      `${r.title} ${r.snippet}`.toLowerCase().includes('telegram')
    );

    // Estimate engagement from result quality
    const mentionCount = organic.length;
    const engagementRate = Math.min(1, mentionCount / 10);

    // Basic sentiment from snippet analysis (no LLM — just keyword counting)
    let positiveSignals = 0;
    let negativeSignals = 0;
    for (const r of organic) {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      if (text.match(/bullish|moon|gem|based|legit|safu|growing|partnership/)) positiveSignals++;
      if (text.match(/scam|rug|honeypot|fake|dead|dump|avoid|warning/)) negativeSignals++;
    }
    const total = positiveSignals + negativeSignals;
    const sentimentScore = total > 0 ? positiveSignals / total : 0.5;

    return {
      hasTwitter,
      hasTelegram,
      followerCount: 0, // Not available from search — Claude Code can enrich
      engagementRate,
      sentimentScore,
      mentionCount,
      rawResults: organic.slice(0, 5).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet?.slice(0, 150)
      }))
    };
  } catch (err) {
    factors.push({ name: 'social_sentiment_error', impact: 0, detail: err.message });
    return defaultResult;
  }
}

/**
 * Check DexScreener .info.socials and .info.websites (P0 fix)
 * Many tokens have socials in .pairs[0].info but not at top level
 */
async function checkDexScreenerSocials(address, chain, factors, requestId) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;

    const info = pair.info || {};
    const websites = info.websites || [];
    const socials = info.socials || [];

    // Check websites
    if (websites.length > 0) {
      factors.push({ name: 'dex_website_found', impact: 10, detail: `Website: ${websites[0].url}` });
    }

    // Check socials (twitter, telegram, discord)
    for (const s of socials) {
      if (s.type === 'twitter' || s.url?.includes('x.com') || s.url?.includes('twitter.com')) {
        factors.push({ name: 'dex_twitter_found', impact: 10, detail: `Twitter: ${s.url}` });
      }
      if (s.type === 'telegram' || s.url?.includes('t.me')) {
        factors.push({ name: 'dex_telegram_found', impact: 5, detail: `Telegram: ${s.url}` });
      }
      if (s.type === 'discord' || s.url?.includes('discord')) {
        factors.push({ name: 'dex_discord_found', impact: 5, detail: `Discord: ${s.url}` });
      }
    }

    return { websites, socials };
  } catch (e) {
    console.log(`[${requestId}] DexScreener social check failed: ${e.message}`);
    return null;
  }
}

/**
 * Check if token is listed on CoinGecko (P0 fix)
 */
async function checkCoinGeckoListed(address, chain, factors, requestId) {
  try {
    const cgChain = chain === 'bsc' ? 'binance-smart-chain' : chain;
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${cgChain}/contract/${address}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.id) {
      factors.push({ name: 'coingecko_listed', impact: 10, detail: `CoinGecko: ${data.name} (${data.symbol})` });
      if (data.links?.twitter_screen_name) {
        factors.push({ name: 'cg_twitter', impact: 5, detail: `CG Twitter: @${data.links.twitter_screen_name}` });
      }
      if (data.links?.homepage?.[0]) {
        factors.push({ name: 'cg_homepage', impact: 5, detail: `CG Homepage: ${data.links.homepage[0]}` });
      }
      return true;
    }
    return false;
  } catch (e) {
    console.log(`[${requestId}] CoinGecko check failed: ${e.message}`);
    return false;
  }
}

module.exports = { runSocialAgent };
