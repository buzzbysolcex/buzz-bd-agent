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
        factors.push({ name: 'no_twitter', impact: -10, detail: 'No Twitter/X account found' });
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
      factors.push({ name: 'atv_not_found', impact: -5, detail: 'No ENS identity for this address' });
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
 * Social sentiment check via Grok x_search (or fallback)
 * Note: Grok can be slow (30-60s) — this is the bottleneck agent
 */
async function checkSocialSentiment(address, chain, factors, requestId) {
  const GROK_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  // Default neutral response
  const defaultResult = {
    hasTwitter: false,
    hasTelegram: false,
    followerCount: 0,
    engagementRate: 0,
    sentimentScore: 0.5
  };

  if (!GROK_KEY) {
    factors.push({ name: 'grok_unavailable', impact: 0, detail: 'Grok/xAI API key not configured' });
    return defaultResult;
  }

  try {
    // Use Grok's x_search for Twitter/X sentiment
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{
          role: 'user',
          content: `Analyze the Twitter/X social presence and sentiment for the crypto token with contract address ${address} on ${chain}. Return ONLY a JSON object with these fields: hasTwitter (bool), hasTelegram (bool), followerCount (number), engagementRate (decimal 0-1), sentimentScore (decimal 0-1 where 1=very positive), summary (brief text). If you can't find info, use reasonable defaults.`
        }],
        temperature: 0.1,
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(60000) // 60s timeout for Grok
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Try to parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            hasTwitter: parsed.hasTwitter || false,
            hasTelegram: parsed.hasTelegram || false,
            followerCount: parsed.followerCount || 0,
            engagementRate: parsed.engagementRate || 0,
            sentimentScore: parsed.sentimentScore || 0.5,
            summary: parsed.summary || null
          };
        }
      } catch {
        // JSON parse failed, use defaults
      }
    }

    return defaultResult;
  } catch (err) {
    factors.push({ name: 'grok_error', impact: 0, detail: err.message });
    return defaultResult;
  }
}

module.exports = { runSocialAgent };
