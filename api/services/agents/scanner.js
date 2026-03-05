/**
 * Scanner Sub-Agent — L1 Discovery
 * Sources: DexScreener API, CoinMarketCap API, GeckoTerminal, AIXBT, DS Boosts
 * Model: bankr/gpt-5-nano (on OpenClaw) | Direct API calls (on REST API)
 * 
 * CMC Basic Plan: 10K calls/month, 30 req/min, 14 endpoints, personal use
 * 
 * Returns token metadata, market data, pair info, CMC rankings
 */

const DEXSCREENER_BASE = 'https://api.dexscreener.com';
const CMC_BASE = 'https://pro-api.coinmarketcap.com';

async function runScannerAgent({ address, chain, requestId }) {
  const start = Date.now();
  console.log(`[${requestId}] 📡 scanner-agent: Starting for ${address} on ${chain}`);

  try {
    // ─── DexScreener: Token pairs endpoint ───
    const pairsUrl = `${DEXSCREENER_BASE}/latest/dex/tokens/${address}`;
    const pairsRes = await fetch(pairsUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });

    if (!pairsRes.ok) {
      throw new Error(`DexScreener returned ${pairsRes.status}`);
    }

    const pairsData = await pairsRes.json();
    const pairs = pairsData.pairs || [];

    if (pairs.length === 0) {
      return {
        status: 'completed',
        score: 0,
        duration_ms: Date.now() - start,
        tokenName: null,
        tokenSymbol: null,
        data: {
          found: false,
          pairs_count: 0,
          message: 'No pairs found on DexScreener'
        }
      };
    }

    // Get the primary pair (highest liquidity)
    const primaryPair = pairs.reduce((best, pair) => {
      const liq = parseFloat(pair.liquidity?.usd || 0);
      return liq > (parseFloat(best.liquidity?.usd || 0)) ? pair : best;
    }, pairs[0]);

    // Extract token data
    const tokenData = {
      found: true,
      pairs_count: pairs.length,
      name: primaryPair.baseToken?.name || null,
      symbol: primaryPair.baseToken?.symbol || null,
      chain: primaryPair.chainId || chain,
      dex: primaryPair.dexId || null,
      pair_address: primaryPair.pairAddress || null,
      
      // Market data
      price_usd: parseFloat(primaryPair.priceUsd || 0),
      price_native: parseFloat(primaryPair.priceNative || 0),
      market_cap: parseFloat(primaryPair.marketCap || primaryPair.fdv || 0),
      fdv: parseFloat(primaryPair.fdv || 0),
      liquidity_usd: parseFloat(primaryPair.liquidity?.usd || 0),
      
      // Volume
      volume_24h: parseFloat(primaryPair.volume?.h24 || 0),
      volume_6h: parseFloat(primaryPair.volume?.h6 || 0),
      volume_1h: parseFloat(primaryPair.volume?.h1 || 0),
      
      // Price changes
      price_change_24h: parseFloat(primaryPair.priceChange?.h24 || 0),
      price_change_6h: parseFloat(primaryPair.priceChange?.h6 || 0),
      price_change_1h: parseFloat(primaryPair.priceChange?.h1 || 0),
      price_change_5m: parseFloat(primaryPair.priceChange?.m5 || 0),
      
      // Transactions
      txns_24h_buys: primaryPair.txns?.h24?.buys || 0,
      txns_24h_sells: primaryPair.txns?.h24?.sells || 0,
      txns_1h_buys: primaryPair.txns?.h1?.buys || 0,
      txns_1h_sells: primaryPair.txns?.h1?.sells || 0,
      
      // URLs
      dexscreener_url: primaryPair.url || `https://dexscreener.com/${chain}/${address}`,
      
      // Pair age
      pair_created_at: primaryPair.pairCreatedAt || null,
      
      // Social/info
      websites: primaryPair.info?.websites || [],
      socials: primaryPair.info?.socials || [],
      image_url: primaryPair.info?.imageUrl || null,
      
      // Boosts (if present)
      boosts: primaryPair.boosts?.active || 0
    };

    // ─── DexScreener: Token profile (boosted info) ───
    try {
      const profileUrl = `${DEXSCREENER_BASE}/token-profiles/latest/v1`;
      const profileRes = await fetch(profileUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (profileRes.ok) {
        const profiles = await profileRes.json();
        const match = profiles.find(p => 
          p.tokenAddress?.toLowerCase() === address.toLowerCase()
        );
        if (match) {
          tokenData.boosted = true;
          tokenData.boost_amount = match.amount || 0;
        }
      }
    } catch {
      // Non-critical, continue
    }

    // ─── CoinMarketCap: Market data enrichment ───
    // CMC gives us: CMC rank, circulating supply, CMC listing status,
    // % changes (1h/24h/7d/30d), volume/MC ratio — data DexScreener doesn't have
    let cmcData = null;
    try {
      cmcData = await fetchCmcData(address, chain, tokenData.symbol, requestId);
      if (cmcData) {
        tokenData.cmc = {
          id: cmcData.id,
          name: cmcData.name,
          symbol: cmcData.symbol,
          slug: cmcData.slug,
          cmc_rank: cmcData.cmc_rank || null,
          is_active: cmcData.is_active === 1,
          circulating_supply: cmcData.circulating_supply || null,
          total_supply: cmcData.total_supply || null,
          max_supply: cmcData.max_supply || null,
          market_cap_dominance: cmcData.quote?.USD?.market_cap_dominance || null,
          // Price changes not available in DexScreener
          price_change_7d: cmcData.quote?.USD?.percent_change_7d || null,
          price_change_30d: cmcData.quote?.USD?.percent_change_30d || null,
          price_change_60d: cmcData.quote?.USD?.percent_change_60d || null,
          price_change_90d: cmcData.quote?.USD?.percent_change_90d || null,
          // Volume/MC ratio (health indicator)
          volume_change_24h: cmcData.quote?.USD?.volume_change_24h || null,
          // CMC timestamps
          date_added: cmcData.date_added || null,
          last_updated: cmcData.quote?.USD?.last_updated || null,
          // Tags (e.g., "meme", "defi", "gaming")
          tags: cmcData.tags || [],
          // Platform info
          platform: cmcData.platform || null,
          // CMC URL
          url: cmcData.slug ? `https://coinmarketcap.com/currencies/${cmcData.slug}/` : null
        };
        tokenData.cmc_listed = true;

        // Cross-validate MC between DexScreener and CMC
        const cmcMc = cmcData.quote?.USD?.market_cap || 0;
        if (cmcMc > 0 && tokenData.market_cap > 0) {
          const mcDiff = Math.abs(cmcMc - tokenData.market_cap) / tokenData.market_cap;
          tokenData.cmc.mc_difference_pct = Math.round(mcDiff * 100);
          if (mcDiff > 0.5) {
            tokenData.cmc.mc_warning = 'Large MC discrepancy between DexScreener and CMC';
          }
        }
      }
    } catch (cmcErr) {
      // Non-critical — DexScreener is primary, CMC enriches
      console.log(`[${requestId}] ⚠️ CMC enrichment skipped: ${cmcErr.message}`);
    }

    // ─── Compute scanner discovery score ───
    // Scanner doesn't directly score — it provides data. But we flag quality signals.
    const discoverySignals = {
      has_liquidity: tokenData.liquidity_usd > 1000,
      has_volume: tokenData.volume_24h > 5000,
      active_trading: (tokenData.txns_24h_buys + tokenData.txns_24h_sells) > 50,
      multi_pair: tokenData.pairs_count > 1,
      has_social: tokenData.socials.length > 0,
      has_website: tokenData.websites.length > 0,
      is_boosted: tokenData.boosted || tokenData.boosts > 0,
      reasonable_mc: tokenData.market_cap >= 10000 && tokenData.market_cap <= 100000000,
      // CMC signals (new)
      cmc_listed: tokenData.cmc_listed || false,
      cmc_ranked: (tokenData.cmc?.cmc_rank || 0) > 0 && (tokenData.cmc?.cmc_rank || 99999) < 5000,
      has_7d_history: tokenData.cmc?.price_change_7d !== null,
      cmc_tagged: (tokenData.cmc?.tags?.length || 0) > 0
    };

    const signalCount = Object.values(discoverySignals).filter(Boolean).length;
    
    return {
      status: 'completed',
      score: 0, // Scanner doesn't score — provides data for other agents
      duration_ms: Date.now() - start,
      tokenName: tokenData.name,
      tokenSymbol: tokenData.symbol,
      marketCap: tokenData.market_cap,
      liquidity: tokenData.liquidity_usd,
      priceUsd: tokenData.price_usd,
      dexscreenerUrl: tokenData.dexscreener_url,
      data: {
        ...tokenData,
        discovery_signals: discoverySignals,
        signal_count: signalCount,
        signal_max: Object.keys(discoverySignals).length
      }
    };

  } catch (err) {
    console.error(`[${requestId}] ❌ scanner-agent failed:`, err.message);
    return {
      status: 'error',
      score: 0,
      duration_ms: Date.now() - start,
      data: { error: err.message }
    };
  }
}

