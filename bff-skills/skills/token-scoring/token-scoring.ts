/**
 * Token Scoring — 4-category composite scoring engine (11 factors, max 100)
 * BFF Skills Competition | AIBTC x Bitflow
 * Author: buzzbysolcex (Ionic Nova / Buzz BD Agent)
 *
 * 4 categories: Market (30pts), Safety (30pts), Social (20pts), Quality (20pts)
 * Dual-gate: fundamentals AND market must independently clear 60%.
 * Classification: HOT (85+), QUALIFIED (70-84), WATCH (50-69), SKIP (<50).
 * Chains: Solana, Base, BSC, Stacks (SIP-010)
 *
 * Usage:
 *   bun run token-scoring/token-scoring.ts doctor
 *   bun run token-scoring/token-scoring.ts run --address <contract> --chain <chain>
 */

const DEXSCREENER_API = "https://api.dexscreener.com";
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const RUGCHECK_API = "https://api.rugcheck.xyz/v1";
const HIRO_API = "https://api.mainnet.hiro.so";

// ═══════════════════════════════════════
// SCORING FACTORS (11 factors, max 100)
// ═══════════════════════════════════════

const SCORING_FACTORS = {
  // Market (30 pts)
  market_cap:       { max: 10, category: "market" },
  liquidity:        { max: 10, category: "market" },
  volume:           { max: 10, category: "market" },
  // Safety (30 pts)
  contract_safety:  { max: 15, category: "safety" },
  holder_dist:      { max: 15, category: "safety" },
  // Social (20 pts)
  team_identity:    { max: 10, category: "social" },
  social_presence:  { max: 10, category: "social" },
  // Quality (20 pts)
  token_age:        { max: 5, category: "quality" },
  deployer_history: { max: 5, category: "quality" },
  web_footprint:    { max: 5, category: "quality" },
  momentum:         { max: 5, category: "quality" }
};

// ═══════════════════════════════════════
// DATA FETCHERS
// ═══════════════════════════════════════

async function fetchJSON(url: string, timeout = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchDexScreener(address: string): Promise<any> {
  const data = await fetchJSON(`${DEXSCREENER_API}/latest/dex/search?q=${address}`);
  if (!data?.pairs?.length) return null;
  const pair = data.pairs[0];
  return {
    found: true,
    price_usd: parseFloat(pair.priceUsd || "0"),
    market_cap: pair.fdv || pair.marketCap || 0,
    liquidity_usd: pair.liquidity?.usd || 0,
    volume_24h: pair.volume?.h24 || 0,
    price_change_24h: pair.priceChange?.h24 || 0,
    pair_created_at: pair.pairCreatedAt,
    chain: pair.chainId,
    token_name: pair.baseToken?.name,
    token_symbol: pair.baseToken?.symbol
  };
}

async function fetchCoinGecko(address: string, chain: string): Promise<any> {
  const cgChain = chain === "bsc" ? "binance-smart-chain" : chain;
  const data = await fetchJSON(`${COINGECKO_API}/coins/${cgChain}/contract/${address}`);
  if (!data?.id) return null;
  return {
    found: true,
    name: data.name,
    symbol: data.symbol,
    market_cap: data.market_data?.market_cap?.usd || 0,
    total_supply: data.market_data?.total_supply || 0,
    circulating_supply: data.market_data?.circulating_supply || 0
  };
}

async function fetchRugCheck(address: string): Promise<any> {
  const data = await fetchJSON(`${RUGCHECK_API}/tokens/${address}/report/summary`);
  if (!data) return { found: false, score: 50, verdict: "unknown" };
  return {
    found: true,
    score: data.score || 50,
    verdict: data.verdict || "unknown",
    risks: data.risks || []
  };
}

// ═══════════════════════════════════════
// STACKS SIP-010 TOKEN LOOKUP (Hiro API)
// ═══════════════════════════════════════

async function fetchStacksToken(contractId: string): Promise<any> {
  // contractId format: SP...address.token-name
  const data = await fetchJSON(`${HIRO_API}/extended/v1/tokens/ft/metadata/${contractId}`);
  if (!data) return null;
  return {
    found: true,
    name: data.name || null,
    symbol: data.symbol || null,
    decimals: data.decimals || 0,
    total_supply: data.total_supply || "0",
    description: data.description || null
  };
}

// ═══════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════

function scoreMarketCap(mcap: number): number {
  if (mcap >= 100000 && mcap <= 50000000) return 10;
  if (mcap >= 10000 && mcap < 100000) return 6;
  if (mcap > 50000000 && mcap <= 100000000) return 8;
  if (mcap > 100000000) return 5;
  if (mcap < 10000) return 2;
  return 0;
}

function scoreLiquidity(liq: number, mcap: number): number {
  if (liq < 10000) return 0;
  if (liq < 50000) return 3;
  const ratio = mcap > 0 ? liq / mcap : 0;
  if (ratio >= 0.03 && liq >= 100000) return 10;
  if (ratio >= 0.02) return 8;
  if (ratio >= 0.01) return 5;
  return 3;
}

function scoreVolume(vol: number, mcap: number): number {
  if (vol < 5000) return 0;
  const ratio = mcap > 0 ? vol / mcap : 0;
  if (ratio >= 0.1) return 10;
  if (ratio >= 0.05) return 8;
  if (ratio >= 0.01) return 5;
  return 3;
}

function scoreSafety(rugcheck: any): number {
  if (!rugcheck?.found) return 7;
  if (rugcheck.verdict === "Good" || rugcheck.score >= 80) return 15;
  if (rugcheck.verdict === "Warning" || rugcheck.score >= 50) return 10;
  if (rugcheck.score >= 30) return 5;
  return 2;
}

function scoreHolderDist(coingecko: any): number {
  // Without direct holder data, estimate from circulating/total supply ratio
  if (!coingecko?.found) return 7;
  const ratio = coingecko.total_supply > 0
    ? coingecko.circulating_supply / coingecko.total_supply
    : 0;
  if (ratio >= 0.8) return 15;
  if (ratio >= 0.5) return 10;
  if (ratio >= 0.3) return 5;
  return 3;
}

function scoreTokenAge(createdAt: number | null): number {
  if (!createdAt) return 2;
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= 90) return 5;
  if (ageDays >= 30) return 4;
  if (ageDays >= 7) return 3;
  if (ageDays >= 1) return 2;
  return 1;
}

