/**
 * ARIA Normalizer — Unified Token Schema
 * Normalizes tokens from DexScreener, Jupiter, CoinGecko into a single schema.
 *
 * Buzz BD Agent | ARIA Service Layer
 */

/**
 * Create empty unified token object with defaults
 */
function emptyToken(address, chain) {
  return {
    address: address || null,
    chain: chain || "solana",
    symbol: null,
    name: null,
    discovery: {
      source: null,
      discovered_at: new Date().toISOString(),
      discovery_type: null,
    },
    market: {
      price_usd: null,
      mcap_circulating: null,
      mcap_fdv: null,
      fdv_gap: null,
      volume_24h: null,
      liquidity_usd: null,
      pair_count: null,
      pair_age_days: null,
      exchange_count: null,
      exchanges: [],
      source: null,
    },
    safety: {
      token_sniffer: null,
      goplus_issues: null,
      honeypot: null,
      sell_tax: null,
      dextscore: null,
      rugcheck: null,
      contract_verified: null,
      source: null,
    },
    social: {
      twitter_handle: null,
      twitter_followers: null,
      telegram_members: null,
      discord_members: null,
      website: null,
      github: null,
      source: null,
    },
    team: {
      doxxed: null,
      founder: null,
      dev: null,
      email: null,
      source: null,
    },
    technical: {
      github_stars: null,
      github_last_commit: null,
      contract_verified: null,
      has_documentation: null,
      source: null,
    },
    classification: {
      bd_class: null,
      composite_score: null,
      safety_score: null,
      wallet_score: null,
      technical_score: null,
      social_score: null,
      market_score: null,
      dual_gate: null,
      outreach_ready: false,
    },
    metadata: {
      enriched_at: null,
      enrichment_sources: [],
    },
  };
}

/**
 * Normalize a DexScreener pair/boosted token into unified schema
 */
function fromDexScreener(pair, discoveryType) {
  const token = emptyToken(
    pair.baseToken?.address || pair.tokenAddress || null,
    mapChainId(pair.chainId),
  );

  token.symbol = pair.baseToken?.symbol || null;
  token.name = pair.baseToken?.name || null;
  token.discovery.source = "dexscreener";
  token.discovery.discovery_type = discoveryType || "trending";

  if (pair.priceUsd) token.market.price_usd = parseFloat(pair.priceUsd);
  if (pair.marketCap) token.market.mcap_circulating = pair.marketCap;
  if (pair.fdv) token.market.mcap_fdv = pair.fdv;
  if (pair.marketCap && pair.fdv && pair.fdv > 0) {
    token.market.fdv_gap = parseFloat(
      (((pair.fdv - pair.marketCap) / pair.fdv) * 100).toFixed(2),
    );
  }
  if (pair.volume?.h24) token.market.volume_24h = pair.volume.h24;
  if (pair.liquidity?.usd) token.market.liquidity_usd = pair.liquidity.usd;
  token.market.source = "dexscreener";

  // Pair age
  if (pair.pairCreatedAt) {
    const ageDays = (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60 * 24);
    token.market.pair_age_days = parseFloat(ageDays.toFixed(1));
  }

  // Social from info
  if (pair.info?.socials) {
    for (const s of pair.info.socials) {
      if (s.type === "twitter")
        token.social.twitter_handle = s.url?.split("/").pop() || null;
    }
  }
  if (pair.info?.websites?.[0]?.url) {
    token.social.website = pair.info.websites[0].url;
  }

  return token;
}

/**
 * Normalize a Jupiter recent token into unified schema
 */
function fromJupiter(jup) {
  const token = emptyToken(jup.address || jup.mint || null, "solana");

  token.symbol = jup.symbol || null;
  token.name = jup.name || null;
  token.discovery.source = "jupiter";
  token.discovery.discovery_type = "new_listing";

  if (jup.price) token.market.price_usd = parseFloat(jup.price);
  if (jup.marketCap) token.market.mcap_circulating = jup.marketCap;
  if (jup.fdv) token.market.mcap_fdv = jup.fdv;
  if (jup.volume24h) token.market.volume_24h = jup.volume24h;
  if (jup.liquidity) token.market.liquidity_usd = jup.liquidity;
  token.market.source = "jupiter";

  return token;
}

/**
 * Normalize a CoinGecko trending coin into unified schema
 */
function fromCoinGecko(coin) {
  const item = coin.item || coin;
  const token = emptyToken(
    item.platforms?.solana || item.id || null,
    item.platforms?.solana ? "solana" : "unknown",
  );

  token.symbol = item.symbol || null;
  token.name = item.name || null;
  token.discovery.source = "coingecko";
  token.discovery.discovery_type = "trending";

  if (item.data?.price) token.market.price_usd = parseFloat(item.data.price);
  if (item.data?.market_cap)
    token.market.mcap_circulating = parseFloat(
      String(item.data.market_cap).replace(/[,$]/g, ""),
    );
  if (item.data?.total_volume)
    token.market.volume_24h = parseFloat(
      String(item.data.total_volume).replace(/[,$]/g, ""),
    );
  token.market.source = "coingecko";

  return token;
}

/**
 * Map chain IDs from various sources to canonical names
 */
function mapChainId(chainId) {
  if (!chainId) return "unknown";
  const map = {
    solana: "solana",
    ethereum: "ethereum",
    bsc: "bsc",
    base: "base",
    arbitrum: "arbitrum",
    polygon: "polygon",
    avalanche: "avalanche",
    optimism: "optimism",
  };
  return map[chainId.toLowerCase()] || chainId.toLowerCase();
}

/**
 * Deduplicate tokens by address (keep first seen)
 */
function deduplicateTokens(tokens) {
  const seen = new Map();
  for (const t of tokens) {
    if (!t.address) continue;
    const key = `${t.chain}:${t.address.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, t);
    }
  }
  return Array.from(seen.values());
}

// ─── Normalizer: Colosseum Copilot ───────────────────
function fromColosseum(project) {
  const addr = project.token_address || project.contract_address || "";
  const chain = project.chain || "solana";
  const token = emptyToken(addr, chain);
  token.symbol = project.token_symbol || project.ticker || "";
  token.name = project.name || project.project_name || "";
  token.discovery.source = "colosseum";
  token.discovery.discovery_type = "hackathon";
  if (project.website) token.social.website = project.website;
  if (project.twitter) token.social.twitter_handle = project.twitter;
  if (project.github) token.technical.github_url = project.github;
  token.social.source = "colosseum";
  token.metadata.colosseum = {
    hackathon: project.hackathon || null,
    result: project.result || null,
    slug: project.slug || null,
  };
  return token;
}

module.exports = {
  emptyToken,
  fromDexScreener,
  fromJupiter,
  fromCoinGecko,
  fromColosseum,
  mapChainId,
  deduplicateTokens,
};