module.exports = { runScannerAgent };

// ═══════════════════════════════════════════════════
// CoinMarketCap API Functions
// Basic Plan: 10K calls/month, 30 req/min, 14 endpoints
// Key: via CMC_API_KEY env var
// ═══════════════════════════════════════════════════

/**
 * Fetch CMC data for a token
 * Strategy: Try by contract address first (most reliable), fall back to symbol
 * Uses 1-2 API calls per token
 */
async function fetchCmcData(address, chain, symbol, requestId) {
  const CMC_KEY = process.env.CMC_API_KEY;
  if (!CMC_KEY) {
    return null;
  }

  const headers = {
    'X-CMC_PRO_API_KEY': CMC_KEY,
    'Accept': 'application/json'
  };

  // ─── Method 1: Lookup by contract address (most accurate) ───
  // /v1/cryptocurrency/info supports contract_address parameter
  try {
    const platformMap = {
      'solana': 'solana',
      'sol': 'solana',
      'ethereum': 'ethereum',
      'eth': 'ethereum',
      'base': 'base',
      'bsc': 'binance-smart-chain',
      'polygon': 'polygon',
      'avalanche': 'avalanche',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism'
    };
    
    const platform = platformMap[chain.toLowerCase()];
    
    if (platform) {
      // /v2/cryptocurrency/info — lookup by contract address
      const infoUrl = `${CMC_BASE}/v2/cryptocurrency/info?address=${address}`;
      const infoRes = await fetch(infoUrl, {
        headers,
        signal: AbortSignal.timeout(8000)
      });

      if (infoRes.ok) {
        const infoData = await infoRes.json();
        const tokens = infoData.data ? Object.values(infoData.data) : [];
        
        if (tokens.length > 0) {
          const token = Array.isArray(tokens[0]) ? tokens[0][0] : tokens[0];
          const cmcId = token.id;
          
          if (cmcId) {
            // Got CMC ID — now get quotes for price/volume data
            return await fetchCmcQuotes(cmcId, headers, requestId);
          }
        }
      }
    }
  } catch (err) {
    console.log(`[${requestId}] CMC address lookup failed: ${err.message}`);
  }

  // ─── Method 2: Fallback to symbol lookup ───
  // Less accurate (multiple tokens can share a symbol) but works for well-known tokens
  if (symbol) {
    try {
      const quotesUrl = `${CMC_BASE}/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol)}&convert=USD`;
      const quotesRes = await fetch(quotesUrl, {
        headers,
        signal: AbortSignal.timeout(8000)
      });

      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        const tokenData = quotesData.data?.[symbol.toUpperCase()];
        if (tokenData) {
          return tokenData;
        }
      }
    } catch (err) {
      console.log(`[${requestId}] CMC symbol lookup failed: ${err.message}`);
    }
  }

  return null;
}

/**
 * Fetch CMC quotes (price, volume, MC) by CMC ID
 */
async function fetchCmcQuotes(cmcId, headers, requestId) {
  try {
    const url = `${CMC_BASE}/v1/cryptocurrency/quotes/latest?id=${cmcId}&convert=USD`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      return data.data?.[String(cmcId)] || null;
    }
  } catch (err) {
    console.log(`[${requestId}] CMC quotes fetch failed: ${err.message}`);
  }
  return null;
}