function isPumpFun(address: string): boolean {
  return address.endsWith("pump");
}

function classifyToken(score: number): string {
  if (score >= 85) return "hot";
  if (score >= 70) return "qualified";
  if (score >= 50) return "watch";
  return "skip";
}

function dualGateCheck(fundamentalsScore: number, marketScore: number) {
  const fMax = 70, mMax = 30;
  const fThreshold = Math.floor(fMax * 0.6); // 42
  const mThreshold = Math.floor(mMax * 0.6); // 18
  const fPass = fundamentalsScore >= fThreshold;
  const mPass = marketScore >= mThreshold;
  return {
    pass: fPass && mPass,
    fundamentals: { score: fundamentalsScore, max: fMax, threshold: fThreshold, pass: fPass },
    market: { score: marketScore, max: mMax, threshold: mThreshold, pass: mPass }
  };
}

// ═══════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════

async function doctor() {
  const checks: Record<string, string> = {};

  const dex = await fetchJSON(`${DEXSCREENER_API}/latest/dex/search?q=bitcoin`);
  checks.dexscreener = dex?.pairs ? "ok" : "error";

  const cg = await fetchJSON(`${COINGECKO_API}/ping`);
  checks.coingecko = cg?.gecko_says ? "ok" : "error";

  const rc = await fetchJSON(`${RUGCHECK_API}/tokens/So11111111111111111111111111111111111111112/report/summary`);
  checks.rugcheck = rc ? "ok" : "error";

  const hiro = await fetchJSON(`${HIRO_API}/v2/info`);
  checks.hiro_stacks = hiro?.stacks_tip_height ? "ok" : "error";

  const allOk = Object.values(checks).every(v => v === "ok");

  console.log(JSON.stringify({
    status: allOk ? "success" : "degraded",
    action: allOk ? "all data sources reachable — ready to score" : "some sources degraded — scoring will use available data",
    data: { sources: checks, ready: allOk },
    error: null
  }));
}

