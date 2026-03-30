/**
 * ARIA Enricher — Deep Token Enrichment via Buzz API Raw Endpoints
 * Orchestrates calls to localhost:3000 raw data endpoints and merges results
 * into the unified ARIA token schema.
 *
 * Buzz BD Agent | ARIA Service Layer
 */

const BUZZ_API = 'http://127.0.0.1:3000';
const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;
const TIMEOUT_MS = 20000;

/**
 * Internal fetch helper — calls Buzz API with admin key
 */
async function buzzFetch(path) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${BUZZ_API}${path}`, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': ADMIN_KEY
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, error: `${res.status} ${res.statusText}` };
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200) };
  }
}

/**
 * Enrich a single token with all available Buzz raw data endpoints.
 * @param {Object} token - Normalized ARIA token (must have .address and .chain)
 * @returns {Object} Enriched token with metadata.enrichment_sources populated
 */
async function enrichToken(token) {
  if (!token?.address) throw new Error('Token address required for enrichment');

  const chain = token.chain || 'solana';
  const addr = token.address;
  const started = Date.now();

  // Fire all enrichment calls in parallel
  // NOTE: HeyAnon Rug-O-Meter will be added here when MCP session is connected
  const [scanResult, safetyResult, walletResult, socialResult, technicalResult, scoresResult] = await Promise.allSettled([
    buzzFetch(`/api/v1/scan/raw/${addr}?chain=${chain}`),
    buzzFetch(`/api/v1/safety/raw/${addr}?chain=${chain}`),
    buzzFetch(`/api/v1/wallet/raw/${addr}?chain=${chain}`),
    buzzFetch(`/api/v1/social/raw/${addr}?chain=${chain}`),
    buzzFetch(`/api/v1/technical/raw/${addr}?chain=${chain}`),
    buzzFetch(`/api/v1/scores/components/${addr}`)
  ]);

  const sources = [];

  // ─── Merge scan data ──────────────────────────────
  if (scanResult.status === 'fulfilled' && scanResult.value.success) {
    const d = scanResult.value.data;
    sources.push('scan');
    if (d.tokenName) token.name = token.name || d.tokenName;
    if (d.tokenSymbol) token.symbol = token.symbol || d.tokenSymbol;
    if (d.priceUsd) token.market.price_usd = parseFloat(d.priceUsd);
    if (d.marketCap) token.market.mcap_circulating = d.marketCap;
    if (d.liquidity) token.market.liquidity_usd = d.liquidity;
    token.market.source = token.market.source || 'scan';
  }

  // ─── Merge safety data ────────────────────────────
  if (safetyResult.status === 'fulfilled' && safetyResult.value.success) {
    const d = safetyResult.value.data;
    sources.push('safety');
    if (d.score != null) token.safety.rugcheck = d.score;
    if (d.raw) {
      const raw = d.raw;
      if (raw.honeypot != null) token.safety.honeypot = raw.honeypot;
      if (raw.sellTax != null) token.safety.sell_tax = raw.sellTax;
      if (raw.contractVerified != null) token.safety.contract_verified = raw.contractVerified;
      if (raw.goplusIssues != null) token.safety.goplus_issues = raw.goplusIssues;
      if (raw.dextScore != null) token.safety.dextscore = raw.dextScore;
      if (raw.tokenSnifferScore != null) token.safety.token_sniffer = raw.tokenSnifferScore;
    }
    token.safety.source = 'safety';
  }

  // ─── Merge wallet data ────────────────────────────
  if (walletResult.status === 'fulfilled' && walletResult.value.success) {
    sources.push('wallet');
    // Wallet data structure varies — store raw for now
  }

  // ─── Merge social data ────────────────────────────
  if (socialResult.status === 'fulfilled' && socialResult.value.success) {
    const d = socialResult.value.data;
    sources.push('social');
    if (d.raw) {
      const raw = d.raw;
      if (raw.twitterHandle) token.social.twitter_handle = raw.twitterHandle;
      if (raw.twitterFollowers) token.social.twitter_followers = raw.twitterFollowers;
      if (raw.telegramMembers) token.social.telegram_members = raw.telegramMembers;
      if (raw.discordMembers) token.social.discord_members = raw.discordMembers;
      if (raw.website) token.social.website = raw.website;
      if (raw.github) token.social.github = raw.github;
    }
    token.social.source = 'social';
  }

  // ─── Merge technical data ─────────────────────────
  if (technicalResult.status === 'fulfilled' && technicalResult.value.success) {
    sources.push('technical');
    // Technical indicators stored in raw — could map RSI/MACD if needed
  }

  // ─── Merge scores/classification ──────────────────
  if (scoresResult.status === 'fulfilled' && scoresResult.value.success) {
    const d = scoresResult.value.data;
    sources.push('scores');
    if (d.composite != null) token.classification.composite_score = d.composite;
    if (d.safety != null) token.classification.safety_score = d.safety;
    if (d.wallet != null) token.classification.wallet_score = d.wallet;
    if (d.technical != null) token.classification.technical_score = d.technical;
    if (d.social != null) token.classification.social_score = d.social;
    if (d.market != null) token.classification.market_score = d.market;
    if (d.bdClass) token.classification.bd_class = d.bdClass;
    if (d.dualGate != null) token.classification.dual_gate = d.dualGate;
    if (d.outreachReady != null) token.classification.outreach_ready = d.outreachReady;
  }

  // NOTE: HeyAnon rug-check merge will go here when MCP session is connected

  token.metadata.enriched_at = new Date().toISOString();
  token.metadata.enrichment_sources = sources;

  return {
    token,
    sources,
    duration_ms: Date.now() - started
  };
}

module.exports = { enrichToken };