async function run(address?: string, chain?: string) {
  // If no address, get top trending
  if (!address) {
    const trending = await fetchJSON(`${DEXSCREENER_API}/token-boosts/top/v1`);
    if (Array.isArray(trending) && trending.length > 0) {
      const first = trending.find((t: any) => ["solana", "base", "bsc", "stacks"].includes(t.chainId));
      if (first) {
        address = first.tokenAddress;
        chain = first.chainId;
      }
    }
    if (!address) {
      console.log(JSON.stringify({
        status: "error",
        action: "provide a token address with --address flag",
        data: null,
        error: "No address provided and no trending tokens found"
      }));
      return;
    }
  }

  chain = chain || "solana";
  const flags: string[] = [];

  // Stacks SIP-010 enrichment
  let stacksData: any = null;
  if (chain === "stacks" && address.includes(".")) {
    stacksData = await fetchStacksToken(address);
    if (stacksData?.found) {
      flags.push("stacks_sip010");
    }
  }

  // Fetch data from all sources
  const [dexData, cgData, rugData] = await Promise.all([
    fetchDexScreener(address),
    fetchCoinGecko(address, chain),
    fetchRugCheck(address)
  ]);

  if (!dexData?.found) {
    console.log(JSON.stringify({
      status: "error",
      action: "token not found on DexScreener — cannot score",
      data: { address, chain },
      error: "Token not found on primary data source"
    }));
    return;
  }

  // Detect pump.fun
  if (isPumpFun(address)) {
    flags.push("pump_fun_detected");
  }

  // Score all components
  const mcapScore = scoreMarketCap(dexData.market_cap);
  const liqScore = scoreLiquidity(dexData.liquidity_usd, dexData.market_cap);
  const volScore = scoreVolume(dexData.volume_24h, dexData.market_cap);
  const safetyScore = scoreSafety(rugData);
  const holderScore = scoreHolderDist(cgData);
  const ageScore = scoreTokenAge(dexData.pair_created_at);
  // deployer_history: pump.fun detection + pair age as proxy for deployer quality
  let deployerScore = 3;
  if (isPumpFun(address)) deployerScore = 1; // pump.fun deployers are anonymous
  else if (ageScore >= 4) deployerScore = 4; // long-lived pairs suggest committed deployer

  // web_footprint: CoinGecko listing = project has website, docs, team page
  const webScore = cgData?.found ? 4 : 2;

  // momentum: 24h price change magnitude (not just direction)
  let momentumScore = 2;
  const priceChange = Math.abs(dexData.price_change_24h || 0);
  if (dexData.price_change_24h > 5) momentumScore = 5;      // strong positive
  else if (dexData.price_change_24h > 0) momentumScore = 4;  // mild positive
  else if (dexData.price_change_24h > -10) momentumScore = 3; // mild negative
  else momentumScore = 1;                                      // heavy dump

  // team_identity: CoinGecko listing as proxy (listed projects have verified team info)
  const teamScore = cgData?.found ? 6 : 3;

  // social_presence: CoinGecko listing as proxy (listed = community verified)
  const socialScore = cgData?.found ? 6 : 3;

  // Apply pump.fun penalty
  let pumpPenalty = 0;
  if (isPumpFun(address)) {
    pumpPenalty = 10;
    flags.push("pump_fun_penalty_applied");
  }

  // Low liquidity flag
  if (dexData.liquidity_usd < 50000) {
    flags.push("low_liquidity");
  }

  // Compute composite
  let composite = mcapScore + liqScore + volScore + safetyScore + holderScore +
    ageScore + deployerScore + webScore + momentumScore + teamScore + socialScore - pumpPenalty;
  composite = Math.max(0, Math.min(100, composite));

  // Dual-gate
  const fundamentals = safetyScore + holderScore + ageScore + deployerScore + webScore + momentumScore;
  const market = teamScore + socialScore + mcapScore + liqScore + volScore;
  const gate = dualGateCheck(fundamentals, market);

  // Classification
  const rawClass = classifyToken(composite);
  const effectiveClass = (rawClass === "hot" || rawClass === "qualified") && !gate.pass ? "watch" : rawClass;

  // Verdict
  let verdict = "REJECT";
  if (effectiveClass === "hot" && gate.pass) verdict = "PROCEED";
  else if (effectiveClass === "qualified") verdict = "MONITOR";
  else if (effectiveClass === "watch") verdict = "MONITOR";

  console.log(JSON.stringify({
    status: "success",
    action: `Token scored ${composite}/100 — ${verdict}. Classification: ${effectiveClass}.`,
    data: {
      address,
      chain,
      token_name: dexData.token_name,
      token_symbol: dexData.token_symbol,
      composite_score: composite,
      classification: effectiveClass,
      dual_gate: gate,
      components: {
        safety: { score: safetyScore, max: 15 },
        holder_dist: { score: holderScore, max: 15 },
        market_cap: { score: mcapScore, max: 10 },
        liquidity: { score: liqScore, max: 10 },
        volume: { score: volScore, max: 10 },
        team_identity: { score: teamScore, max: 10 },
        social_presence: { score: socialScore, max: 10 },
        token_age: { score: ageScore, max: 5 },
        deployer_history: { score: deployerScore, max: 5 },
        web_footprint: { score: webScore, max: 5 },
        momentum: { score: momentumScore, max: 5 }
      },
      market_data: {
        price_usd: dexData.price_usd,
        market_cap: dexData.market_cap,
        liquidity_usd: dexData.liquidity_usd,
        volume_24h: dexData.volume_24h,
        price_change_24h: dexData.price_change_24h
      },
      flags,
      verdict
    },
    error: null
  }));
}

// ═══════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════

const args = process.argv.slice(2);
const command = args[0];

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

if (command === "doctor") {
  doctor();
} else if (command === "run") {
  run(getArg("address"), getArg("chain"));
} else {
  console.log(JSON.stringify({
    status: "error",
    action: "use 'doctor' or 'run' command",
    data: { commands: ["doctor", "run --address <contract> --chain <chain>"] },
    error: `Unknown command: ${command || "(none)"}`
  }));
}
